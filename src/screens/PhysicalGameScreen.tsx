import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { Face } from '../../packages/game-core/src';
import RevealOverlay from '../components/RevealOverlay';
import MesaSelector from '../components/MesaSelector';
import LoserSelectOverlay from '../components/LoserSelectOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'PhysicalGame'>;

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function PhysicalGameScreen({ navigation }: Props) {
  const { game, mySocketId, myDice, mesa, revealAll, resolveDudo, nextRound, disconnect } = useOnlineGameStore();

  const [showReveal, setShowReveal] = useState(false);
  const [showMesa, setShowMesa] = useState(false);

  useEffect(() => {
    if (!game) return;
    if (game.phase === 'game_over') { navigation.replace('OnlineResult'); return; }
    if (game.phase === 'round_end') setShowReveal(true);
    else setShowReveal(false);
  }, [game?.phase]);

  if (!game) return null;

  const myPlayer = game.players.find((p) => p.id === mySocketId);
  const activePlayers = game.players.filter((p) => !p.isEliminated);

  const revealPlayers = game.players.map((p) => ({
    ...p, dice: [] as Face[], tableDice: p.tableDice, usedPasso: false, usedMesa: false, isBot: false,
  }));

  function handleNextRound() {
    setShowReveal(false);
    nextRound(); // no físico qualquer jogador pode reiniciar a rodada
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.roomBadge}>
          <Text style={styles.roomBadgeText}>Mesa {game.roomCode} · Rodada {game.roundNumber} · apostas em voz alta</Text>
        </View>

        {/* Jogadores */}
        <View style={styles.playersRow}>
          {activePlayers.map((p) => (
            <View key={p.id} style={styles.playerChip}>
              <Text style={styles.playerName}>{p.name}{p.id === mySocketId ? ' (eu)' : ''}</Text>
              {game.rules.punishmentMode === 'lives'
                ? <Text style={styles.playerStat}>{'❤️'.repeat(p.lives)}</Text>
                : <Text style={styles.playerStat}>🎲×{p.diceCount}</Text>}
              {p.tableDice.length > 0 && (
                <Text style={styles.tableDice}>{p.tableDice.map((d) => DICE_FACE[d]).join(' ')}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Meus dados */}
        {myPlayer && !myPlayer.isEliminated && (
          <View style={styles.myDice}>
            <Text style={styles.myDiceLabel}>Seus dados (só você vê)</Text>
            <View style={styles.diceRow}>
              {myDice.map((d, i) => <Text key={i} style={styles.die}>{DICE_FACE[d]}</Text>)}
            </View>
          </View>
        )}

        {game.palificoActive && (
          <View style={styles.palificoBanner}>
            <Text style={styles.palificoText}>🔒 Palafico ativo — sem coringa</Text>
          </View>
        )}

        {/* Dados na MESA (públicos a todos) */}
        {activePlayers.some((p) => p.tableDice.length > 0) && (
          <View style={styles.mesaPanel}>
            <Text style={styles.mesaPanelTitle}>🃏 Dados na Mesa</Text>
            {activePlayers.filter((p) => p.tableDice.length > 0).map((p) => (
              <View key={p.id} style={styles.mesaPanelRow}>
                <Text style={styles.mesaPanelName}>{p.name}</Text>
                <Text style={styles.mesaPanelDice}>{p.tableDice.map((d) => DICE_FACE[d]).join(' ')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Ações: qualquer jogador pode Dudar; Mesa disponível */}
        {game.phase === 'bidding' && !game.revealing && !myPlayer?.isEliminated && (
          <View style={styles.actions}>
            <Text style={styles.actionLabel}>As apostas são faladas em voz alta. Ao desafiar, toque em Dudar.</Text>
            <TouchableOpacity style={styles.dudoBtn} onPress={() => revealAll()}>
              <Text style={styles.dudoBtnText}>DUDAR! 🎯</Text>
            </TouchableOpacity>
            {game.rules.mesaEnabled && !myPlayer?.usedMesa && (
              <TouchableOpacity style={styles.mesaBtn} onPress={() => setShowMesa(true)}>
                <Text style={styles.mesaBtnText}>Mesa</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {myPlayer?.isEliminated && (
          <View style={styles.eliminatedBanner}>
            <Text style={styles.eliminatedText}>Você foi eliminado — assistindo…</Text>
          </View>
        )}

        <TouchableOpacity style={styles.leaveBtn} onPress={() => { disconnect(); navigation.replace('Home'); }}>
          <Text style={styles.leaveBtnText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Após Dudar: contagem revelada a todos + atribuição do perdedor */}
      <LoserSelectOverlay
        visible={!!game.revealing}
        faceCounts={game.lastReveal?.faceCounts ?? []}
        players={activePlayers.map((p) => ({ id: p.id, name: p.name }))}
        onCancel={() => { /* só sai resolvendo; cancelar não reverte o servidor */ }}
        onSelect={(loserId) => resolveDudo(loserId)}
      />

      {/* Resultado: contagem das 6 faces */}
      {showReveal && game.lastReveal && (
        <RevealOverlay
          reveal={game.lastReveal}
          players={revealPlayers}
          palificoActive={game.palificoActive}
          onContinue={handleNextRound}
        />
      )}

      <MesaSelector
        visible={showMesa}
        dice={myDice}
        onCancel={() => setShowMesa(false)}
        onConfirm={(idx) => { setShowMesa(false); mesa(idx); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  scroll: { padding: 16, gap: 12 },
  roomBadge: { backgroundColor: '#2d1b4e', borderRadius: 8, padding: 8, alignItems: 'center' },
  roomBadgeText: { color: '#888', fontSize: 12, textAlign: 'center' },
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  playerChip: { backgroundColor: '#2d1b4e', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4a2e7a', minWidth: 80 },
  playerName: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  playerStat: { color: '#aaa', fontSize: 11, marginTop: 2 },
  tableDice: { color: '#c084fc', fontSize: 13, marginTop: 2 },
  myDice: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16 },
  myDiceLabel: { color: '#f5c518', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  diceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  die: { fontSize: 40 },
  palificoBanner: { backgroundColor: '#3b0764', borderRadius: 8, padding: 10, alignItems: 'center' },
  palificoText: { color: '#c084fc', fontSize: 13, fontWeight: '700' },
  mesaPanel: { backgroundColor: '#1e1040', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#c084fc' },
  mesaPanelTitle: { color: '#c084fc', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  mesaPanelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  mesaPanelName: { color: '#fff', fontSize: 14 },
  mesaPanelDice: { fontSize: 32 },
  actions: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, gap: 12 },
  actionLabel: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  dudoBtn: { backgroundColor: '#dc2626', borderRadius: 12, padding: 18, alignItems: 'center' },
  dudoBtnText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  mesaBtn: { borderWidth: 1, borderColor: '#c084fc', borderRadius: 12, padding: 14, alignItems: 'center' },
  mesaBtnText: { color: '#c084fc', fontSize: 15, fontWeight: '700' },
  eliminatedBanner: { backgroundColor: '#450a0a', borderRadius: 8, padding: 14, alignItems: 'center' },
  eliminatedText: { color: '#fca5a5', fontSize: 15 },
  leaveBtn: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  leaveBtnText: { color: '#dc2626', fontSize: 15 },
});
