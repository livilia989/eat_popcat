/**
 * expo-audio 기반 사운드 매니저.
 *
 * - 플레이어 객체는 key 당 하나만 만들어 재사용한다 (중복 생성 방지)
 * - 파일이 없거나 재생에 실패해도 게임은 그대로 동작한다 (전부 no-op)
 * - 앱 최초 진입 시 자동으로 소리를 내지 않는다. 첫 터치 이후에만 재생된다.
 * - 언마운트 시 모든 플레이어를 정리한다 (메모리 누수 방지)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { SOUNDS } from '../constants/assets';
import { SOUND_CONFIG } from '../constants/gameConfig';
import type { SoundKey } from '../types/game';

export type SoundApi = {
  play: (key: SoundKey) => void;
  startBgm: (key: SoundKey) => void;
  stopBgm: (fade?: boolean) => void;
  setEnabled: (value: boolean) => void;
  unlock: () => void;
};

export function useSound(initialEnabled = true): SoundApi {
  const [enabled, setEnabledState] = useState(initialEnabled);
  const playersRef = useRef<Partial<Record<SoundKey, AudioPlayer | null>>>({});
  const bgmKeyRef = useRef<SoundKey | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(enabled);
  /** 사용자의 첫 인터랙션 전에는 아무 소리도 내지 않는다 */
  const unlockedRef = useRef(false);
  const mountedRef = useRef(true);

  enabledRef.current = enabled;

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState((prev) => (prev === value ? prev : value));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // 무음 모드에서도 효과음이 들리도록 (실패해도 무시)
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => {
      mountedRef.current = false;
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
      Object.values(playersRef.current).forEach((player) => {
        try {
          player?.remove();
        } catch {
          /* 이미 해제된 경우 무시 */
        }
      });
      playersRef.current = {};
      bgmKeyRef.current = null;
    };
  }, []);

  const getPlayer = useCallback((key: SoundKey): AudioPlayer | null => {
    const cached = playersRef.current[key];
    if (cached !== undefined) return cached;

    const source = SOUNDS[key];
    if (source == null) {
      // 파일이 준비되지 않은 사운드 -> 영구적으로 무음 처리
      playersRef.current[key] = null;
      return null;
    }
    try {
      const player = createAudioPlayer(source);
      playersRef.current[key] = player;
      return player;
    } catch (error) {
      if (__DEV__) console.warn(`[sound] failed to create player: ${key}`, error);
      playersRef.current[key] = null;
      return null;
    }
  }, []);

  const clearFade = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const unlock = useCallback(() => {
    unlockedRef.current = true;
  }, []);

  const play = useCallback(
    (key: SoundKey) => {
      // 첫 사용자 터치 전에는 소리를 내지 않는다 (앱 진입 직후 자동 재생 방지)
      if (!unlockedRef.current || !enabledRef.current) return;
      const player = getPlayer(key);
      if (!player) return;
      try {
        player.volume = SOUND_CONFIG.sfxVolume;
        player.loop = false;
        // 연속 재생 시 항상 처음부터
        const seek = player.seekTo(0);
        if (seek && typeof seek.catch === 'function') seek.catch(() => {});
        player.play();
      } catch (error) {
        if (__DEV__) console.warn(`[sound] play failed: ${key}`, error);
      }
    },
    [getPlayer],
  );

  const stopBgm = useCallback(
    (fade = false) => {
      clearFade();
      const key = bgmKeyRef.current;
      bgmKeyRef.current = null;
      if (!key) return;
      const player = playersRef.current[key];
      if (!player) return;

      const hardStop = () => {
        try {
          player.pause();
          const seek = player.seekTo(0);
          if (seek && typeof seek.catch === 'function') seek.catch(() => {});
          player.loop = false;
          player.volume = SOUND_CONFIG.bgmVolume;
        } catch {
          /* 무시 */
        }
      };

      if (!fade) {
        hardStop();
        return;
      }

      let step = 0;
      fadeTimerRef.current = setInterval(() => {
        step += 1;
        const ratio = Math.max(0, 1 - step / SOUND_CONFIG.fadeSteps);
        try {
          player.volume = SOUND_CONFIG.bgmVolume * ratio;
        } catch {
          /* 무시 */
        }
        if (step >= SOUND_CONFIG.fadeSteps || !mountedRef.current) {
          clearFade();
          hardStop();
        }
      }, SOUND_CONFIG.fadeStepMs);
    },
    [clearFade],
  );

  const startBgm = useCallback(
    (key: SoundKey) => {
      clearFade();
      if (bgmKeyRef.current && bgmKeyRef.current !== key) stopBgm(false);
      if (!unlockedRef.current || !enabledRef.current) {
        // 소리는 끄되, 이벤트가 끝날 때 정리할 수 있도록 현재 BGM 키는 기억해 둔다
        bgmKeyRef.current = key;
        return;
      }
      const player = getPlayer(key);
      bgmKeyRef.current = key;
      if (!player) return;
      try {
        player.loop = true;
        player.volume = SOUND_CONFIG.bgmVolume;
        const seek = player.seekTo(0);
        if (seek && typeof seek.catch === 'function') seek.catch(() => {});
        player.play();
      } catch (error) {
        if (__DEV__) console.warn(`[sound] bgm failed: ${key}`, error);
      }
    },
    [clearFade, getPlayer, stopBgm],
  );

  /**
   * 사운드를 끄면 재생 중인 BGM 도 즉시 멈추고,
   * 이벤트 도중 다시 켜면 이어서 재생한다.
   */
  useEffect(() => {
    const key = bgmKeyRef.current;
    if (!key) return;
    const player = enabled && unlockedRef.current ? getPlayer(key) : playersRef.current[key];
    if (!player) return;
    try {
      if (enabled && unlockedRef.current) {
        player.loop = true;
        player.volume = SOUND_CONFIG.bgmVolume;
        player.play();
      } else {
        player.pause();
      }
    } catch {
      /* 무시 */
    }
  }, [enabled, getPlayer]);

  // 참조가 매 렌더마다 바뀌면 소비하는 쪽의 useEffect 가 계속 재실행되므로 고정한다
  return useMemo<SoundApi>(
    () => ({ play, startBgm, stopBgm, setEnabled, unlock }),
    [play, setEnabled, startBgm, stopBgm, unlock],
  );
}
