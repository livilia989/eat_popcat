/** 간식 3종 선택 + 먹이기 버튼 */
import React, { memo, useCallback, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type View as RNView } from 'react-native';

import { SNACKS } from '../constants/snacks';
import type { Point, SnackType } from '../types/game';

type Props = {
  selected: SnackType;
  disabled: boolean;
  tint: string;
  panel: string;
  /**
   * 버튼 중심의 화면(window) 좌표를 함께 넘겨준다.
   * 아직 측정되지 않았으면 null — 호출하는 쪽이 기본 위치로 대체한다.
   */
  onFeed: (snackId: SnackType, origin: Point | null) => void;
};

function SnackSelectorBase({ selected, disabled, tint, panel, onFeed }: Props) {
  const refs = useRef<Record<string, RNView | null>>({});
  /**
   * 버튼 중심 좌표는 레이아웃 시점에 한 번 재서 캐시해 둔다.
   * 누를 때마다 비동기 measure 를 기다리면 연타가 밀리고,
   * 콜백이 오지 않는 환경에서는 아예 먹지 못한다.
   */
  const centers = useRef<Partial<Record<SnackType, Point>>>({});

  const measure = useCallback((snackId: SnackType) => {
    const node = refs.current[snackId];
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, y, w, h) => {
      if (Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0) {
        centers.current[snackId] = { x: x + w / 2, y: y + h / 2 };
      }
    });
  }, []);

  const handlePress = useCallback(
    (snackId: SnackType) => {
      onFeed(snackId, centers.current[snackId] ?? null);
      // 스크롤·회전 등으로 위치가 바뀌었을 수 있으니 다음 탭을 위해 갱신해 둔다
      measure(snackId);
    },
    [measure, onFeed],
  );

  return (
    <View style={[styles.wrap, { backgroundColor: panel }]}>
      <Text style={[styles.title, { color: tint }]}>간식 주기</Text>
      <View style={styles.row}>
        {SNACKS.map((snack) => {
          const isSelected = snack.id === selected;
          return (
            <Pressable
              key={snack.id}
              ref={(node) => {
                refs.current[snack.id] = node;
              }}
              collapsable={false}
              onLayout={() => measure(snack.id)}
              onPress={() => handlePress(snack.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${snack.label} 먹이기, 기분 +${snack.moodGain}`}
              style={({ pressed }) => [
                styles.button,
                {
                  borderColor: isSelected ? snack.color : 'rgba(255,255,255,0.35)',
                  backgroundColor: isSelected
                    ? 'rgba(255,255,255,0.92)'
                    : 'rgba(255,255,255,0.72)',
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  opacity: disabled ? 0.45 : 1,
                },
              ]}
            >
              {snack.image != null ? (
                <Image source={snack.image} style={styles.image} resizeMode="contain" />
              ) : (
                <Text style={styles.emoji}>{snack.emoji}</Text>
              )}
              <Text style={styles.label}>{snack.label}</Text>
              <View style={[styles.gainPill, { backgroundColor: snack.color }]}>
                <Text style={styles.gain}>+{snack.moodGain}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 24, padding: 12, gap: 8 },
  title: { fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  image: { width: 40, height: 40 },
  emoji: { fontSize: 36, lineHeight: 42 },
  label: { fontSize: 13, fontWeight: '700', color: '#5B4033' },
  gainPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, marginTop: 2 },
  gain: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
});

export const SnackSelector = memo(SnackSelectorBase);
export default SnackSelector;
