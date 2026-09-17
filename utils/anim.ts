/**
 * 빠른 반복 애니메이션용 보간 헬퍼.
 *
 * 왜 필요한가:
 *  `Animated.loop(Animated.timing(v, { duration: 200 }))` 처럼 1회 길이가
 *  아주 짧은 루프는 매 반복마다 reset/restart 가 일어나면서 값이 제대로
 *  갱신되지 않는다(실측: 200~260ms 는 전혀 회전하지 않고 1500ms 는 정상).
 *
 * 그래서 이 프로젝트는 "짧은 애니메이션을 여러 번 반복"하는 대신
 *  0 → cycles 까지 흐르는 **한 번의 긴 애니메이션**을 돌리고,
 *  아래 헬퍼로 사이클마다 반복되는 보간 구간을 만들어 쓴다.
 *  루프 재시작이 없으니 끊김도 없고 아주 빠른 회전도 매끄럽다.
 */

export type Keyframe = { at: number; value: number };

/**
 * 0 → cycles 로 증가하는 Animated.Value 에 대해,
 * 한 사이클(1.0) 안에서 keyframes 가 반복되는 interpolate 범위를 만든다.
 *
 * @param cycles 총 반복 횟수
 * @param keys   사이클 내 위치(0 이상 1 미만, 오름차순)와 값
 */
export function repeatRange(
  cycles: number,
  keys: Keyframe[],
): { inputRange: number[]; outputRange: number[] } {
  const total = Math.max(1, Math.floor(cycles));
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let c = 0; c < total; c += 1) {
    for (const k of keys) {
      inputRange.push(c + k.at);
      outputRange.push(k.value);
    }
  }
  // interpolate 는 inputRange 가 엄격히 증가해야 한다 — 마지막 끝점을 닫아준다
  inputRange.push(total);
  outputRange.push(keys[0].value);
  return { inputRange, outputRange };
}

/** eventDuration 동안 rotationDuration 마다 한 바퀴 돌 때 필요한 총 회전 수 */
export function turnsFor(eventDuration: number, rotationDuration: number): number {
  return Math.max(1, Math.ceil(eventDuration / Math.max(1, rotationDuration)));
}
