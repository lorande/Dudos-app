import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DICE_FACE, Face } from '../../packages/game-core/src';
import { useSettingsStore } from '../store/settingsStore';

// Cores por face no estilo "colorido"
const FACE_COLORS: Record<number, string> = {
  1: '#f5c518', 2: '#60a5fa', 3: '#4ade80', 4: '#f472b6', 5: '#fb923c', 6: '#a78bfa',
};

// Posições dos pontos (grade 3x3) por face — para o estilo "pontinhos"
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

interface Props {
  face: Face;
  size?: number;
  color?: string; // usado no estilo 'symbol'
}

export default function Die({ face, size = 40, color = '#ffffff' }: Props) {
  const diceStyle = useSettingsStore((s) => s.diceStyle);

  if (diceStyle === 'symbol') {
    return <Text style={{ fontSize: size, color, lineHeight: size * 1.1 }}>{DICE_FACE[face]}</Text>;
  }

  // Estilos 'pips' e 'colored' desenham um quadrado com pontos.
  const box = size;
  const isColored = diceStyle === 'colored';
  const faceColor = isColored ? (FACE_COLORS[face] ?? '#888') : '#fafafa';
  const pipColor = isColored ? '#ffffff' : '#1a1a1a';
  const pip = Math.max(4, Math.round(box * 0.18));
  const pad = Math.round(box * 0.14);
  const cell = (box - pad * 2 - pip) / 2;

  return (
    <View style={[styles.die, { width: box, height: box, borderRadius: box * 0.2, backgroundColor: faceColor }]}>
      {PIPS[face].map(([r, c], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: pip, height: pip, borderRadius: pip / 2, backgroundColor: pipColor,
            left: pad + c * cell,
            top: pad + r * cell,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  die: { position: 'relative', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
});
