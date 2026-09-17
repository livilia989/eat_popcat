/**
 * 게임 밸런스 / 연출 설정값 모음.
 * 재미를 조절하고 싶으면 여기 값만 바꾸면 된다.
 */
import type { MoodStage } from '../types/game';

export const APP_VERSION = 1;

/* ------------------------------------------------------------------ 기분 */
export const MOOD_MIN = 0;
export const MOOD_MAX = 100;
export const INITIAL_MOOD = 30;

export const MOOD_DECAY = {
  /** 이 시간마다 */
  intervalMs: 30_000,
  /** 이만큼 감소 */
  amount: 1,
  /** 화면 기분 수치를 다시 계산하는 주기 */
  tickMs: 1_000,
};

/* ------------------------------------------------ 먹기 애니메이션 타이밍 */
export const EAT_CONFIG = {
  /** 간식이 팝캣 입까지 날아가는 시간 */
  flightDuration: 520,
  /**
   * 뻐끔 프레임 시퀀스(ms). true = 입 벌림(open), false = 입 다묾(closed).
   * 한 번의 간식 섭취에 2회 뻐끔한다.
   */
  popFrames: [
    { open: false, duration: 100 },
    { open: true, duration: 120 },
    { open: false, duration: 100 },
    { open: true, duration: 120 },
    { open: false, duration: 150 },
  ],
  /** 연타 방지용 최소 입력 간격 (터치가 답답하지 않을 정도로 짧게) */
  inputCooldownMs: 260,
  /** 반응 문구가 떠 있는 시간 */
  reactionMs: 1200,
};

/* ------------------------------------------------------- OIIA MAX 이벤트 */
export const DJ_CONFIG = {
  /** 이벤트 전체 길이 */
  eventDuration: 8000,
  /** 1회전에 걸리는 시간 */
  rotationDuration: 2000,
  /** 이벤트 종료 후 되돌아갈 기분 값 */
  resetMood: 35,
  /** 등장 연출 시간 */
  introDuration: 450,
  /** 퇴장(페이드아웃) 시간 */
  outroDuration: 500,
};

/* ------------------------------------------------------------- 사운드 */
export const SOUND_CONFIG = {
  sfxVolume: 0.85,
  bgmVolume: 0.7,
  /** OIIA BGM 페이드아웃 단계 수 / 간격 */
  fadeSteps: 10,
  fadeStepMs: 45,
};

/* ------------------------------------------------------------- 기분 단계 */
export type MoodStageInfo = {
  stage: MoodStage;
  min: number;
  max: number;
  label: string;
  /** 파티클 개수 */
  particles: number;
  /** 파티클에 사용할 이모지 */
  particleEmojis: string[];
  /** 게이지 색상 */
  gaugeColors: [string, string];
  /** UI 텍스트 색상 (밝은 배경/어두운 배경 대응) */
  textColor: string;
  panelColor: string;
};

export const MOOD_STAGES: MoodStageInfo[] = [
  {
    stage: 0,
    min: 0,
    max: 19,
    label: '배고파요 😿',
    particles: 0,
    particleEmojis: ['💤'],
    gaugeColors: ['#9E8C7D', '#C4B09C'],
    textColor: '#FFF3E4',
    panelColor: 'rgba(40,32,28,0.45)',
  },
  {
    stage: 1,
    min: 20,
    max: 39,
    label: '조금 괜찮아요 😐',
    particles: 3,
    particleEmojis: ['✨', '🍃'],
    gaugeColors: ['#F3B7A0', '#FFD8A8'],
    textColor: '#6B4A3A',
    panelColor: 'rgba(255,248,240,0.62)',
  },
  {
    stage: 2,
    min: 40,
    max: 59,
    label: '기분 좋아요 🙂',
    particles: 6,
    particleEmojis: ['💗', '⭐', '🌸'],
    gaugeColors: ['#FF9EC4', '#FFD36E'],
    textColor: '#7A3B58',
    panelColor: 'rgba(255,250,246,0.66)',
  },
  {
    stage: 3,
    min: 60,
    max: 79,
    label: '신나요 😸',
    particles: 10,
    particleEmojis: ['💖', '🌟', '🎈', '✨'],
    gaugeColors: ['#FF7BAC', '#7FD8FF'],
    textColor: '#FFF1F7',
    panelColor: 'rgba(72,36,92,0.42)',
  },
  {
    stage: 4,
    min: 80,
    max: 99,
    label: '최고로 신나요 🤩',
    particles: 16,
    particleEmojis: ['💜', '⭐', '🎵', '💎', '✨'],
    gaugeColors: ['#FF5FD1', '#5BE7FF'],
    textColor: '#FFFFFF',
    panelColor: 'rgba(38,14,66,0.55)',
  },
  {
    stage: 5,
    min: 100,
    max: 100,
    label: '파티 타임! 🪩',
    particles: 20,
    particleEmojis: ['🪩', '🎶', '💫', '🌈', '⚡'],
    gaugeColors: ['#FFE15F', '#FF4FD8'],
    textColor: '#FFFFFF',
    panelColor: 'rgba(28,8,56,0.6)',
  },
];

/* ------------------------------------------------------------ 반응 문구 */
export const REACTIONS_COMMON = [
  '뻐끔!',
  '냠!',
  '더 줘!',
  '맛있다냥!',
  '한 입만 더!',
  '뻐끔뻐끔!!',
];

export const REACTIONS_BY_SNACK: Record<string, string[]> = {
  cookie: ['바삭바삭!', '쿠키 좋아!', '부스러기까지 냠'],
  chicken: ['치킨 최고!', '이건 못 참지!', '치느님...🙏'],
  donut: ['달콤해!', '도넛 구멍까지 냠', '한 바퀴 더!'],
};

export const REACTIONS_HIGH_MOOD = [
  '우이이이아!!',
  '몸이 근질근질!',
  '곧 돌 것 같아!!',
];
