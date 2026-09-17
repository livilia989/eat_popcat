/**
 * 핵심 플레이 루프 검증 (테스트 A / B / E / F 의 로직 부분).
 * 실제 화면 없이 useGameState 훅만 돌려서 시퀀스와 상태 전이를 확인한다.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { DJ_CONFIG, EAT_CONFIG } from '../constants/gameConfig';
import { useGameState } from '../hooks/useGameState';
import type { SoundApi } from '../hooks/useSound';
import type { Point } from '../types/game';

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

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const FROM: Point = { x: 100, y: 700 };
const TO: Point = { x: 180, y: 300 };

/** 먹기 시퀀스 전체(비행 + 뻐끔 + 정산)에 걸리는 시간 */
const FEED_TOTAL =
  EAT_CONFIG.flightDuration + EAT_CONFIG.popFrames.reduce((s, f) => s + f.duration, 0);

function makeSound(): SoundApi & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    play: jest.fn((key: string) => calls.push(`play:${key}`)),
    startBgm: jest.fn((key: string) => calls.push(`bgm:${key}`)),
    stopBgm: jest.fn(() => calls.push('bgm:stop')),
    setEnabled: jest.fn(),
    unlock: jest.fn(),
  } as unknown as SoundApi & { calls: string[] };
}

async function setup() {
  const sound = makeSound();
  const hook = renderHook(() => useGameState(sound));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return { sound, hook };
}

/** 쿨다운을 넘기며 간식 1개를 끝까지 먹인다 */
async function feedOnce(
  hook: Awaited<ReturnType<typeof setup>>['hook'],
  snack: 'cookie' | 'chicken' | 'donut',
) {
  await act(async () => {
    jest.advanceTimersByTime(EAT_CONFIG.inputCooldownMs + 10);
  });
  act(() => {
    hook.result.current.feed(snack, FROM, TO);
  });
  await act(async () => {
    jest.advanceTimersByTime(FEED_TOTAL + 20);
  });
}

beforeEach(() => {
  AsyncStorage.__reset();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('테스트 A — 기본 먹이기', () => {
  it('쿠키를 먹이면 기분 +5, 총 간식 +1, 사운드 순서가 맞다', async () => {
    const { sound, hook } = await setup();
    expect(hook.result.current.mood).toBe(30);

    act(() => {
      hook.result.current.feed('cookie', FROM, TO);
    });

    // 던지는 순간: 간식이 날아가고 snack_throw 재생
    expect(hook.result.current.flying).toHaveLength(1);
    expect(sound.calls).toContain('play:snack_throw');

    // 입에 도착 -> 간식이 사라지고 뻐끔 시작
    await act(async () => {
      jest.advanceTimersByTime(EAT_CONFIG.flightDuration + 10);
    });
    expect(hook.result.current.flying).toHaveLength(0);

    // 뻐끔 -> 정산
    await act(async () => {
      jest.advanceTimersByTime(FEED_TOTAL);
    });

    expect(hook.result.current.mood).toBe(35);
    expect(hook.result.current.totalSnacks).toBe(1);
    expect(hook.result.current.reaction).toBeTruthy();
    expect(hook.result.current.burstId).toBe(1);
    expect(sound.calls).toEqual(
      expect.arrayContaining([
        'play:snack_throw',
        'play:popcat_pop',
        'play:snack_eat',
        'play:mood_up',
      ]),
    );
    // 명세 순서대로 재생되었는지
    expect(sound.calls.indexOf('play:snack_throw')).toBeLessThan(
      sound.calls.indexOf('play:popcat_pop'),
    );
    expect(sound.calls.indexOf('play:popcat_pop')).toBeLessThan(
      sound.calls.indexOf('play:snack_eat'),
    );
  });

  it('뻐끔 중 입이 실제로 벌어졌다 닫힌다', async () => {
    const { hook } = await setup();
    act(() => {
      hook.result.current.feed('cookie', FROM, TO);
    });
    await act(async () => {
      jest.advanceTimersByTime(EAT_CONFIG.flightDuration + EAT_CONFIG.popFrames[0].duration + 5);
    });
    expect(hook.result.current.mouthOpen).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(FEED_TOTAL);
    });
    expect(hook.result.current.mouthOpen).toBe(false);
  });

  it('연타해도 쿨다운 안에서는 한 번만 먹는다', async () => {
    const { hook } = await setup();
    act(() => {
      hook.result.current.feed('cookie', FROM, TO);
      hook.result.current.feed('cookie', FROM, TO);
      hook.result.current.feed('cookie', FROM, TO);
    });
    expect(hook.result.current.flying).toHaveLength(1);
    await act(async () => {
      jest.advanceTimersByTime(FEED_TOTAL + 20);
    });
    expect(hook.result.current.totalSnacks).toBe(1);
  });
});

