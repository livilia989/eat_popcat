/**
 * 정적 에셋 참조를 한 곳에 모은다.
 *
 * ⚠️ Metro 번들러는 `require()` 대상 파일을 **번들 시점**에 해석하므로,
 *    파일을 "삭제"하면 try/catch 와 무관하게 번들 자체가 실패한다.
 *    따라서 저장소에는 모든 에셋이 항상 포함되어 있고,
 *    사용자는 파일을 지우는 대신 **같은 이름으로 덮어쓰기(교체)** 하면 된다.
 *
 *    그럼에도 파일이 비어있거나 손상된 경우(재생/디코딩 실패)에도
 *    앱이 죽지 않도록 아래 헬퍼와 각 컴포넌트의 onError fallback 을 둔다.
 */
import type { SoundKey } from '../types/game';

/**
 * require() 의 반환 형태는 플랫폼마다 다르다.
 *  - 네이티브: 숫자 (에셋 레지스트리 id)
 *  - 웹:      문자열 URL / data URI, 또는 { uri } 객체
 *
 * 예전에는 숫자와 객체만 통과시켜서 **웹에서 사운드가 전부 null 이 되어
 * 소리가 하나도 나지 않았다.** 문자열도 정상적인 소스다.
 */
export type ImageAsset = number | { uri: string } | null;
export type SoundAsset = number | string | { uri: string } | null;

export function resolveAssetSource(loader: () => unknown): number | string | { uri: string } | null {
  try {
    const mod = loader();
    if (typeof mod === 'number') return mod;
    if (typeof mod === 'string') return mod.length > 0 ? mod : null;
    if (mod && typeof mod === 'object') return mod as { uri: string };
    return null;
  } catch {
    return null;
  }
}

const optionalImage = (loader: () => unknown): ImageAsset => {
  const mod = resolveAssetSource(loader);
  // RN 의 Image source 는 문자열을 직접 받지 못하므로 { uri } 로 감싼다
  return typeof mod === 'string' ? { uri: mod } : (mod as ImageAsset);
};

const optionalSound = (loader: () => unknown): SoundAsset => resolveAssetSource(loader);

/* --------------------------------------------------------------- 이미지 */
export const IMAGES = {
  popcatClosed: optionalImage(() => require('../assets/images/popcat_closed.png')),
  popcatOpen: optionalImage(() => require('../assets/images/popcat_open.png')),
  backgroundBase: optionalImage(() => require('../assets/images/background_base.png')),
  backgroundCozy: optionalImage(() => require('../assets/images/background_cozy.png')),
  backgroundHappy: optionalImage(() => require('../assets/images/background_happy.png')),
  backgroundParty: optionalImage(() => require('../assets/images/background_party.png')),
  /** MAX 이벤트에서 메인 팝캣 주위를 함께 도는 OIIA 고양이 */
  oiiaCat: optionalImage(() => require('../assets/images/oiia_cat.png')),
};

/** 팝캣 원본 프레임 비율 (416 x 443) — 레이아웃 계산에 사용 */
export const POPCAT_ASPECT = 416 / 443;

/**
 * 벌린 입의 중심 위치 (프레임 크기 대비 비율).
 * popcat_open.png 의 입 안쪽 픽셀 무게중심에서 구했다.
 * 간식이 정확히 입으로 날아가도록 하는 목표 좌표.
 */
export const POPCAT_MOUTH = { x: 0.584, y: 0.476 };

/* --------------------------------------------------------------- 사운드 */
export const SOUNDS: Record<SoundKey, SoundAsset> = {
  popcat_pop: optionalSound(() => require('../assets/sounds/popcat_pop.mp3')),
  snack_throw: optionalSound(() => require('../assets/sounds/snack_throw.mp3')),
  snack_eat: optionalSound(() => require('../assets/sounds/snack_eat.mp3')),
  mood_up: optionalSound(() => require('../assets/sounds/mood_up.mp3')),
  mood_max: optionalSound(() => require('../assets/sounds/mood_max.mp3')),
  button_click: optionalSound(() => require('../assets/sounds/button_click.mp3')),
  oiia_loop: optionalSound(() => require('../assets/sounds/oiia_loop.mp3')),
};

/**
 * 간식 이미지는 선택 사항이다.
 * assets/snacks/*.png 를 넣고 싶다면 아래 주석을 해제하고 `null` 을 교체하면 된다.
 * 넣지 않으면 이모지로 자동 fallback 된다.
 */
export const SNACK_IMAGES: Record<string, ImageAsset> = {
  // cookie: optionalImage(() => require('../assets/snacks/cookie.png')),
  // chicken: optionalImage(() => require('../assets/snacks/chicken.png')),
  // donut: optionalImage(() => require('../assets/snacks/donut.png')),
  cookie: null,
  chicken: null,
  donut: null,
};
