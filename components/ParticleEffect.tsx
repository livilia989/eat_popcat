/**
 * 기분 단계에 따른 파티클 (하트 / 별 / 반짝이 / 음표).
 * 고정된 풀에서 필요한 개수만 렌더링하고, 전부 네이티브 드라이버로 돌린다.
 */
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const MAX_PARTICLES = 24;

type ParticleProps = {
  index: number;
  emoji: string;
  areaWidth: number;
  areaHeight: number;
  speedScale: number;
};

function Particle({ index, emoji, areaWidth, areaHeight, speedScale }: ParticleProps) {
  const progress = useRef(new Animated.Value(0)).current;

  // index 기반 의사난수 -> 리렌더에도 위치가 튀지 않는다
  const seed = useMemo(() => {
    const r = (n: number) => {
      const x = Math.sin((index + 1) * n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    return {
      x: r(1),
      size: 16 + r(2) * 18,
      delay: r(3) * 2600,
      duration: 3200 + r(4) * 2600,
      drift: (r(5) - 0.5) * 70,
      spin: r(6) > 0.5 ? 1 : -1,
    };
  }, [index]);

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(seed.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: seed.duration / speedScale,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [progress, seed.delay, seed.duration, speedScale]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [areaHeight * 0.92, -areaHeight * 0.1],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, seed.drift, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.75, 1],
    outputRange: [0, 1, 1, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${seed.spin * 220}deg`],
  });

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          left: seed.x * Math.max(0, areaWidth - 40),
          fontSize: seed.size,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

const MemoParticle = memo(Particle);

type Props = {
  count: number;
  emojis: string[];
  width: number;
  height: number;
  /** 1 = 기본 속도, 2 = 2배 빠르게 (파티 모드) */
  speedScale?: number;
};

function ParticleEffectBase({ count, emojis, width, height, speedScale = 1 }: Props) {
  const total = Math.max(0, Math.min(MAX_PARTICLES, Math.round(count)));
  if (total === 0 || width <= 0 || height <= 0 || emojis.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: total }, (_, i) => (
        <MemoParticle
          key={`${emojis.join('')}-${i}`}
          index={i}
          emoji={emojis[i % emojis.length]}
          areaWidth={width}
          areaHeight={height}
          speedScale={speedScale}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', top: 0 },
});

export const ParticleEffect = memo(ParticleEffectBase);
export default ParticleEffect;
