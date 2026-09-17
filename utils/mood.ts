import { MOOD_DECAY, MOOD_MAX, MOOD_MIN, MOOD_STAGES, type MoodStageInfo } from '../constants/gameConfig';

export function clampMood(value: number): number {
  // NaN / 숫자가 아닌 값은 최소값으로 안전하게 떨어뜨리고,
  // ±Infinity 는 범위 끝으로 클램프된다.
  if (typeof value !== 'number' || Number.isNaN(value)) return MOOD_MIN;
  return Math.min(MOOD_MAX, Math.max(MOOD_MIN, Math.round(value)));
}

/**
 * 앵커(= lastInteractionAt 시점의 기분)와 경과 시간으로 현재 기분을 계산한다.
 *
 * 항상 "앵커 + 타임스탬프"에서 다시 계산하기 때문에
 *  - 앱을 껐다 켜도 경과 시간이 반영되고
 *  - 백그라운드 ↔ 포그라운드를 오가도 감소량이 중복 계산되지 않는다.
 */
export function computeCurrentMood(anchorMood: number, lastInteractionAt: number, now: number = Date.now()): number {
  const elapsed = now - lastInteractionAt;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return clampMood(anchorMood);
  const steps = Math.floor(elapsed / MOOD_DECAY.intervalMs);
  return clampMood(anchorMood - steps * MOOD_DECAY.amount);
}

export function getMoodStage(mood: number): MoodStageInfo {
  const m = clampMood(mood);
  for (const stage of MOOD_STAGES) {
    if (m >= stage.min && m <= stage.max) return stage;
  }
  return MOOD_STAGES[0];
}

export function getMoodLabel(mood: number): string {
  return getMoodStage(mood).label;
}

/** 0~1 로 정규화한 기분 (게이지/배경 보간용) */
export function moodRatio(mood: number): number {
  return clampMood(mood) / MOOD_MAX;
}

/**
 * 구간 선형 보간. mood 가 [from, to] 사이에서 0 → 1 로 올라간다.
 * 배경 레이어 opacity 계산에 사용.
 */
export function ramp(mood: number, from: number, to: number): number {
  if (to === from) return mood >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (mood - from) / (to - from)));
}
