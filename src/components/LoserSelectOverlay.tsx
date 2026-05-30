import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DICE_FACE, FaceCount } from '../../packages/game-core/src';

interface PlayerLite { id: string; name: string; }

interface Props {
  visible: boolean;
  faceCounts: FaceCount[];
  players: PlayerLite[];
  onSelect: (loserId: string) => void;
  onCancel: () => void;
}

export default function LoserSelectOverlay({ visible, faceCounts, players, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Quem perdeu?</Text>
          {faceCounts.length > 0 && (
            <View style={styles.tally}>
              {faceCounts.map(({ face, count }) => (
                <Text key={face} style={styles.tallyItem}>{DICE_FACE[face]} ×{count}</Text>
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#2d1b4e', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  title: { color: '#f5c518', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  tally: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginVertical: 12 },
  tallyItem: { color: '#fff', fontSize: 20 },
  subtitle: { color: '#aaa', fontSize: 15, textAlign: 'center', marginBottom: 12 },
  playerBtn: { backgroundColor: '#3d2060', borderRadius: 10, padding: 14, marginBottom: 8 },
  playerText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  cancel: { borderWidth: 1, borderColor: '#4a2e7a', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#aaa', fontSize: 15 },
});
