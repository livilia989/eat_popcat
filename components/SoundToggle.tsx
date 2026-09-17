/** 사운드 ON / OFF 토글 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  enabled: boolean;
  onToggle: () => void;
  tint: string;
  panel: string;
};

function SoundToggleBase({ enabled, onToggle, tint, panel }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={enabled ? '사운드 끄기' : '사운드 켜기'}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: panel, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.icon, { color: tint }]}>{enabled ? '🔊' : '🔈'}</Text>
      <Text style={[styles.label, { color: tint }]}>{enabled ? 'ON' : 'OFF'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 68,
    justifyContent: 'center',
  },
  icon: { fontSize: 15 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});

export const SoundToggle = memo(SoundToggleBase);
export default SoundToggle;
