import { SNACK_IMAGES } from './assets';
import type { Snack, SnackType } from '../types/game';

/**
 * 간식별 기분 상승량.
 * 연타 제한이 없으므로 한 번의 터치당 상승폭은 작게 잡는다.
 * (쿠키 1 / 치킨 3 / 도넛 2 — 0에서 100까지 치킨 기준 34번)
 */
export const SNACKS: Snack[] = [
  {
    id: 'cookie',
    label: '쿠키',
    emoji: '🍪',
    moodGain: 1,
    image: SNACK_IMAGES.cookie,
    color: '#F6C177',
  },
  {
    id: 'chicken',
    label: '치킨',
    emoji: '🍗',
    moodGain: 3,
    image: SNACK_IMAGES.chicken,
    color: '#F49A6B',
  },
  {
    id: 'donut',
    label: '도넛',
    emoji: '🍩',
    moodGain: 2,
    image: SNACK_IMAGES.donut,
    color: '#F79AC0',
  },
];

export const SNACK_MAP: Record<SnackType, Snack> = SNACKS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<SnackType, Snack>,
);

export function getSnack(id: SnackType): Snack {
  return SNACK_MAP[id] ?? SNACKS[0];
}

export function isSnackType(value: unknown): value is SnackType {
  return value === 'cookie' || value === 'chicken' || value === 'donut';
}
