/** 간식을 먹을 때 팝캣 주변에서 터지는 하트/별 버스트 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const PIECES = ['💗', '⭐', '✨', '💛', '💫', '💕'];
const COUNT = 6;

type Props = { burstId: number; size: number };

function Piece({ index, burstId, size }: { index: number; burstId: number; size: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const angle = (index / COUNT) * Math.PI * 2 - Math.PI / 2;

  useEffect(() => {
    if (burstId <= 0) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 820,
      delay: index * 28,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [burstId, index, progress]);

  const distance = size * 0.55;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * distance],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * distance - size * 0.16],
  });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.15, 0.7] });

  return (
    <Animated.Text
      style={[
        styles.piece,
        { fontSize: size * 0.11, opacity, transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      {PIECES[index % PIECES.length]}
    </Animated.Text>
  );
}

function BurstEffectBase({ burstId, size }: Props) {
  if (burstId <= 0) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {Array.from({ length: COUNT }, (_, i) => (
        <Piece key={i} index={i} burstId={burstId} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute' },
});

export const BurstEffect = memo(BurstEffectBase);
export default BurstEffect;
