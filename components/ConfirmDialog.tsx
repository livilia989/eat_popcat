/**
 * 되돌릴 수 없는 동작을 확인받는 다이얼로그.
 *
 * React Native 의 Alert 는 웹(react-native-web)에서 동작하지 않으므로
 * 어느 플랫폼에서나 똑같이 보이도록 화면 안에 직접 그린다.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialogBase({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: Props) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(appear, {
      toValue: visible ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [appear, visible]);

  if (!visible) return null;

  const scale = appear.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: appear }]}>
      {/* 바깥을 누르면 취소된다 */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onCancel}
        accessibilityLabel="닫기"
      />
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.row}>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={({ pressed }) => [styles.button, styles.cancel, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            style={({ pressed }) => [styles.button, styles.confirm, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(30,16,12,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 26,
    backgroundColor: '#FFF7F0',
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '900', color: '#5B4033', textAlign: 'center' },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8A6A57',
    textAlign: 'center',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { backgroundColor: '#EFE0D4' },
  cancelText: { fontSize: 15, fontWeight: '800', color: '#6B4A3A' },
  confirm: { backgroundColor: '#F0705F' },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});

export const ConfirmDialog = memo(ConfirmDialogBase);
export default ConfirmDialog;
