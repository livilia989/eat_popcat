/**
 * 팝캣 OIIA 파티 (Popcat OIIA Party)
 *
 * 간식 먹이기 → 팝캣 뻐끔 → 기분 상승 → 배경이 화려해짐
 * → 기분 MAX → OIIA OIIA 사운드 + 팝캣 360도 회전 → 파티 종료 → 반복
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type View as RNView,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import BurstEffect from './components/BurstEffect';
import DynamicBackground from './components/DynamicBackground';
import MoodGauge from './components/MoodGauge';
import OiiaPartyOverlay from './components/OiiaPartyOverlay';
import ParticleEffect from './components/ParticleEffect';
import PopcatCharacter from './components/PopcatCharacter';
import SnackFlying from './components/SnackFlying';
import SnackSelector from './components/SnackSelector';
import SoundToggle from './components/SoundToggle';
import { POPCAT_ASPECT, POPCAT_MOUTH } from './constants/assets';
import { useGameState } from './hooks/useGameState';
import { useSound } from './hooks/useSound';
import { getMoodStage } from './utils/mood';
import type { Point, SnackType } from './types/game';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameScreen />
    </SafeAreaProvider>
  );
}

function GameScreen() {
  const { width, height } = useWindowDimensions();
  const sound = useSound(true);
  const game = useGameState(sound);

  // 저장된 사운드 설정을 사운드 매니저에 반영한다
  useEffect(() => {
    sound.setEnabled(game.soundEnabled);
  }, [game.soundEnabled, sound]);

  const stage = getMoodStage(game.mood);
  const [stageArea, setStageArea] = useState({ width: 0, height: 0 });
  const rootRef = useRef<RNView | null>(null);
  const mouthRef = useRef<RNView | null>(null);
  const rootOriginRef = useRef<Point>({ x: 0, y: 0 });
  const mouthPointRef = useRef<Point | null>(null);

  const catWidth = Math.min(width * 0.66, Math.max(150, height * 0.3), 280);
  const catHeight = catWidth / POPCAT_ASPECT;

  /* --------------------------------------------- 좌표 측정 (간식 비행용) */
  const measureAnchors = useCallback(() => {
    rootRef.current?.measureInWindow?.((x, y) => {
      rootOriginRef.current = { x, y };
    });
    mouthRef.current?.measureInWindow?.((x, y, w, h) => {
      mouthPointRef.current = { x: x + w / 2, y: y + h / 2 };
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(measureAnchors, 300);
    return () => clearTimeout(id);
  }, [measureAnchors, width, height]);

  const onStageLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      setStageArea({ width: w, height: h });
      measureAnchors();
    },
    [measureAnchors],
  );

  /* -------------------------------------------------------- 먹이기 핸들러 */
  const handleFeed = useCallback(
    (snackId: SnackType, windowOrigin: Point) => {
      // 사용자의 첫 터치 — 이 시점부터 오디오 재생이 허용된다
      sound.unlock();
      const rootOrigin = rootOriginRef.current;
      const mouth = mouthPointRef.current;
      const toWindow: Point = mouth ?? { x: width / 2, y: height * 0.42 };
      const from: Point = {
        x: windowOrigin.x - rootOrigin.x,
        y: windowOrigin.y - rootOrigin.y,
      };
      const to: Point = { x: toWindow.x - rootOrigin.x, y: toWindow.y - rootOrigin.y };
      game.feed(snackId, from, to);
    },
    [game, height, sound, width],
  );

  const handleToggleSound = useCallback(() => {
    sound.unlock();
    // 켜는 순간에만 클릭음을 낸다 (끄는 중에는 소리 없음)
    if (!game.soundEnabled) sound.play('button_click');
    game.toggleSound();
  }, [game, sound]);

  /* ------------------------------------------- OIIA 이벤트 BGM 라이프사이클 */
  useEffect(() => {
    if (game.isDjPartyActive) {
      sound.startBgm('oiia_loop');
    } else {
      sound.stopBgm(true);
    }
  }, [game.isDjPartyActive, sound]);

  // game 객체 전체가 아니라 안정적인 endParty 만 의존한다 (콜백 identity 고정)
  const { endParty } = game;
  const handlePartyFinish = useCallback(() => {
    endParty();
  }, [endParty]);

  if (!game.ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingEmoji}>🐱</Text>
        <Text style={styles.loadingText}>팝캣 깨우는 중...</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      ref={rootRef}
      collapsable={false}
      onLayout={measureAnchors}
    >
      <StatusBar barStyle={stage.stage >= 3 ? 'light-content' : 'dark-content'} />
      <DynamicBackground mood={game.mood} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* ------------------------------------------------------- 상단 */}
        <View style={styles.header}>
          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: stage.textColor }]} numberOfLines={1}>
              팝캣 OIIA 파티
            </Text>
            <Text style={[styles.subtitle, { color: stage.textColor }]} numberOfLines={1}>
              🍪 {game.totalSnacks}   🪩 {game.totalParties}
            </Text>
          </View>
          <SoundToggle
            enabled={game.soundEnabled}
            onToggle={handleToggleSound}
            tint={stage.textColor}
            panel={stage.panelColor}
          />
        </View>

        <View style={styles.gaugeBox}>
          <MoodGauge mood={game.mood} />
        </View>

        {/* ------------------------------------------------------- 중앙 */}
        <View style={styles.stage} onLayout={onStageLayout}>
          <ParticleEffect
            count={stage.particles}
            emojis={stage.particleEmojis}
            width={stageArea.width}
            height={stageArea.height}
            speedScale={1 + stage.stage * 0.18}
          />

          <View style={[styles.catBox, { width: catWidth, height: catHeight }]}>
            <BurstEffect burstId={game.burstId} size={catWidth} />
            <PopcatCharacter
              width={catWidth}
              mouthOpen={game.mouthOpen}
              excited={game.mood >= 80}
            />
            {/* 간식이 도착할 지점(입) — 보이지 않는 앵커 */}
            <View
              ref={mouthRef}
              collapsable={false}
              pointerEvents="none"
              style={[
                styles.mouthAnchor,
                {
                  left: catWidth * POPCAT_MOUTH.x - 1,
                  top: catHeight * POPCAT_MOUTH.y - 1,
                },
              ]}
            />
          </View>

          <View style={styles.reactionBox} pointerEvents="none">
            {game.reaction ? (
              <Text style={[styles.reaction, { color: stage.textColor }]}>{game.reaction}</Text>
            ) : null}
          </View>
        </View>

        {/* ------------------------------------------------------- 하단 */}
        <View style={styles.footer}>
          <SnackSelector
            selected={game.selectedSnack}
            disabled={game.isDjPartyActive}
            tint={stage.textColor}
            panel={stage.panelColor}
            onFeed={handleFeed}
          />
        </View>
      </SafeAreaView>

      {/* 날아가는 간식은 루트 기준 절대 좌표로 그린다 */}
      <SnackFlying items={game.flying} />

      {/* ⭐ MAX 이벤트 */}
      {game.isDjPartyActive ? <OiiaPartyOverlay onFinish={handlePartyFinish} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3A322E' },
  safe: { flex: 1, paddingHorizontal: 16 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE2D6',
    gap: 10,
  },
  loadingEmoji: { fontSize: 56 },
  loadingText: { fontSize: 15, fontWeight: '700', color: '#7A5442' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 8,
  },
  titleBox: { flexShrink: 1, gap: 1 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '700', opacity: 0.85 },

  gaugeBox: { marginBottom: 6 },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  catBox: { alignItems: 'center', justifyContent: 'center' },
  mouthAnchor: { position: 'absolute', width: 2, height: 2 },
  reactionBox: { height: 34, justifyContent: 'center', marginTop: 4 },
  reaction: {
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  footer: { paddingBottom: 6 },
});
