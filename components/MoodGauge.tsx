/** 기분 게이지 — 부드러운 상승/감소 애니메이션 + 수치 + 상태 문구 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MOOD_MAX } from '../constants/gameConfig';
import { getMoodStage } from '../utils/mood';

type Props = { mood: number };

function MoodGaugeBase({ mood }: Props) {
  const stage = getMoodStage(mood);
  const progress = useRef(new Animated.Value(mood / MOOD_MAX)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: Math.min(1, Math.max(0, mood / MOOD_MAX)),
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [mood, progress]);

  // 80 이상에서 게이지가 두근거린다
  useEffect(() => {
    pulse.setValue(0);
    if (mood < 80) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 520, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [mood, pulse]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.6] });

  return (
    <View style={[styles.wrap, { backgroundColor: stage.panelColor }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: stage.textColor }]} numberOfLines={1}>
          {stage.label}
        </Text>
        <Text testID="mood-value" style={[styles.value, { color: stage.textColor }]}>
          {Math.round(mood)}
          <Text style={styles.valueMax}> / {MOOD_MAX}</Text>
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]}>
          <LinearGradient
            colors={stage.gaugeColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        </Animated.View>
        {/* 눈금 */}
        {[20, 40, 60, 80].map((tick) => (
          <View key={tick} style={[styles.tick, { left: `${tick}%` }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  value: { fontSize: 18, fontWeight: '800' },
  valueMax: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
  track: {
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999, overflow: 'hidden' },
  glow: { ...StyleSheet.absoluteFill, backgroundColor: '#FFFFFF' },
  tick: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});

export const MoodGauge = memo(MoodGaugeBase);
export default MoodGauge;
