import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FaceCount } from '../../packages/game-core/src';
import Die from './Die';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

interface PlayerLite { id: string; name: string; }

interface Props {
  visible: boolean;
  faceCounts: FaceCount[];
  players: PlayerLite[];
  onSelect: (loserId: string) => void;
  onCancel: () => void;
}

export default function LoserSelectOverlay({ visible, faceCounts, players, onSelect, onCancel }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Quem perdeu?</Text>
          {faceCounts.length > 0 && (
            <View style={styles.tally}>
              {faceCounts.map(({ face, count }) => (
                <View key={face} style={styles.tallyItem}>
                  <Die face={face} size={20} color={t.text} />
                  <Text style={styles.tallyCount}>×{count}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.subtitle}>Toque no jogador que perdeu a rodada.</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {players.map((p) => (
              <TouchableOpacity key={p.id} style={styles.playerBtn} onPress={() => onSelect(p.id)}>
                <Text style={styles.playerText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: t.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  title: { color: t.accent, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  tally: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginVertical: 12 },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tallyCount: { color: t.text, fontSize: 20 },
  subtitle: { color: t.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 12 },
  playerBtn: { backgroundColor: t.surfaceActive, borderRadius: 10, padding: 14, marginBottom: 8 },
  playerText: { color: t.text, fontSize: 16, textAlign: 'center' },
  cancel: { borderWidth: 1, borderColor: t.border, borderRadius: t.radius, padding: 12, alignItems: 'center', marginTop: 8 },
  cancelText: { color: t.textMuted, fontSize: 15 },
});
