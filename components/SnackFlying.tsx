/** 간식이 버튼 위치에서 팝캣 입까지 포물선으로 날아가는 애니메이션 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text } from 'react-native';

import { EAT_CONFIG } from '../constants/gameConfig';
import type { FlyingSnack } from '../hooks/useGameState';

const SIZE = 44;

function FlyingItem({ item }: { item: FlyingSnack }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [imageFailed, setImageFailed] = useState(item.snack.image == null);

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: EAT_CONFIG.flightDuration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress]);

  const dx = item.to.x - item.from.x;
  const dy = item.to.y - item.from.y;
  // 포물선: 중간 지점에서 위로 솟았다가 입으로 떨어진다
  const arc = Math.min(160, Math.max(70, Math.abs(dy) * 0.45 + 60));

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, dy * 0.5 - arc, dy],
  });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
  const scale = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.85, 1.15, 0.55],
  });
  const opacity = progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.item,
        {
          left: item.from.x - SIZE / 2,
          top: item.from.y - SIZE / 2,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        },
      ]}
    >
      {item.snack.image != null && !imageFailed ? (
        <Image
          source={item.snack.image}
          style={styles.image}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={styles.emoji}>{item.snack.emoji}</Text>
      )}
    </Animated.View>
  );
}

const MemoFlyingItem = memo(FlyingItem);

function SnackFlyingBase({ items }: { items: FlyingSnack[] }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => (
        <MemoFlyingItem key={item.key} item={item} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: SIZE, height: SIZE },
  emoji: { fontSize: 34, lineHeight: 40 },
});

export const SnackFlying = memo(SnackFlyingBase);
export default SnackFlying;
