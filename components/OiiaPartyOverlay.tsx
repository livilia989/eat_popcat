/**
 * ⭐ 이 앱의 핵심 보상 연출: OIIA OIIA PARTY
 *
 * 별도의 DJ 고양이가 등장하지 않는다.
 * 방금까지 간식을 먹던 "그 팝캣"이 수직축(rotateY) 기준으로 360도 빙글빙글 돈다.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { IMAGES } from '../constants/assets';
import { DJ_CONFIG } from '../constants/gameConfig';
import ParticleEffect from './ParticleEffect';
import PopcatCharacter from './PopcatCharacter';

const PARTY_EMOJIS = ['🪩', '🎵', '💫', '🌈', '⭐', '🎶', '⚡', '💜'];

type Props = { onFinish: () => void };

function OiiaPartyOverlayBase({ onFinish }: Props) {
  const { width, height } = useWindowDimensions();
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const strobe = useRef(new Animated.Value(0)).current;
  const rays = useRef(new Animated.Value(0)).current;
  const [bgFailed, setBgFailed] = useState(IMAGES.backgroundParty == null);

  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  const catWidth = Math.min(width * 0.62, height * 0.32, 300);
  // 배경의 디스코볼(상단 중앙)과 타이틀이 겹치지 않도록 위쪽 여백을 화면 비율로 잡는다
  const topPadding = Math.min(210, Math.max(72, height * 0.25));

  useEffect(() => {
    startedAtRef.current = Date.now();
    finishedRef.current = false;

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      Animated.timing(fade, {
        toValue: 0,
        duration: DJ_CONFIG.outroDuration,
        useNativeDriver: true,
      }).start(() => onFinish());
    };

    // 등장
    const intro = Animated.timing(fade, {
      toValue: 1,
      duration: DJ_CONFIG.introDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    intro.start();

    // 🔁 360도 회전 루프
    spin.setValue(0);
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: DJ_CONFIG.rotationDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoop.start();

    const strobeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(strobe, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(strobe, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    );
    strobeLoop.start();

    const raysLoop = Animated.loop(
      Animated.timing(rays, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    raysLoop.start();

    const timer = setTimeout(finish, DJ_CONFIG.eventDuration);

    // 백그라운드에 다녀와도 이벤트가 영원히 남지 않도록 보정
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active' && Date.now() - startedAtRef.current >= DJ_CONFIG.eventDuration) {
        finish();
      }
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
      intro.stop();
      spinLoop.stop();
      strobeLoop.stop();
      raysLoop.stop();
    };
  }, [fade, onFinish, rays, spin, strobe]);

  const rayRotate = rays.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const strobeOpacity = strobe.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.34] });
  const titleScale = strobe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const raySize = Math.max(width, height) * 1.6;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { opacity: fade, paddingTop: topPadding },
      ]}
    >
      {/* 배경: 네온 파티 */}
      <LinearGradient
        colors={['#1A0A36', '#7C1A88', '#2A1276', '#10082E']}
        style={StyleSheet.absoluteFill}
      />
      {IMAGES.backgroundParty != null && !bgFailed ? (
        <Image
          source={IMAGES.backgroundParty}
          style={styles.bgFill}
          resizeMode="cover"
          onError={() => setBgFailed(true)}
        />
      ) : null}

      {/* 회전하는 레이저 광선 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.rays,
          {
            width: raySize,
            height: raySize,
            left: (width - raySize) / 2,
            top: (height - raySize) / 2,
            transform: [{ rotate: rayRotate }],
          },
        ]}
      >
        {['#FF4FD8', '#5BE7FF', '#FFE15F', '#9B6BFF'].map((color, i) => (
          <View
            key={color}
            style={[
              styles.ray,
              {
                backgroundColor: color,
                transform: [{ rotate: `${i * 45}deg` }],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* 스트로브 조명 */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: strobeOpacity }]}
      />

      <ParticleEffect
        count={22}
        emojis={PARTY_EMOJIS}
        width={width}
        height={height}
        speedScale={2.2}
      />

      {/* 상단 타이틀 */}
      <View style={styles.top}>
        <Animated.Text style={[styles.oiia, { transform: [{ scale: titleScale }] }]}>
          OIIA OIIA
        </Animated.Text>
        <Text style={styles.moodMax}>MOOD MAX!</Text>
      </View>

      {/* 중앙: 회전하는 "그" 팝캣 */}
      <View style={styles.center}>
        <View style={[styles.spotlight, { width: catWidth * 1.5, height: catWidth * 1.5 }]} />
        <PopcatCharacter width={catWidth} mouthOpen excited spin={spin} />
      </View>

      {/* 하단 문구 */}
      <View style={styles.bottom}>
        <Text style={styles.chant} numberOfLines={2} adjustsFontSizeToFit>
          우이이이아이이이우이이아이이!!
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'space-between', paddingBottom: 48 },
  bgFill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center', opacity: 0.35 },
  ray: { position: 'absolute', width: '140%', height: 46, borderRadius: 23 },
  top: { alignItems: 'center', gap: 2 },
  oiia: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFF27A',
    letterSpacing: 4,
    textShadowColor: '#FF2FC0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  moodMax: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8DF6FF',
    letterSpacing: 6,
    textShadowColor: '#0A2A6A',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  spotlight: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 8 },
  chant: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: '#7A18C8',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
});

export const OiiaPartyOverlay = memo(OiiaPartyOverlayBase);
export default OiiaPartyOverlay;
