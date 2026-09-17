/**
 * 게임 전체 상태 + 저장/복원 + 먹이기 시퀀스 오케스트레이션.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  DJ_CONFIG,
  EAT_CONFIG,
  MOOD_MAX,
  REACTIONS_BY_SNACK,
  REACTIONS_COMMON,
  REACTIONS_HIGH_MOOD,
} from '../constants/gameConfig';
import { getSnack } from '../constants/snacks';
import { createDefaultState, loadState, resetState, saveState } from '../services/storage';
import { clampMood, computeCurrentMood } from '../utils/mood';
import type { PersistedState, Point, Snack, SnackType } from '../types/game';
import { useMoodDecay } from './useMoodDecay';
import type { SoundApi } from './useSound';

export type FlyingSnack = {
  key: number;
  snack: Snack;
  from: Point;
  to: Point;
};

export type GameApi = {
  ready: boolean;
  mood: number;
  totalSnacks: number;
  totalParties: number;
  selectedSnack: SnackType;
  soundEnabled: boolean;
  isEating: boolean;
  isDjPartyActive: boolean;
  mouthOpen: boolean;
  /** 먹을 때의 좌우반전 단계 (1 증가 = 반 바퀴) */
  flipStep: number;
  reaction: string | null;
  /** 기분이 오를 때마다 증가 — 파티클 버스트 트리거용 */
  burstId: number;
  feed: (snackId: SnackType, from: Point, to: Point) => void;
  selectSnack: (snackId: SnackType) => void;
  toggleSound: () => void;
  endParty: () => void;
  /** 기분과 기록을 전부 초기값으로 되돌린다 */
  resetGame: () => void;
  flying: FlyingSnack[];
};

function pickReaction(snack: Snack, mood: number): string {
  const pool = [
    ...REACTIONS_COMMON,
    ...(REACTIONS_BY_SNACK[snack.id] ?? []),
    ...(mood >= 80 ? REACTIONS_HIGH_MOOD : []),
  ];
  return pool[Math.floor(Math.random() * pool.length)] ?? '뻐끔!';
}

