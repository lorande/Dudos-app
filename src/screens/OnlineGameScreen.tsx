import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { Face, Bid } from '../../packages/game-core/src';
import RevealOverlay from '../components/RevealOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'OnlineGame'>;

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function OnlineGameScreen({ navigation }: Props) {
  const { game, mySocketId, myDice, bid, dudo, nextRound, disconnect } = useOnlineGameStore();

  const [bidQty, setBidQty] = useState(1);
  const [bidFace, setBidFace] = useState<Face>(2);
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    if (!game) return;
    if (game.phase === 'game_over') {
      navigation.replace('OnlineResult');
      return;
    }
    if (game.phase === 'round_end') setShowReveal(true);
    else setShowReveal(false);
  }, [game?.phase]);

  if (!game) return null;

  const isMyTurn = game.currentPlayerId === mySocketId;
  const myPlayer = game.players.find((p) => p.id === mySocketId);
  const isHost = game.hostId === mySocketId;
  const activePlayers = game.players.filter((p) => !p.isEliminated);
  const currentPlayer = game.players.find((p) => p.id === game.currentPlayerId);

  function handleBid() {
    bid(bidQty, bidFace);
  }

  function handleDudo() {
    dudo();
  }

  function handleNextRound() {
    setShowReveal(false);
    if (isHost) nextRound();
  }

  // Adapta lastReveal para o formato do RevealOverlay (que espera PlayerState com dice[])
  const revealPlayers = game.players.map((p) => ({
    ...p,
    dice: [] as Face[], // dados não expostos publicamente
    isBot: false,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Sala */}
        <View style={styles.roomBadge}>
          <Text style={styles.roomBadgeText}>Sala {game.roomCode} · Rodada {game.roundNumber}</Text>
        </View>

        {/* Jogadores */}
        <View style={styles.playersRow}>
          {activePlayers.map((p) => (
            <View
              key={p.id}
              style={[styles.playerChip, game.currentPlayerId === p.id && styles.playerChipActive]}
            >
              <Text style={styles.playerName}>{p.name}{p.id === mySocketId ? ' (eu)' : ''}</Text>
              {game.rules.punishmentMode === 'lives'
                ? <Text style={styles.playerStat}>{'❤️'.repeat(p.lives)}</Text>
                : <Text style={styles.playerStat}>🎲×{p.diceCount}</Text>
              }
            </View>
          ))}
        </View>

        {/* Meus dados */}
        {myPlayer && !myPlayer.isEliminated && (
          <View style={styles.myDice}>
            <Text style={styles.myDiceLabel}>Seus dados</Text>
            <View style={styles.diceRow}>
              {myDice.map((d, i) => <Text key={i} style={styles.die}>{DICE_FACE[d]}</Text>)}
            </View>
          </View>
        )}

        {/* Aposta atual */}
        <View style={styles.currentBid}>
          <Text style={styles.currentBidLabel}>Aposta atual</Text>
          {game.currentBid
            ? <Text style={styles.currentBidValue}>{game.currentBid.quantity}× {DICE_FACE[game.currentBid.face]}</Text>
            : <Text style={styles.currentBidNone}>Nenhuma ainda</Text>
          }
        </View>

        {game.palificoActive && (
          <View style={styles.palificoBanner}>
            <Text style={styles.palificoText}>🔒 Palafico ativo — sem coringa</Text>
          </View>
        )}

        {/* Aguardando */}
        {!isMyTurn && game.phase === 'bidding' && (
          <View style={styles.waitBanner}>
            <Text style={styles.waitText}>Aguardando {currentPlayer?.name ?? '…'}</Text>
          </View>
        )}

        {/* Eliminado */}
        {myPlayer?.isEliminated && (
          <View style={styles.eliminatedBanner}>
            <Text style={styles.eliminatedText}>Você foi eliminado — assistindo…</Text>
          </View>
        )}

        {/* Ações */}
        {isMyTurn && game.phase === 'bidding' && !myPlayer?.isEliminated && (
          <View style={styles.actions}>
            <Text style={styles.actionLabel}>Sua vez</Text>

            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>Quantidade</Text>
              <View style={styles.pickerButtons}>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setBidQty((q) => Math.max(1, q - 1))}>
                  <Text style={styles.pickerBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{bidQty}</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setBidQty((q) => q + 1)}>
                  <Text style={styles.pickerBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.facePicker}>
              {([2, 3, 4, 5, 6, ...(game.rules.wildEnabled && !game.palificoActive ? [1] : [])] as Face[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.faceBtn, bidFace === f && styles.faceBtnActive]}
                  onPress={() => setBidFace(f)}
                >
                  <Text style={styles.faceBtnText}>{DICE_FACE[f]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.bidBtn} onPress={handleBid}>
                <Text style={styles.bidBtnText}>Apostar {bidQty}× {DICE_FACE[bidFace]}</Text>
              </TouchableOpacity>
              {game.currentBid && (
                <TouchableOpacity style={styles.dudoBtn} onPress={handleDudo}>
                  <Text style={styles.dudoBtnText}>DUDAR!</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Aguardando host avançar rodada */}
        {game.phase === 'round_end' && !isHost && (
          <View style={styles.waitBanner}>
            <Text style={styles.waitText}>Aguardando host iniciar próxima rodada…</Text>
          </View>
        )}
      </ScrollView>

      {showReveal && game.lastReveal && (
        <RevealOverlay
          reveal={game.lastReveal}
          players={revealPlayers}
          palificoActive={game.palificoActive}
          onContinue={handleNextRound}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  scroll: { padding: 16, gap: 12 },
  roomBadge: { backgroundColor: '#2d1b4e', borderRadius: 8, padding: 8, alignItems: 'center' },
  roomBadgeText: { color: '#888', fontSize: 13 },
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  playerChip: { backgroundColor: '#2d1b4e', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4a2e7a', minWidth: 80 },
  playerChipActive: { borderColor: '#f5c518', backgroundColor: '#3d2060' },
  playerName: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  playerStat: { color: '#aaa', fontSize: 11, marginTop: 2 },
  myDice: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16 },
  myDiceLabel: { color: '#f5c518', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  diceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  die: { fontSize: 40 },
  currentBid: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, alignItems: 'center' },
  currentBidLabel: { color: '#aaa', fontSize: 13 },
  currentBidValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 },
  currentBidNone: { color: '#555', fontSize: 18, marginTop: 4 },
  palificoBanner: { backgroundColor: '#3b0764', borderRadius: 8, padding: 10, alignItems: 'center' },
  palificoText: { color: '#c084fc', fontSize: 13, fontWeight: '700' },
  waitBanner: { backgroundColor: '#1e293b', borderRadius: 8, padding: 14, alignItems: 'center' },
  waitText: { color: '#94a3b8', fontSize: 16 },
  eliminatedBanner: { backgroundColor: '#450a0a', borderRadius: 8, padding: 14, alignItems: 'center' },
  eliminatedText: { color: '#fca5a5', fontSize: 15 },
  actions: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, gap: 12 },
  actionLabel: { color: '#f5c518', fontSize: 14, fontWeight: '700' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerLabel: { color: '#aaa', fontSize: 14 },
  pickerButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pickerBtn: { backgroundColor: '#4a2e7a', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pickerBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  pickerValue: { color: '#fff', fontSize: 22, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  facePicker: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  faceBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4a2e7a' },
  faceBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  faceBtnText: { fontSize: 28 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  bidBtn: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center' },
  bidBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dudoBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 12, padding: 16, alignItems: 'center' },
  dudoBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
