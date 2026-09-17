/** 로컬 저장 / 복원 (테스트 G) 및 손상 데이터 방어 테스트 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  STORAGE_KEY,
  createDefaultState,
  loadState,
  normalize,
  resetState,
  saveState,
} from '../services/storage';
import { INITIAL_MOOD } from '../constants/gameConfig';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
      __reset: () => {
        store = {};
      },
    },
  };
});

const mockStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  __reset: () => void;
};

beforeEach(() => {
  mockStorage.__reset();
  jest.clearAllMocks();
});

describe('기본값', () => {
  it('최초 시작 mood 는 0, 카운터는 0, 사운드는 ON', () => {
    const s = createDefaultState(1000);
    expect(s.mood).toBe(INITIAL_MOOD);
    expect(s.mood).toBe(0);
    expect(s.totalSnacks).toBe(0);
    expect(s.totalParties).toBe(0);
    expect(s.soundEnabled).toBe(true);
    expect(s.lastInteractionAt).toBe(1000);
  });
});

describe('normalize — 손상된 저장 데이터 방어', () => {
  const now = 2_000_000;

  it('null / 문자열 / 숫자 등 잘못된 입력은 기본값으로', () => {
    for (const bad of [null, undefined, 'oops', 42, []]) {
      const s = normalize(bad, now);
      expect(s.mood).toBe(0);
      expect(s.totalSnacks).toBe(0);
    }
  });

  it('범위를 벗어난 mood 는 0~100 으로 보정', () => {
    expect(normalize({ mood: 999 }, now).mood).toBe(100);
    expect(normalize({ mood: -50 }, now).mood).toBe(0);
    expect(normalize({ mood: -0.4 }, now).mood).toBe(0);
    expect(normalize({ mood: 'abc' }, now).mood).toBe(0);
    expect(normalize({ mood: 57 }, now).mood).toBe(57);
  });

  it('음수/NaN 카운터는 0 으로', () => {
    expect(normalize({ totalSnacks: -3, totalParties: NaN }, now).totalSnacks).toBe(0);
    expect(normalize({ totalSnacks: -3, totalParties: NaN }, now).totalParties).toBe(0);
  });

  it('알 수 없는 간식 id 는 쿠키로 대체', () => {
    expect(normalize({ selectedSnack: 'pizza' }, now).selectedSnack).toBe('cookie');
    expect(normalize({ selectedSnack: 'chicken' }, now).selectedSnack).toBe('chicken');
  });

  it('미래 시각(기기 시간 변경 등)은 현재 시각으로 대체', () => {
    expect(normalize({ lastInteractionAt: now + 10_000 }, now).lastInteractionAt).toBe(now);
    expect(normalize({ lastInteractionAt: now - 10_000 }, now).lastInteractionAt).toBe(now - 10_000);
  });
});

describe('저장 / 복원 왕복 (테스트 G)', () => {
  it('mood, totalSnacks, totalParties, soundEnabled 가 복원된다', async () => {
    const saved = {
      ...createDefaultState(1_000_000),
      mood: 77,
      totalSnacks: 42,
      totalParties: 3,
      soundEnabled: false,
      selectedSnack: 'donut' as const,
    };
    expect(await saveState(saved)).toBe(true);

    const loaded = await loadState(2_000_000);
    expect(loaded.mood).toBe(77);
    expect(loaded.totalSnacks).toBe(42);
    expect(loaded.totalParties).toBe(3);
    expect(loaded.soundEnabled).toBe(false);
    expect(loaded.selectedSnack).toBe('donut');
    expect(loaded.lastInteractionAt).toBe(1_000_000);
  });

  it('저장된 값이 없으면 기본값으로 시작한다', async () => {
    const loaded = await loadState(5_000);
    expect(loaded.mood).toBe(0);
    expect(loaded.lastInteractionAt).toBe(5_000);
  });

  it('깨진 JSON 이어도 크래시하지 않고 기본값으로 시작한다', async () => {
    mockStorage.getItem.mockResolvedValueOnce('{{{ not json');
    const loaded = await loadState(7_000);
    expect(loaded.mood).toBe(0);
  });

  it('저장소가 던져도 saveState 는 false 만 반환한다', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
    expect(await saveState(createDefaultState())).toBe(false);
  });

  it('getItem 이 던져도 loadState 는 기본값을 준다', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('boom'));
    const loaded = await loadState(9_000);
    expect(loaded.mood).toBe(0);
  });

  it('resetState 는 키를 지운다', async () => {
    await saveState(createDefaultState());
    await resetState();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});
