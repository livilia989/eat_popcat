import { SNACK_IMAGES } from './assets';
import type { Snack, SnackType } from '../types/game';

/**
 * 간식별 기분 상승량.
 * 연타 제한을 없앤 대신 상승량을 낮춰 게이지가 더 천천히 차도록 했다.
 * (쿠키 5 / 치킨 10 / 도넛 7 -> 2 / 4 / 3)
 */
export const SNACKS: Snack[] = [
  {
    id: 'cookie',
    label: '쿠키',
    emoji: '🍪',
    moodGain: 2,
    image: SNACK_IMAGES.cookie,
    color: '#F6C177',
  },
  {
    id: 'chicken',
    label: '치킨',
    emoji: '🍗',
    moodGain: 4,
    image: SNACK_IMAGES.chicken,
    color: '#F49A6B',
  },
  {
    id: 'donut',
    label: '도넛',
    emoji: '🍩',
    moodGain: 3,
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
