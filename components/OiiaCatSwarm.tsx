/**
 * MAX 이벤트에서 메인 팝캣 주위를 함께 도는 OIIA 고양이 무리.
 *
 * 한 마리마다 두 가지 회전이 동시에 걸린다.
 *  1) 공전 — 팝캣을 중심으로 궤도를 돈다
 *  2) 자전 — 제자리에서 수직축(rotateY)으로 빙글빙글 돈다
 *
 * 공전은 "중심에 고정된 래퍼를 회전시키는" 방식이다.
 * 래퍼를 돌리면 자식도 같이 기울어지므로 안쪽에서 같은 각도만큼 되돌린다.
 * 모든 애니메이션은 네이티브 드라이버로 돌아간다.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { IMAGES } from '../constants/assets';
import { DJ_CONFIG } from '../constants/gameConfig';
import { turnsFor } from '../utils/anim';

type CatProps = {
  index: number;
  count: number;
  catSize: number;
  radius: number;
  /** 1 = 시계방향, -1 = 반시계방향 */
  direction: 1 | -1;
  orbitDuration: number;
  spinDuration: number;
  /** 이벤트 전체 길이 — 회전 수 계산용 */
  totalMs: number;
  failed: boolean;
  onFail: () => void;
};

function OrbitCat({
  index,
  count,
  catSize,
  radius,
  direction,
  orbitDuration,
  spinDuration,
  totalMs,
  failed,
  onFail,
}: CatProps) {
  const orbit = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  // 짧은 루프를 반복하지 않고, 필요한 바퀴 수만큼 한 번에 돈다.
  // (1회 길이가 짧은 Animated.loop 는 값이 갱신되지 않는다 — utils/anim.ts 참고)
  const orbitTurns = turnsFor(totalMs, orbitDuration);
  const spinTurns = turnsFor(totalMs, spinDuration);

  useEffect(() => {
    orbit.setValue(0);
    spin.setValue(0);
    const orbitAnim = Animated.timing(orbit, {
      toValue: orbitTurns,
      duration: orbitDuration * orbitTurns,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const spinAnim = Animated.timing(spin, {
      toValue: spinTurns,
      duration: spinDuration * spinTurns,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    orbitAnim.start();
    spinAnim.start();
    return () => {
      orbitAnim.stop();
      spinAnim.stop();
    };
  }, [orbit, orbitDuration, orbitTurns, spin, spinDuration, spinTurns]);

  // 시작 위치를 고루 퍼뜨린다
  const base = (index / count) * 360;
  const sweep = 360 * direction;

  const orbitRotate = orbit.interpolate({
    inputRange: [0, orbitTurns],
    outputRange: [`${base}deg`, `${base + sweep * orbitTurns}deg`],
  });
  // 래퍼 회전만큼 되돌려서 고양이가 늘 정면을 향하게 한다
  const counterRotate = orbit.interpolate({
    inputRange: [0, orbitTurns],
    outputRange: [`${-base}deg`, `${-base - sweep * orbitTurns}deg`],
  });
  const spinRotateY = spin.interpolate({
    inputRange: [0, spinTurns],
    outputRange: ['0deg', `${sweep * spinTurns}deg`],
  });

  const wrapper = radius * 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orbitWrapper,
        {
          width: wrapper,
          height: wrapper,
          marginLeft: -radius,
          marginTop: -radius,
          transform: [{ rotate: orbitRotate }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.satellite,
          {
            width: catSize,
            height: catSize,
            marginLeft: -catSize / 2,
            transform: [
              { perspective: 800 },
              { rotate: counterRotate },
              { rotateY: spinRotateY },
            ],
          },
        ]}
      >
        {failed || IMAGES.oiiaCat == null ? (
          <Text style={[styles.fallback, { fontSize: catSize * 0.8 }]}>🐈</Text>
        ) : (
          <Image
            source={IMAGES.oiiaCat}
            style={{ width: catSize, height: catSize }}
            resizeMode="contain"
            fadeDuration={0}
            onError={onFail}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const MemoOrbitCat = memo(OrbitCat);

type Props = {
  /** 중앙 팝캣의 폭 — 궤도 반지름과 위성 크기의 기준 */
  centerSize: number;
  count?: number;
  /** 이벤트 전체 길이 (회전 수 계산용) */
  totalMs?: number;
};

function OiiaCatSwarmBase({
  centerSize,
  count = DJ_CONFIG.satelliteCount,
  totalMs = DJ_CONFIG.eventDuration + DJ_CONFIG.outroDuration + 400,
}: Props) {
  const [failed, setFailed] = useState(IMAGES.oiiaCat == null);
  const total = Math.max(0, Math.min(16, Math.round(count)));
  if (total === 0) return null;

  const catSize = Math.max(44, centerSize * 0.42);

  return (
    <View style={styles.root} pointerEvents="none">
      {Array.from({ length: total }, (_, i) => {
        // 안쪽/바깥쪽 두 겹으로 나누고 서로 반대로 돌린다 -> 훨씬 정신없다
        const outer = i % 2 === 0;
        return (
          <MemoOrbitCat
            key={i}
            index={i}
            count={total}
            catSize={outer ? catSize : catSize * 0.78}
            radius={centerSize * (outer ? 1.02 : 0.68)}
            direction={outer ? 1 : -1}
            orbitDuration={DJ_CONFIG.orbitDuration * (outer ? 1 : 0.72)}
            spinDuration={DJ_CONFIG.satelliteSpinDuration * (outer ? 1 : 0.8)}
            totalMs={totalMs}
            failed={failed}
            onFail={() => setFailed(true)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  orbitWrapper: { position: 'absolute', left: '50%', top: '50%' },
  satellite: { position: 'absolute', left: '50%', top: 0, alignItems: 'center' },
  fallback: { textAlign: 'center' },
});

export const OiiaCatSwarm = memo(OiiaCatSwarmBase);
export default OiiaCatSwarm;
