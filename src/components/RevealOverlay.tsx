import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { RevealResult, PlayerState, Face } from '../../packages/game-core/src';
import AnimatedDie from './AnimatedDie';
import { useSoundAndHaptics } from '../hooks/useSoundAndHaptics';

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const FACE_NAMES = ['', 'Coringa ★', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis'];

interface Props {
  reveal: RevealResult;
  players: PlayerState[];
  palificoActive: boolean;
  onContinue: () => void;
}

export default function RevealOverlay({ reveal, players, palificoActive, onContinue }: Props) {
  const sfx = useSoundAndHaptics();
  const losers = players.filter((p) => reveal.loserIds.includes(p.id));

  useEffect(() => {
    if (reveal.bidWasTrue) sfx.loseRound();
    else sfx.callDudo();
  }, []);
  const showWild = !palificoActive && reveal.wildCount > 0;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Resultado</Text>

          {/* Cabeçalho conforme o tipo de revelação */}
          {reveal.kind === 'passo' ? (
            <Text style={[styles.bidText, reveal.passoWasDistinct && styles.passoOk]}>
              {reveal.passoWasDistinct
                ? '5 dados distintos confirmados! 🎲'
                : 'O Passo era blefe — 5 distintos não confirmados.'}
            </Text>
          ) : reveal.kind === 'manual' ? (
            <Text style={styles.bidText}>Contagem da mesa</Text>
          ) : (
            <Text style={styles.bidText}>
              Aposta: {reveal.bidQuantity}× {DICE_FACE[reveal.bidFace]} ({FACE_NAMES[reveal.bidFace]})
            </Text>
          )}

          {/* Lista das 6 faces */}
          <View style={styles.faceList}>
            {reveal.faceCounts.map(({ face, count }, idx) => {
              const isWild = face === (1 as Face);
              const isBidFace = face === reveal.bidFace;
              if (isWild && palificoActive) return null;
              return (
                <View key={face} style={[styles.faceRow, isBidFace && styles.faceRowHighlight]}>
                  <AnimatedDie face={face} size={26} animate="reveal" delay={idx * 60} />
                  <Text style={styles.faceName}>
                    {isWild ? 'Coringa ★' : FACE_NAMES[face]}
                  </Text>
                  <Text style={[styles.faceCount, isBidFace && styles.faceCountHighlight]}>
                    ×{count}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Coringa separado (se ativo e não palafico) */}
          {showWild && reveal.bidFace !== 1 && (
            <View style={styles.wildRow}>
              <Text style={styles.wildLabel}>Coringa ★ somados à face apostada:</Text>
              <Text style={styles.wildValue}>
                {reveal.faceCounts.find(f => f.face === reveal.bidFace)?.count ?? 0} + {reveal.wildCount} = {reveal.effectiveCount}
              </Text>
            </View>
          )}

          {/* Veredicto (apenas para Dudo de aposta) */}
          {(!reveal.kind || reveal.kind === 'bid') && (
            <View style={[styles.verdict, reveal.bidWasTrue ? styles.verdictTrue : styles.verdictFalse]}>
              <Text style={styles.verdictText}>
                {reveal.bidWasTrue
                  ? `✅ Aposta verdadeira! (${reveal.effectiveCount} ≥ ${reveal.bidQuantity})`
                  : `❌ Aposta falsa! (${reveal.effectiveCount} < ${reveal.bidQuantity})`}
              </Text>
            </View>
          )}

          {/* Perdedor */}
          <Text style={styles.loserText}>
            {losers.map((p) => p.name).join(', ')} {losers.length === 1 ? 'perde' : 'perdem'} 1 {reveal.bidWasTrue ? 'vida/dado' : 'vida/dado'}!
          </Text>

          <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
            <Text style={styles.continueBtnText}>Próxima Rodada →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#2d1b4e', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  title: { color: '#f5c518', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  bidText: { color: '#aaa', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  passoOk: { color: '#4ade80', fontSize: 17, fontWeight: '800' },
  faceList: { gap: 6, marginBottom: 12 },
  faceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  faceRowHighlight: { backgroundColor: '#3d2060', borderWidth: 1, borderColor: '#7c3aed' },
  faceDie: { fontSize: 26, width: 36 },
  faceName: { color: '#ccc', fontSize: 14, flex: 1 },
  faceCount: { color: '#aaa', fontSize: 16, fontWeight: '700' },
  faceCountHighlight: { color: '#f5c518', fontSize: 20 },
  wildRow: { backgroundColor: '#1e1040', borderRadius: 8, padding: 10, marginBottom: 10 },
  wildLabel: { color: '#c084fc', fontSize: 12 },
  wildValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  verdict: { borderRadius: 10, padding: 14, marginBottom: 10, alignItems: 'center' },
  verdictTrue: { backgroundColor: '#14532d' },
  verdictFalse: { backgroundColor: '#450a0a' },
  verdictText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  loserText: { color: '#fbbf24', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  continueBtn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center' },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
