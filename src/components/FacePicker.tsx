import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DICE_FACE, Face } from '../../packages/game-core/src';

interface Props {
  value: Face;
  onChange: (f: Face) => void;
  allowBico: boolean; // false em palafico ou wild desativado
}

export default function FacePicker({ value, onChange, allowBico }: Props) {
  const faces: Face[] = [2, 3, 4, 5, 6, ...(allowBico ? [1] as Face[] : [])];
  return (
    <View style={styles.row}>
      {faces.map((f) => (
        <TouchableOpacity key={f} style={[styles.btn, value === f && styles.active]} onPress={() => onChange(f)}>
          <Text style={styles.die}>{DICE_FACE[f]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4a2e7a' },
  active: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  die: { fontSize: 28 },
});
