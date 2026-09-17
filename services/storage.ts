/**
 * 로컬 저장소 (AsyncStorage) 래퍼.
 * 서버/로그인 없이 기기 안에만 저장한다.
 * 저장 실패나 손상된 데이터가 있어도 절대 예외를 밖으로 던지지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_VERSION, INITIAL_MOOD } from '../constants/gameConfig';
import { isSnackType } from '../constants/snacks';
import { clampMood } from '../utils/mood';
import type { PersistedState } from '../types/game';

export const STORAGE_KEY = '@popcat_oiia_party/state/v1';

export function createDefaultState(now: number = Date.now()): PersistedState {
  return {
    appVersion: APP_VERSION,
    mood: INITIAL_MOOD,
    lastInteractionAt: now,
    totalSnacks: 0,
    totalParties: 0,
    selectedSnack: 'cookie',
    soundEnabled: true,
    firstLaunch: true,
  };
}

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** 어떤 값이 들어와도 안전한 PersistedState 로 정규화한다. */
export function normalize(raw: unknown, now: number = Date.now()): PersistedState {
  const fallback = createDefaultState(now);
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Partial<PersistedState>;

  const lastInteractionAt =
    typeof data.lastInteractionAt === 'number' &&
    Number.isFinite(data.lastInteractionAt) &&
    data.lastInteractionAt > 0 &&
    // 미래 시각(기기 시간 변경 등)은 신뢰하지 않는다
    data.lastInteractionAt <= now
      ? data.lastInteractionAt
      : now;

  return {
    appVersion: APP_VERSION,
    mood: typeof data.mood === 'number' ? clampMood(data.mood) : fallback.mood,
    lastInteractionAt,
    totalSnacks: toCount(data.totalSnacks),
    totalParties: toCount(data.totalParties),
    selectedSnack: isSnackType(data.selectedSnack) ? data.selectedSnack : fallback.selectedSnack,
    soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : fallback.soundEnabled,
    firstLaunch: data.firstLaunch === true,
  };
}

export async function loadState(now: number = Date.now()): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState(now);
    return normalize(JSON.parse(raw), now);
  } catch (error) {
    // 깨진 JSON / 저장소 접근 실패 -> 기본값으로 안전하게 시작
    if (__DEV__) console.warn('[storage] load failed, using defaults', error);
    return createDefaultState(now);
  }
}

export async function saveState(state: PersistedState): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    if (__DEV__) console.warn('[storage] save failed', error);
    return false;
  }
}

export async function resetState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (__DEV__) console.warn('[storage] reset failed', error);
  }
}