describe('테스트 B — 간식 종류별 상승량', () => {
  it('쿠키 +5, 치킨 +10, 도넛 +7 이 누적된다', async () => {
    const { hook } = await setup();
    await feedOnce(hook, 'cookie');
    expect(hook.result.current.mood).toBe(35);
    await feedOnce(hook, 'chicken');
    expect(hook.result.current.mood).toBe(45);
    await feedOnce(hook, 'donut');
    expect(hook.result.current.mood).toBe(52);
    expect(hook.result.current.totalSnacks).toBe(3);
  });
});

describe('테스트 E — OIIA MAX 이벤트', () => {
  it('mood 100 에서 파티가 시작되고, 종료하면 35 로 리셋된다', async () => {
    const { sound, hook } = await setup();

    // 30 -> 100 : 치킨 7번 (30 + 70)
    for (let i = 0; i < 7; i += 1) {
      await feedOnce(hook, 'chicken');
    }

    expect(hook.result.current.mood).toBe(100);
    expect(hook.result.current.isDjPartyActive).toBe(true);
    expect(sound.calls).toContain('play:mood_max');
    // MAX 때는 mood_up 대신 mood_max 가 난다
    expect(sound.calls.filter((c) => c === 'play:mood_up')).toHaveLength(6);

    // 이벤트 중에는 간식 입력이 막힌다
    const snacksBefore = hook.result.current.totalSnacks;
    act(() => {
      hook.result.current.feed('cookie', FROM, TO);
    });
    expect(hook.result.current.flying).toHaveLength(0);

    // 이벤트 종료
    act(() => {
      hook.result.current.endParty();
    });
    expect(hook.result.current.isDjPartyActive).toBe(false);
    expect(hook.result.current.mood).toBe(DJ_CONFIG.resetMood);
    expect(hook.result.current.mood).toBe(35);
    expect(hook.result.current.totalParties).toBe(1);
    expect(hook.result.current.totalSnacks).toBe(snacksBefore);
  });

  it('endParty 를 여러 번 불러도 totalParties 는 1 만 증가한다', async () => {
    const { hook } = await setup();
    for (let i = 0; i < 7; i += 1) await feedOnce(hook, 'chicken');
    expect(hook.result.current.isDjPartyActive).toBe(true);

    act(() => {
      hook.result.current.endParty();
      hook.result.current.endParty();
      hook.result.current.endParty();
    });
    expect(hook.result.current.totalParties).toBe(1);
  });

  it('기분은 100 을 넘지 않는다', async () => {
    const { hook } = await setup();
    for (let i = 0; i < 6; i += 1) await feedOnce(hook, 'chicken'); // 30 -> 90
    expect(hook.result.current.mood).toBe(90);
    await feedOnce(hook, 'chicken'); // 90 + 10 = 100 (초과 없음)
    expect(hook.result.current.mood).toBe(100);
  });
});

describe('테스트 F/G — 사운드 설정과 저장', () => {
  it('사운드 토글이 상태와 저장소에 반영된다', async () => {
    const { hook } = await setup();
    expect(hook.result.current.soundEnabled).toBe(true);
    act(() => {
      hook.result.current.toggleSound();
    });
    await waitFor(() => expect(hook.result.current.soundEnabled).toBe(false));

    const raw = await AsyncStorage.getItem('@popcat_oiia_party/state/v1');
    expect(JSON.parse(raw).soundEnabled).toBe(false);
  });

  it('먹인 뒤의 상태가 저장소에 남는다', async () => {
    const { hook } = await setup();
    await feedOnce(hook, 'donut');
    const raw = await AsyncStorage.getItem('@popcat_oiia_party/state/v1');
    const saved = JSON.parse(raw);
    expect(saved.mood).toBe(37);
    expect(saved.totalSnacks).toBe(1);
    expect(saved.selectedSnack).toBe('donut');
  });
});
