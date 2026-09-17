import {
  clampMood,
  computeCurrentMood,
  getMoodLabel,
  getMoodStage,
  ramp,
} from '../utils/mood';
import { MOOD_DECAY } from '../constants/gameConfig';
import { SNACKS, getSnack } from '../constants/snacks';

describe('clampMood', () => {
  it('0~100 범위로 보정한다', () => {
    expect(clampMood(-40)).toBe(0);
    expect(clampMood(0)).toBe(0);
    expect(clampMood(57)).toBe(57);
    expect(clampMood(100)).toBe(100);
    expect(clampMood(180)).toBe(100);
  });

  it('비정상 값도 안전하게 처리한다', () => {
    expect(clampMood(NaN)).toBe(0);
    expect(clampMood(Infinity)).toBe(100);
    expect(clampMood(-Infinity)).toBe(0);
  });
});

describe('간식별 기분 상승량 (테스트 B)', () => {
  it('쿠키 +5 / 치킨 +10 / 도넛 +7', () => {
    expect(getSnack('cookie').moodGain).toBe(5);
    expect(getSnack('chicken').moodGain).toBe(10);
    expect(getSnack('donut').moodGain).toBe(7);
    expect(SNACKS).toHaveLength(3);
  });

  it('100 을 초과하지 않는다', () => {
    expect(clampMood(96 + getSnack('chicken').moodGain)).toBe(100);
    expect(clampMood(98 + getSnack('donut').moodGain)).toBe(100);
  });
});

describe('computeCurrentMood — 시간 경과 감소 (테스트 C)', () => {
  const t0 = 1_700_000_000_000;

  it('30초마다 1씩 줄어든다', () => {
    expect(computeCurrentMood(50, t0, t0)).toBe(50);
    expect(computeCurrentMood(50, t0, t0 + 29_999)).toBe(50);
    expect(computeCurrentMood(50, t0, t0 + 30_000)).toBe(49);
    expect(computeCurrentMood(50, t0, t0 + 59_999)).toBe(49);
    expect(computeCurrentMood(50, t0, t0 + 60_000)).toBe(48);
  });

  it('앱을 끈 10분(600초)은 20 감소로 반영된다', () => {
    expect(computeCurrentMood(60, t0, t0 + 600_000)).toBe(40);
  });

  it('0 미만으로 내려가지 않는다', () => {
    expect(computeCurrentMood(10, t0, t0 + 999 * MOOD_DECAY.intervalMs)).toBe(0);
  });

  it('같은 앵커로 몇 번을 다시 계산해도 값이 같다 (중복 차감 없음)', () => {
    const now = t0 + 125_000;
    const a = computeCurrentMood(70, t0, now);
    const b = computeCurrentMood(70, t0, now);
    const c = computeCurrentMood(70, t0, now);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toBe(66);
  });

  it('미래 시각이나 음수 경과는 앵커 값을 유지한다', () => {
    expect(computeCurrentMood(42, t0, t0 - 100_000)).toBe(42);
  });
});

describe('기분 상태 문구 / 단계 (테스트 D)', () => {
  it('구간별 문구가 명세와 일치한다', () => {
    expect(getMoodLabel(0)).toBe('배고파요 😿');
    expect(getMoodLabel(19)).toBe('배고파요 😿');
    expect(getMoodLabel(20)).toBe('조금 괜찮아요 😐');
    expect(getMoodLabel(39)).toBe('조금 괜찮아요 😐');
    expect(getMoodLabel(40)).toBe('기분 좋아요 🙂');
    expect(getMoodLabel(59)).toBe('기분 좋아요 🙂');
    expect(getMoodLabel(60)).toBe('신나요 😸');
    expect(getMoodLabel(79)).toBe('신나요 😸');
    expect(getMoodLabel(80)).toBe('최고로 신나요 🤩');
    expect(getMoodLabel(99)).toBe('최고로 신나요 🤩');
    expect(getMoodLabel(100)).toBe('파티 타임! 🪩');
  });

  it('단계가 올라갈수록 파티클이 많아진다', () => {
    const counts = [0, 25, 45, 70, 90, 100].map((m) => getMoodStage(m).particles);
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    }
  });
});

describe('ramp — 배경 레이어 보간', () => {
  it('구간 밖은 0 또는 1 로 고정된다', () => {
    expect(ramp(0, 34, 58)).toBe(0);
    expect(ramp(34, 34, 58)).toBe(0);
    expect(ramp(46, 34, 58)).toBeCloseTo(0.5);
    expect(ramp(58, 34, 58)).toBe(1);
    expect(ramp(100, 34, 58)).toBe(1);
  });
});
