import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Face } from '../../packages/game-core/src';
import Die from './Die';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

interface Props {
  visible: boolean;
  dice: Face[];
  onCancel: () => void;
  onConfirm: (indexes: number[]) => void;
}

export default function MesaSelector({ visible, dice, onCancel, onConfirm }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
  const [selected, setSelected] = useState<number[]>([]);

  function toggle(i: number) {
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Mesa</Text>
          <Text style={styles.subtitle}>Toque nos dados que vai revelar na mesa. Os demais serão re-sorteados.</Text>
          <View style={styles.diceRow}>
            {dice.map((d, i) => (
              <TouchableOpacity key={i} style={[styles.die, selected.includes(i) && styles.selected]} onPress={() => toggle(i)}>
                <Die face={d} size={40} color={t.text} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={() => { setSelected([]); onCancel(); }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirm} onPress={() => { const s = selected; setSelected([]); onConfirm(s); }}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: t.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  title: { color: t.accent, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: t.textMuted, fontSize: 14, textAlign: 'center', marginVertical: 12 },
  diceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  die: { padding: 8, borderRadius: 10, borderWidth: 2, borderColor: t.border },
  selected: { borderColor: t.accent, backgroundColor: t.surfaceActive },
  dieText: { fontSize: 40 },
  actions: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: t.radius, padding: 14, alignItems: 'center' },
  cancelText: { color: t.textMuted, fontSize: 15 },
  confirm: { flex: 1, backgroundColor: t.primary, borderRadius: t.radius, padding: 14, alignItems: 'center' },
  confirmText: { color: t.text, fontSize: 15, fontWeight: '700' },
});
