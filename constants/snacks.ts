import { SNACK_IMAGES } from './assets';
import type { Snack, SnackType } from '../types/game';

export const SNACKS: Snack[] = [
  {
    id: 'cookie',
    label: '쿠키',
    emoji: '🍪',
    moodGain: 5,
    image: SNACK_IMAGES.cookie,
    color: '#F6C177',
  },
  {
    id: 'chicken',
    label: '치킨',
    emoji: '🍗',
    moodGain: 10,
    image: SNACK_IMAGES.chicken,
    color: '#F49A6B',
  },
  {
    id: 'donut',
    label: '도넛',
    emoji: '🍩',
    moodGain: 7,
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
