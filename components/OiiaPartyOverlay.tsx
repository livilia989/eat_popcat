/**
 * ⭐ 이 앱의 핵심 보상 연출: OIIA OIIA PARTY
 *
 * 별도의 DJ 고양이가 등장하지 않는다.
 * 방금까지 간식을 먹던 "그 팝캣"이 수직축(rotateY) 기준으로 360도 빙글빙글 돈다.
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import { repeatRange, turnsFor } from '../utils/anim';
import OiiaCatSwarm from './OiiaCatSwarm';
import ParticleEffect from './ParticleEffect';
import PopcatCharacter from './PopcatCharacter';

const PARTY_EMOJIS = ['🪩', '🎵', '💫', '🌈', '⭐', '🎶', '⚡', '💜'];

/** 스트로브 조명 1회 깜빡임 / 레이저 1회전 시간 */
const STROBE_CYCLE_MS = 440;
const RAY_TURN_MS = 5200;

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
  /**
   * onFinish 를 ref 로 들고 있는다.
   * 부모가 리렌더될 때마다 콜백 identity 가 바뀌면 아래 effect 가 재실행되어
   * 8초 타이머와 회전 애니메이션이 처음부터 다시 시작되기 때문이다.
   * (그러면 파티가 제때 끝나지 않고 mood 가 100 에 머문다.)
   */
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // 위성 고양이가 팝캣 반지름의 약 1.02배 궤도를 돌기 때문에
  // 메인 팝캣을 조금 작게 잡아야 무리 전체가 화면 안에 들어온다
  const catWidth = Math.min(width * 0.38, height * 0.22, 210);
  // 배경의 디스코볼(상단 중앙)과 타이틀이 겹치지 않도록 위쪽 여백을 화면 비율로 잡는다
  const topPadding = Math.min(210, Math.max(72, height * 0.25));

  // 이벤트 전체를 덮을 만큼의 회전 수를 미리 계산해 둔다
  const totalMs = DJ_CONFIG.eventDuration + DJ_CONFIG.outroDuration + 400;
  const spinTurns = turnsFor(totalMs, DJ_CONFIG.rotationDuration);
  const strobeCycles = turnsFor(totalMs, STROBE_CYCLE_MS);
  const rayTurns = turnsFor(totalMs, RAY_TURN_MS);

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
      }).start(() => onFinishRef.current());
    };

    // 등장
    const intro = Animated.timing(fade, {
      toValue: 1,
      duration: DJ_CONFIG.introDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    intro.start();

    // 🔁 360도 회전 — 짧은 루프를 반복하지 않고 한 번에 spinTurns 바퀴를 돈다
    spin.setValue(0);
    const spinAnim = Animated.timing(spin, {
      toValue: spinTurns,
      duration: DJ_CONFIG.rotationDuration * spinTurns,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    spinAnim.start();

    strobe.setValue(0);
    const strobeAnim = Animated.timing(strobe, {
      toValue: strobeCycles,
      duration: STROBE_CYCLE_MS * strobeCycles,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    strobeAnim.start();

    rays.setValue(0);
    const raysAnim = Animated.timing(rays, {
      toValue: rayTurns,
      duration: RAY_TURN_MS * rayTurns,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    raysAnim.start();

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
      spinAnim.stop();
      strobeAnim.stop();
      raysAnim.stop();
    };
    // 마운트 시 한 번만 실행되어야 한다 (Animated.Value 와 ref 는 고정 참조)
  }, [fade, rayTurns, rays, spin, spinTurns, strobe, strobeCycles]);

  // 값이 0 → turns/cycles 로 흐르므로 보간 범위도 거기에 맞춰야 한다.
  // [0, 1] 범위로 두면 extrapolate 가 값을 끝없이 늘려
  // 흰 스트로브가 화면 전체를 덮어버린다.
  const rayRotate = rays.interpolate({
    inputRange: [0, rayTurns],
    outputRange: ['0deg', `${360 * rayTurns}deg`],
  });
  // interpolate 결과를 다시 interpolate 하면(중첩 보간) 값이 적용되지 않으므로
  // 최종 값을 각각 직접 만든다.
  const strobeOpacityRange = useMemo(
    () => repeatRange(strobeCycles, [
      { at: 0, value: 0.06 },
      { at: 0.5, value: 0.34 },
    ]),
    [strobeCycles],
  );
  const titleScaleRange = useMemo(
    () => repeatRange(strobeCycles, [
      { at: 0, value: 1 },
      { at: 0.5, value: 1.08 },
    ]),
    [strobeCycles],
  );
  const strobeOpacity = strobe.interpolate(strobeOpacityRange);
  const titleScale = strobe.interpolate(titleScaleRange);
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

      {/* 중앙: 회전하는 "그" 팝캣 + 함께 도는 OIIA 고양이 무리 */}
      <View style={styles.center}>
        <View style={[styles.spotlight, { width: catWidth * 1.5, height: catWidth * 1.5 }]} />
        <OiiaCatSwarm centerSize={catWidth} />
        <PopcatCharacter
          width={catWidth}
          mouthOpen
          excited
          spin={spin}
          spinTurns={spinTurns}
        />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