export function useGameState(sound: SoundApi): GameApi {
  const [ready, setReady] = useState(false);
  const [persisted, setPersisted] = useState<PersistedState>(() => createDefaultState());
  const [isDjPartyActive, setIsDjPartyActive] = useState(false);
  const [flying, setFlying] = useState<FlyingSnack[]>([]);
  const [chewCount, setChewCount] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [flipStep, setFlipStep] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [burstId, setBurstId] = useState(0);

  const mountedRef = useRef(true);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const popTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastFeedAtRef = useRef(0);
  const flyingKeyRef = useRef(0);
  /** 아직 정산되지 않은(날아가거나 씹는 중인) 간식 수 */
  const inFlightRef = useRef(0);
  /** 좌우반전 단계 — 되감기지 않도록 증가만 한다 */
  const flipStepRef = useRef(0);
  const partyActiveRef = useRef(false);
  /**
   * 저장 상태의 **동기** 진실원본.
   * React state 는 렌더를 위한 거울이고, 실제 계산은 항상 이 ref 를 읽는다.
   * 연타로 여러 간식이 같은 배치에서 정산될 때 setState 업데이터가
   * 나중에 실행되는 탓에 기분/카운트가 한 번분만 반영되던 문제를 막는다.
   */
  const persistedRef = useRef(persisted);

  /** 파티 중에는 기분 감소를 멈춘다 (종료 시 어차피 resetMood 로 설정) */
  const mood = useMoodDecay(persisted.mood, persisted.lastInteractionAt, !ready || isDjPartyActive);

  /* ---------------------------------------------------- 타이머 헬퍼 */
  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, delay);
    timersRef.current.add(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    popTimersRef.current.forEach(clearTimeout);
    popTimersRef.current = [];
  }, []);

  /* ------------------------------------------------------ 로드 / 저장 */
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      const loaded = await loadState();
      if (cancelled || !mountedRef.current) return;
      const next = { ...loaded, firstLaunch: false };
      persistedRef.current = next;
      setPersisted(next);
      setReady(true);
      // 복원 직후 정규화된 상태를 다시 저장해 둔다
      saveState(next);
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const commit = useCallback((patch: Partial<PersistedState>) => {
    // ref 를 먼저 갱신해야 같은 배치 안의 다음 정산이 최신 값을 읽는다
    const next = { ...persistedRef.current, ...patch };
    persistedRef.current = next;
    saveState(next);
    setPersisted(next);
  }, []);

  // 백그라운드로 갈 때 현재 상태를 한 번 더 저장 (빠른 종료 대비)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') saveState(persistedRef.current);
    });
    return () => sub.remove();
  }, []);

  /* -------------------------------------------------------- OIIA 파티 */
  const startParty = useCallback(() => {
    if (partyActiveRef.current) return; // 중복 실행 방지
    partyActiveRef.current = true;
    // 연타로 아직 날아가는 중인 간식이 있으면 정리한다.
    // (이벤트 중에 뒤늦게 정산 타이머가 터지면서 소리가 겹치는 것을 막는다)
    clearAllTimers();
    setFlying([]);
    setChewCount(0);
    inFlightRef.current = 0;
    setMouthOpen(false);
    setIsDjPartyActive(true);
  }, [clearAllTimers]);

  const endParty = useCallback(() => {
    if (!partyActiveRef.current) return;
    partyActiveRef.current = false;
    setIsDjPartyActive(false);
    setFlying([]);
    setChewCount(0);
    inFlightRef.current = 0;
    setMouthOpen(false);
    commit({
      mood: clampMood(DJ_CONFIG.resetMood),
      lastInteractionAt: Date.now(),
      totalParties: persistedRef.current.totalParties + 1,
    });
  }, [commit]);

  /* --------------------------------------------------------- 뻐끔 연출 */
  const runPopAnimation = useCallback(() => {
    popTimersRef.current.forEach(clearTimeout);
    popTimersRef.current = [];
    let elapsed = 0;
    EAT_CONFIG.popFrames.forEach((frame) => {
      const id = setTimeout(() => {
        if (!mountedRef.current) return;
        setMouthOpen(frame.open);
        if (frame.flip) {
          flipStepRef.current += 1;
          setFlipStep(flipStepRef.current);
        }
        // 입을 벌릴 때마다 뻐끔 사운드 — 한 입에 "뻐끔뻐끔" 두 번 난다
        if (frame.open) sound.play('popcat_pop');
      }, elapsed);
      popTimersRef.current.push(id);
      elapsed += frame.duration;
    });
    return elapsed;
  }, [sound]);

  /* ------------------------------------------------------------ 먹이기 */
  const feed = useCallback(
    (snackId: SnackType, from: Point, to: Point) => {
      if (!ready || partyActiveRef.current) return;
      const now = Date.now();
      // inputCooldownMs 가 0 이면 누르는 대로 전부 먹인다
      if (EAT_CONFIG.inputCooldownMs > 0 && now - lastFeedAtRef.current < EAT_CONFIG.inputCooldownMs) {
        return;
      }
      // 무한 누적으로 성능이 무너지는 것만 막는 안전장치
      if (inFlightRef.current >= EAT_CONFIG.maxConcurrentSnacks) return;
      lastFeedAtRef.current = now;
      inFlightRef.current += 1;

      const snack = getSnack(snackId);
      sound.play('snack_throw');

      const key = ++flyingKeyRef.current;
      setFlying((prev) => [...prev, { key, snack, from, to }]);
      setChewCount((c) => c + 1);

      // 1) 간식이 입에 도착
      schedule(() => {
        setFlying((prev) => prev.filter((f) => f.key !== key));
        // 2) 뻐끔 애니메이션
        const popDuration = runPopAnimation();

        // 3) 다 먹은 뒤 기분 상승 / 카운트 / 저장
        schedule(() => {
          sound.play('snack_eat');

          const current = computeCurrentMood(
            persistedRef.current.mood,
            persistedRef.current.lastInteractionAt,
          );
          const nextMood = clampMood(current + snack.moodGain);

          commit({
            mood: nextMood,
            lastInteractionAt: Date.now(),
            totalSnacks: persistedRef.current.totalSnacks + 1,
            selectedSnack: snack.id,
          });

          setReaction(pickReaction(snack, nextMood));
          setBurstId((b) => b + 1);
          setChewCount((c) => Math.max(0, c - 1));
          inFlightRef.current = Math.max(0, inFlightRef.current - 1);
          setMouthOpen(false);

          if (nextMood >= MOOD_MAX) {
            sound.play('mood_max');
            startParty();
          } else {
            sound.play('mood_up');
          }

          schedule(() => setReaction(null), EAT_CONFIG.reactionMs);
        }, popDuration);
      }, EAT_CONFIG.flightDuration);
    },
    [commit, ready, runPopAnimation, schedule, sound, startParty],
  );

  /* ------------------------------------------------------------ 초기화 */
  const resetGame = useCallback(() => {
    clearAllTimers();
    partyActiveRef.current = false;
    inFlightRef.current = 0;
    flipStepRef.current = 0;
    lastFeedAtRef.current = 0;

    setIsDjPartyActive(false);
    setFlying([]);
    setChewCount(0);
    setMouthOpen(false);
    setFlipStep(0);
    setReaction(null);
    setBurstId(0);

    // 사운드 설정은 진행도가 아니라 환경설정이므로 유지한다
    const fresh = {
      ...createDefaultState(Date.now()),
      firstLaunch: false,
      soundEnabled: persistedRef.current.soundEnabled,
    };
    persistedRef.current = fresh;
    setPersisted(fresh);
    // 저장 키를 비우고 기본값을 다시 써 둔다
    resetState().finally(() => saveState(fresh));
  }, [clearAllTimers]);

  /* -------------------------------------------------------- 기타 액션 */
  const selectSnack = useCallback(
    (snackId: SnackType) => {
      commit({ selectedSnack: snackId });
    },
    [commit],
  );

  const toggleSound = useCallback(() => {
    const next = !persistedRef.current.soundEnabled;
    commit({ soundEnabled: next });
  }, [commit]);

  return useMemo<GameApi>(
    () => ({
      ready,
      mood,
      totalSnacks: persisted.totalSnacks,
      totalParties: persisted.totalParties,
      selectedSnack: persisted.selectedSnack,
      soundEnabled: persisted.soundEnabled,
      isEating: chewCount > 0,
      isDjPartyActive,
      mouthOpen,
      flipStep,
      reaction,
      burstId,
      feed,
      selectSnack,
      toggleSound,
      endParty,
      resetGame,
      flying,
    }),
    [
      burstId,
      chewCount,
      endParty,
      feed,
      flipStep,
      flying,
      isDjPartyActive,
      mood,
      mouthOpen,
      persisted.selectedSnack,
      persisted.soundEnabled,
      persisted.totalParties,
      persisted.totalSnacks,
      reaction,
      ready,
      resetGame,
      selectSnack,
      toggleSound,
    ],
  );
}
