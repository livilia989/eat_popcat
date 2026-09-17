/**
 * 에셋 소스 해석 회귀 테스트.
 *
 * require() 의 반환 형태는 플랫폼마다 다르다.
 *  - 네이티브: 숫자
 *  - 웹:      문자열(data URI / URL) 또는 { uri } 객체
 *
 * 예전 구현은 숫자와 객체만 통과시켜서 **웹에서 SOUNDS 가 전부 null 이 되고
 * 소리가 하나도 나지 않았다.** 조용히 무음 처리되는 탓에 눈에 띄지도 않았다.
 */
import { SOUNDS, resolveAssetSource } from '../constants/assets';
import { SNACKS } from '../constants/snacks';

describe('resolveAssetSource', () => {
  it('네이티브의 숫자 에셋 id 를 통과시킨다', () => {
    expect(resolveAssetSource(() => 42)).toBe(42);
    expect(resolveAssetSource(() => 0)).toBe(0);
  });

  it('웹의 문자열 소스(data URI / URL)를 통과시킨다', () => {
    const dataUri = 'data:audio/mpeg;base64,//twxAAA';
    expect(resolveAssetSource(() => dataUri)).toBe(dataUri);
    expect(resolveAssetSource(() => '/assets/sounds/pop.mp3')).toBe('/assets/sounds/pop.mp3');
  });

  it('{ uri } 객체를 통과시킨다', () => {
    const obj = { uri: 'data:image/png;base64,iVBOR' };
    expect(resolveAssetSource(() => obj)).toBe(obj);
  });

  it('빈 값만 null 로 떨어뜨린다', () => {
    expect(resolveAssetSource(() => null)).toBeNull();
    expect(resolveAssetSource(() => undefined)).toBeNull();
    expect(resolveAssetSource(() => '')).toBeNull();
  });

  it('require 가 던져도 앱이 죽지 않고 null 을 준다', () => {
    expect(
      resolveAssetSource(() => {
        throw new Error('asset missing');
      }),
    ).toBeNull();
  });
});

describe('번들된 에셋', () => {
  it('모든 사운드가 실제 소스로 해석된다 (무음 처리된 것이 없어야 한다)', () => {
    const silent = Object.entries(SOUNDS)
      .filter(([, v]) => v == null)
      .map(([k]) => k);
    expect(silent).toEqual([]);
    expect(Object.keys(SOUNDS)).toHaveLength(7);
  });

  it('간식 이미지는 없으면 null 이고 이모지로 대체된다', () => {
    for (const snack of SNACKS) {
      if (snack.image == null) expect(snack.emoji).toBeTruthy();
    }
  });
});
