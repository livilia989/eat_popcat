/**
 * 기분에 따라 단계적으로 화려해지는 배경.
 *
 * - 4장의 배경 이미지를 겹쳐두고 opacity 를 보간해 "갑자기 교체"되지 않게 한다.
 * - 이미지 로드에 실패하면 같은 색감의 LinearGradient 가 그대로 보이도록
 *   그라디언트 레이어를 항상 이미지 아래에 깔아 둔다 (이미지 없어도 정상 동작).
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { IMAGES } from '../constants/assets';
import { ramp } from '../utils/mood';

type LayerDef = {
  key: string;
  image: number | null;
  colors: [string, string, string];
  /** mood 가 from → to 로 갈 때 0 → 1 로 나타난다 */
  from: number;
  to: number;
};

const LAYERS: LayerDef[] = [
  {
    key: 'base',
    image: IMAGES.backgroundBase,
    colors: ['#3A322E', '#78685C', '#8B7A6A'],
    from: -1,
    to: -1, // 항상 불투명 (바닥 레이어)
  },
  {
    key: 'cozy',
    image: IMAGES.backgroundCozy,
    colors: ['#FFE2D6', '#FFD6C4', '#ECC4B0'],
    from: 8,
    to: 34,
  },
  {
    key: 'happy',
    image: IMAGES.backgroundHappy,
    colors: ['#FFD6E8', '#FFF0CC', '#C4E2F5'],
    from: 34,
    to: 58,
  },
  {
    key: 'party',
    image: IMAGES.backgroundParty,
    colors: ['#1A0A36', '#7C1A88', '#10082E'],
    from: 58,
    to: 92,
  },
];

function Layer({ def, mood }: { def: LayerDef; mood: number }) {
  const target = def.from < 0 ? 1 : ramp(mood, def.from, def.to);
  const opacity = useRef(new Animated.Value(target)).current;
  const [imageFailed, setImageFailed] = useState(def.image == null);

  useEffect(() => {
    const anim = Animated.timing(opacity, {
      toValue: target,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [opacity, target]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <LinearGradient colors={def.colors} style={StyleSheet.absoluteFill} />
      {def.image != null && !imageFailed ? (
        <Image
          source={def.image}
          style={styles.fill}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </Animated.View>
  );
}

function DynamicBackgroundBase({ mood }: { mood: number }) {
  // 80 이상에서 네온 조명이 번쩍인다
  const neon = useRef(new Animated.Value(0)).current;
  const neonActive = mood >= 78;

  useEffect(() => {
    neon.setValue(0);
    if (!neonActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(neon, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(neon, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [neon, neonActive]);

  const neonOpacity = neon.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {LAYERS.map((def) => (
        <Layer key={def.key} def={def} mood={mood} />
      ))}
      {neonActive ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: neonOpacity }]}>
          <LinearGradient
            colors={['#FF4FD8', 'transparent', '#5BE7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {/* UI 가독성을 위한 아주 옅은 상/하단 비네트 */}
      <LinearGradient
        colors={['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.18)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // absoluteFill 만으로는 (웹의 react-native-web 등에서) 이미지가 원본 크기로
  // 넘쳐 흐를 수 있어 부모 크기를 명시적으로 채우게 한다.
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
});

export const DynamicBackground = memo(DynamicBackgroundBase);
export default DynamicBackground;
