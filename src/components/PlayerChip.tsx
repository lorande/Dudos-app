import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DICE_FACE, Face, PunishmentMode } from '../../packages/game-core/src';

interface Props {
  name: string;
  lives: number;
  diceCount: number;
  tableDice?: Face[];
  punishmentMode: PunishmentMode;
  active?: boolean;
  me?: boolean;
}

export default function PlayerChip({ name, lives, diceCount, tableDice = [], punishmentMode, active, me }: Props) {
  return (
    <View style={[styles.chip, active && styles.active]}>
      <Text style={styles.name}>{name}{me ? ' (eu)' : ''}</Text>
      {punishmentMode === 'lives'
        ? <Text style={styles.stat}>{'❤️'.repeat(lives)}</Text>
        : <Text style={styles.stat}>🎲×{diceCount}</Text>}
      {tableDice.length > 0 && (
        <Text style={styles.table}>{tableDice.map((d) => DICE_FACE[d]).join(' ')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { backgroundColor: '#2d1b4e', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4a2e7a', minWidth: 80 },
  active: { borderColor: '#f5c518', backgroundColor: '#3d2060' },
  name: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  stat: { color: '#aaa', fontSize: 12, marginTop: 2 },
  table: { color: '#c084fc', fontSize: 14, marginTop: 2 },
});
