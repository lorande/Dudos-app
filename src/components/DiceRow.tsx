import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DICE_FACE, Face } from '../../packages/game-core/src';

export default function DiceRow({ dice, size = 40, dim = false }: { dice: Face[]; size?: number; dim?: boolean }) {
  return (
    <View style={styles.row}>
      {dice.map((d, i) => (
        <Text key={i} style={[{ fontSize: size }, dim && styles.dim]}>{DICE_FACE[d]}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dim: { opacity: 0.5 },
});
