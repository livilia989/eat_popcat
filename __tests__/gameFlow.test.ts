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

/** 간식 1개를 끝까지 먹인다 */
async function feedOnce(
  hook: Awaited<ReturnType<typeof setup>>['hook'],
  snack: 'cookie' | 'chicken' | 'donut',
) {
  act(() => {
    hook.result.current.feed(snack, FROM, TO);
  });
  await act(async () => {
    jest.advanceTimersByTime(FEED_TOTAL + 20);
  });
}

/** MOOD 0 에서 100 까지 필요한 치킨 개수 */
const CHICKEN_TO_MAX = Math.ceil(100 / 3);

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
    expect(hook.result.current.mood).toBe(0);

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

    expect(hook.result.current.mood).toBe(1);
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

    // 입을 벌리는 프레임 수만큼 "뻐끔뻐끔" 두 번 난다
    const opens = EAT_CONFIG.popFrames.filter((f) => f.open).length;
    expect(opens).toBe(2);
    expect(sound.calls.filter((c) => c === 'play:popcat_pop')).toHaveLength(opens);
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

  it('한 번 먹을 때 반 바퀴(=1단계)만 돌고, 먹을 때마다 좌우가 번갈아 바뀐다', async () => {
    const { hook } = await setup();
    expect(hook.result.current.flipStep).toBe(0);

    // 한 번의 간식 섭취 = 반 바퀴 = flipStep +1
    await feedOnce(hook, 'cookie');
    expect(hook.result.current.flipStep).toBe(1);

    await feedOnce(hook, 'chicken');
    expect(hook.result.current.flipStep).toBe(2);

    await feedOnce(hook, 'donut');
    expect(hook.result.current.flipStep).toBe(3);
  });

  it('뻐끔 시퀀스 안에서는 딱 한 번만 뒤집는다', async () => {
    const { hook } = await setup();
    const flips = EAT_CONFIG.popFrames.filter((f) => f.flip).length;
    expect(flips).toBe(1);

    act(() => {
      hook.result.current.feed('cookie', FROM, TO);
    });
    // 뻐끔 프레임을 하나씩 지나는 동안 flipStep 이 2 이상 오르지 않는다
    let elapsed = 0;
    for (const frame of EAT_CONFIG.popFrames) {
      await act(async () => {
        jest.advanceTimersByTime(frame.duration);
      });
      elapsed += frame.duration;
      expect(hook.result.current.flipStep).toBeLessThanOrEqual(1);
    }
    await act(async () => {
      jest.advanceTimersByTime(FEED_TOTAL - elapsed + 20);
    });
    expect(hook.result.current.flipStep).toBe(1);
  });

  it('연타하면 누르는 대로 전부 먹는다 (쿨다운 없음)', async () => {
    const { hook } = await setup();
    act(() => {
      for (let i = 0; i < 5; i += 1) hook.result.current.feed('cookie', FROM, TO);
    });
    // 5개가 동시에 날아간다
    expect(hook.result.current.flying).toHaveLength(5);

    await act(async () => {
      jest.advanceTimersByTime(FEED_TOTAL + 20);
    });
    expect(hook.result.current.totalSnacks).toBe(5);
    expect(hook.result.current.mood).toBe(5 * 1);
  });

  it('동시 간식 수는 maxConcurrentSnacks 를 넘지 않는다', async () => {
    const { hook } = await setup();
    act(() => {
      for (let i = 0; i < EAT_CONFIG.maxConcurrentSnacks + 15; i += 1) {
        hook.result.current.feed('cookie', FROM, TO);
      }
    });
    expect(hook.result.current.flying).toHaveLength(EAT_CONFIG.maxConcurrentSnacks);

    // 상한을 넘어 누른 만큼은 버려지고, 받아들인 개수만 정산된다
    await act(async () => {
      jest.advanceTimersByTime(FEED_TOTAL + 20);
    });
    expect(hook.result.current.totalSnacks).toBe(EAT_CONFIG.maxConcurrentSnacks);
    expect(hook.result.current.mood).toBe(EAT_CONFIG.maxConcurrentSnacks * 1);

    // 다 먹고 나면 in-flight 카운터가 풀려 다시 받아들인다
    act(() => {
      hook.result.current.feed('cookie', FROM, TO);
    });
    expect(hook.result.current.flying).toHaveLength(1);
  });
});

describe('테스트 B — 간식 종류별 상승량', () => {
  it('쿠키 +1, 치킨 +3, 도넛 +2 가 누적된다', async () => {
    const { hook } = await setup();
    await feedOnce(hook, 'cookie');
    expect(hook.result.current.mood).toBe(1);
    await feedOnce(hook, 'chicken');
    expect(hook.result.current.mood).toBe(4);
    await feedOnce(hook, 'donut');
    expect(hook.result.current.mood).toBe(6);
    expect(hook.result.current.totalSnacks).toBe(3);
  });

  it('0 에서 시작하고 게이지는 음수가 되지 않는다', async () => {
    const { hook } = await setup();
    expect(hook.result.current.mood).toBe(0);

    // 아무것도 먹이지 않고 하루가 지나도 0 이다
    await act(async () => {
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(hook.result.current.mood).toBe(0);
  });
});

describe('테스트 E — OIIA MAX 이벤트', () => {
  it('mood 100 에서 파티가 시작되고, 종료하면 35 로 리셋된다', async () => {
    const { sound, hook } = await setup();

    for (let i = 0; i < CHICKEN_TO_MAX; i += 1) {
      await feedOnce(hook, 'chicken');
    }

    expect(hook.result.current.mood).toBe(100);
    expect(hook.result.current.isDjPartyActive).toBe(true);
    expect(sound.calls).toContain('play:mood_max');
    // MAX 때는 mood_up 대신 mood_max 가 난다
    expect(sound.calls.filter((c) => c === 'play:mood_up')).toHaveLength(CHICKEN_TO_MAX - 1);

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
    for (let i = 0; i < CHICKEN_TO_MAX; i += 1) await feedOnce(hook, 'chicken');
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
    for (let i = 0; i < CHICKEN_TO_MAX - 1; i += 1) await feedOnce(hook, 'chicken');
    expect(hook.result.current.mood).toBe((CHICKEN_TO_MAX - 1) * 3);
    await feedOnce(hook, 'chicken');
    expect(hook.result.current.mood).toBe(100);
  });

  it('파티가 시작되면 날아가던 간식이 정리된다', async () => {
    const { hook } = await setup();
    for (let i = 0; i < CHICKEN_TO_MAX - 1; i += 1) await feedOnce(hook, 'chicken');

    // MAX 를 만드는 간식과 함께 여러 개를 연타
    act(() => {
      for (let i = 0; i < 4; i += 1) hook.result.current.feed('chicken', FROM, TO);
    });
    await act(async () => {
      jest.advanceTimersByTime(FEED_TOTAL + 20);
    });

    expect(hook.result.current.isDjPartyActive).toBe(true);
    expect(hook.result.current.flying).toHaveLength(0);
    expect(hook.result.current.isEating).toBe(false);
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
    expect(saved.mood).toBe(2);
    expect(saved.totalSnacks).toBe(1);
    expect(saved.selectedSnack).toBe('donut');
  });
});
