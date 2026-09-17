/** 팝캣 OIIA 파티 - 전역 타입 정의 */

export type SnackType = 'cookie' | 'chicken' | 'donut';

export type Snack = {
  id: SnackType;
  label: string;
  emoji: string;
  moodGain: number;
  /** assets/snacks/*.png 가 있으면 사용, 없으면 emoji 로 fallback */
  image: number | null;
  color: string;
};

/** 팝캣이 취할 수 있는 자세 */
export type PopcatPose = 'idle' | 'eating' | 'excited';

/** 기분 단계 (배경/파티클 강도의 기준) */
export type MoodStage = 0 | 1 | 2 | 3 | 4 | 5;

/** 화면에서 사용하는 런타임 게임 상태 */
export type GameState = {
  /**
   * `lastInteractionAt` 시점의 기분 값(앵커).
   * 실제로 화면에 보여지는 기분은 여기서 경과 시간만큼 감소시킨 값이다.
   * 이렇게 앵커 + 타임스탬프로 관리하면 포그라운드/백그라운드 전환 시
   * 감소량이 중복 계산되지 않는다.
   */
  mood: number;
  lastInteractionAt: number;
  totalSnacks: number;
  totalParties: number;
  isEating: boolean;
  isDjPartyActive: boolean;
  selectedSnack: SnackType;
  soundEnabled: boolean;
};

/** AsyncStorage 에 실제로 저장되는 부분 */
export type PersistedState = {
  appVersion: number;
  mood: number;
  lastInteractionAt: number;
  totalSnacks: number;
  totalParties: number;
  selectedSnack: SnackType;
  soundEnabled: boolean;
  firstLaunch: boolean;
};

export type SoundKey =
  | 'popcat_pop'
  | 'snack_throw'
  | 'snack_eat'
  | 'mood_up'
  | 'mood_max'
  | 'button_click'
  | 'oiia_loop';

export type Point = { x: number; y: number };
