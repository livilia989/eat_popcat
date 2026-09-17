/** 기록 초기화 버튼 (실제 초기화는 확인 후에만 실행된다) */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  tint: string;
  panel: string;
};

function ResetButtonBase({ onPress, disabled = false, tint, panel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="기록 초기화"
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: panel, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.icon, { color: tint }]}>↺</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 19, fontWeight: '900', lineHeight: 22 },
});

export const ResetButton = memo(ResetButtonBase);
export default ResetButton;
