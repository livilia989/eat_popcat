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
import { createDefaultState, loadState, saveState } from '../services/storage';
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
  reaction: string | null;
  /** 기분이 오를 때마다 증가 — 파티클 버스트 트리거용 */
  burstId: number;
  feed: (snackId: SnackType, from: Point, to: Point) => void;
  selectSnack: (snackId: SnackType) => void;
  toggleSound: () => void;
  endParty: () => void;
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
  const [reaction, setReaction] = useState<string | null>(null);
  const [burstId, setBurstId] = useState(0);

  const mountedRef = useRef(true);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const popTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastFeedAtRef = useRef(0);
  const flyingKeyRef = useRef(0);
  const partyActiveRef = useRef(false);
  const persistedRef = useRef(persisted);
  persistedRef.current = persisted;
  partyActiveRef.current = isDjPartyActive;

  /** 파티 중에는 기분 감소를 멈춘다 (종료 시 어차피 resetMood 로 설정) */
  const mood = useMoodDecay(persisted.mood, persisted.lastInteractionAt, !ready || isDjPartyActive);
  const moodRef = useRef(mood);
  moodRef.current = mood;

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
    setPersisted((prev) => {
      const next = { ...prev, ...patch };
      persistedRef.current = next;
      saveState(next);
      return next;
    });
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
    setIsDjPartyActive(true);
  }, []);

  const endParty = useCallback(() => {
    if (!partyActiveRef.current) return;
    partyActiveRef.current = false;
    setIsDjPartyActive(false);
    setFlying([]);
    setChewCount(0);
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
    EAT_CONFIG.popFrames.forEach((frame, index) => {
      const id = setTimeout(() => {
        if (!mountedRef.current) return;
        setMouthOpen(frame.open);
        // 입을 처음 벌리는 순간 뻐끔 사운드
        if (frame.open && index === 1) sound.play('popcat_pop');
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
      if (now - lastFeedAtRef.current < EAT_CONFIG.inputCooldownMs) return; // 연타 제한
      lastFeedAtRef.current = now;

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
      reaction,
      burstId,
      feed,
      selectSnack,
      toggleSound,
      endParty,
      flying,
    }),
    [
      burstId,
      chewCount,
      endParty,
      feed,
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
      selectSnack,
      toggleSound,
    ],
  );
}
