/**
 * 메인 캐릭터. 사용자가 제공한 팝캣 밈 이미지의 두 프레임만 사용한다.
 *  - idle : 아주 미세한 호흡 애니메이션
 *  - eating : closed / open 프레임 교차 (뻐끔)
 *  - OIIA 이벤트 : perspective + rotateY 로 수직축 360도 회전
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { IMAGES, POPCAT_ASPECT } from '../constants/assets';

type Props = {
  width: number;
  mouthOpen: boolean;
  excited?: boolean;
  /** 0 → 1 이 1회전에 대응하는 Animated.Value (OIIA 이벤트에서 주입) */
  spin?: Animated.Value | null;
  style?: ViewStyle;
};

function PopcatCharacterBase({ width, mouthOpen, excited = false, spin = null, style }: Props) {
  const height = width / POPCAT_ASPECT;
  const breathe = useRef(new Animated.Value(0)).current;
  const [closedFailed, setClosedFailed] = useState(IMAGES.popcatClosed == null);
  const [openFailed, setOpenFailed] = useState(IMAGES.popcatOpen == null);

  // 미세한 상하 호흡. 과하게 흔들리지 않도록 진폭을 작게 유지한다.
  useEffect(() => {
    breathe.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: excited ? 420 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: excited ? 420 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, excited]);

  const translateY = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0, excited ? -10 : -5],
  });
  const breathScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, excited ? 1.045 : 1.018],
  });

  const rotateY = spin
    ? spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    : undefined;

  // 뒤를 보는 구간(90°~270°)에서 살짝 어둡게 해 3D 느낌을 보강한다.
  const backShade = spin
    ? spin.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, 0.45, 0.6, 0.45, 0],
      })
    : null;

  const transform: any[] = [{ perspective: 900 }, { translateY }, { scale: breathScale }];
  if (rotateY) transform.push({ rotateY });

  const bothMissing = closedFailed && openFailed;
  const showOpen = mouthOpen && !openFailed;
  const shadeSource = showOpen ? IMAGES.popcatOpen : IMAGES.popcatClosed;

  return (
    <Animated.View style={[{ width, height }, style, { transform }]}>
      {bothMissing ? (
        // 이미지가 없을 때의 placeholder — 앱은 그대로 동작한다
        <View style={[styles.placeholder, { width, height }]}>
          <Text style={styles.placeholderEmoji}>{mouthOpen ? '😮' : '🐱'}</Text>
          <Text style={styles.placeholderText}>popcat_closed.png{'\n'}popcat_open.png</Text>
        </View>
      ) : (
        <>
          {/* 두 프레임을 겹쳐두고 opacity 만 바꾼다 -> 교차해도 위치가 흔들리지 않음 */}
          {IMAGES.popcatClosed != null && !closedFailed ? (
            <Image
              source={IMAGES.popcatClosed}
              style={[styles.frame, { width, height, opacity: showOpen ? 0 : 1 }]}
              resizeMode="contain"
              fadeDuration={0}
              onError={() => setClosedFailed(true)}
            />
          ) : null}
          {IMAGES.popcatOpen != null && !openFailed ? (
            <Image
              source={IMAGES.popcatOpen}
              style={[styles.frame, { width, height, opacity: showOpen ? 1 : 0 }]}
              resizeMode="contain"
              fadeDuration={0}
              onError={() => setOpenFailed(true)}
            />
          ) : null}
        </>
      )}

      {/*
        회전이 "뒤를 보는" 구간에서 살짝 어둡게 만들어 3D 느낌을 보강한다.
        사각형을 덮으면 네모난 판처럼 보이므로, 같은 이미지를 tintColor 로
        칠해 실루엣 모양 그림자를 만든다. 이미지가 없으면 그리지 않는다.
      */}
      {backShade && shadeSource != null ? (
        <Animated.Image
          source={shadeSource}
          style={[styles.frame, { width, height, tintColor: '#2A0B44', opacity: backShade }]}
          resizeMode="contain"
          fadeDuration={0}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', left: 0, top: 0 },
  placeholder: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 72 },
  placeholderText: {
    marginTop: 8,
    fontSize: 11,
    textAlign: 'center',
    color: '#6B4A3A',
  },
});

export const PopcatCharacter = memo(PopcatCharacterBase);
export default PopcatCharacter;
