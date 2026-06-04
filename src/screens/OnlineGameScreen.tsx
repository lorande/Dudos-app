import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { Face, Bid, availableBidFaces, minBidQuantity } from '../../packages/game-core/src';
import RevealOverlay from '../components/RevealOverlay';
import MesaSelector from '../components/MesaSelector';
import Die from '../components/Die';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'OnlineGame'>;

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function OnlineGameScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
  const { game, mySocketId, myDice, roomClosed, bid, dudo, passo, dudoPasso, mesa, nextRound, closeRoom, disconnect } = useOnlineGameStore();

  const [bidQty, setBidQty] = useState(1);
  const [bidFace, setBidFace] = useState<Face>(2);
  const [showReveal, setShowReveal] = useState(false);
  const [showMesa, setShowMesa] = useState(false);

  useEffect(() => {
    if (!game) return;
    if (game.phase === 'game_over') {
      navigation.replace('OnlineResult');
      return;
    }
    if (game.phase === 'round_end') setShowReveal(true);
    else setShowReveal(false);
  }, [game?.phase]);

  useEffect(() => {
    if (roomClosed) {
      Alert.alert('Sala encerrada', 'A sala foi encerrada pelo host.');
      disconnect();
      navigation.replace('Home');
    }
  }, [roomClosed]);

  // Mantém a face selecionada válida conforme a aposta atual.
  useEffect(() => {
    if (!game) return;
    const faces = availableBidFaces(game.currentBid, game.rules.wildEnabled, game.palificoActive, game.faceBeforeBico);
    if (!faces.includes(bidFace)) setBidFace(faces[0]);
  }, [game?.currentBid?.quantity, game?.currentBid?.face, game?.palificoActive]);

  const activeCount = game ? game.players.filter((p) => !p.isEliminated).length : 0;
  const minQty = game ? minBidQuantity(game.currentBid, bidFace, activeCount, game.palificoActive) : 1;
  useEffect(() => {
    if (bidQty < minQty) setBidQty(minQty);
  }, [minQty]);

  if (!game) return null;

  const isMyTurn = game.currentPlayerId === mySocketId;
  const myPlayer = game.players.find((p) => p.id === mySocketId);
  // Quem reinicia a rodada é o perdedor (ou qualquer um, se ele foi eliminado).
  const loserId = game.lastReveal?.loserIds?.[0];
  const loser = game.players.find((p) => p.id === loserId);
  const loserActive = !!loser && !loser.isEliminated;
  const iCanRestart = !loserActive || loserId === mySocketId;
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
    nextRound(); // qualquer jogador pode iniciar a próxima rodada
  }

  // Adapta lastReveal para o formato do RevealOverlay (que espera PlayerState com dice[])
  const revealPlayers = game.players.map((p) => ({
    ...p,
    dice: [] as Face[], // dados não expostos publicamente
    tableDice: [] as Face[],
    usedPasso: false,
    usedMesa: false,
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
              {p.tableDice.length > 0 && (
                <View style={styles.tableDice}>
                  {p.tableDice.map((d, i) => (
                    <Die key={i} face={d} size={13} color={t.accent} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Meus dados */}
        {myPlayer && !myPlayer.isEliminated && (
          <View style={styles.myDice}>
            <Text style={styles.myDiceLabel}>Seus dados</Text>
            <View style={styles.diceRow}>
              {myDice.map((d, i) => <Die key={i} face={d} size={40} color={t.text} />)}
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

        {/* Dados na MESA (públicos a todos) */}
        {activePlayers.some((p) => p.tableDice.length > 0) && (
          <View style={styles.mesaPanel}>
            <Text style={styles.mesaPanelTitle}>🃏 Dados na Mesa</Text>
            {activePlayers.filter((p) => p.tableDice.length > 0).map((p) => (
              <View key={p.id} style={styles.mesaPanelRow}>
                <Text style={styles.mesaPanelName}>{p.name}</Text>
                <View style={styles.mesaPanelDice}>
                  {p.tableDice.map((d, i) => (
                    <Die key={i} face={d} size={32} color={t.text} />
                  ))}
                </View>
              </View>
            ))}
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
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setBidQty((q) => Math.max(minQty, q - 1))}>
                  <Text style={styles.pickerBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{bidQty}</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setBidQty((q) => q + 1)}>
                  <Text style={styles.pickerBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.facePicker}>
              {availableBidFaces(game.currentBid, game.rules.wildEnabled, game.palificoActive, game.faceBeforeBico).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.faceBtn, bidFace === f && styles.faceBtnActive]}
                  onPress={() => setBidFace(f)}
                >
                  <Die face={f} size={28} color={t.text} />
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

            {/* Regras especiais */}
            <View style={styles.specialRow}>
              {game.rules.passoEnabled && !myPlayer?.usedPasso && (
                <TouchableOpacity style={styles.specialBtn} onPress={passo}>
                  <Text style={styles.specialBtnText}>Passo</Text>
                </TouchableOpacity>
              )}
              {game.rules.mesaEnabled && !myPlayer?.usedMesa && (
                <TouchableOpacity style={styles.specialBtn} onPress={() => setShowMesa(true)}>
                  <Text style={styles.specialBtnText}>Mesa</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Dudar o Passo */}
        {isMyTurn && game.phase === 'bidding' && game.pendingPasso && game.pendingPasso.playerId !== mySocketId && (
          <TouchableOpacity style={styles.dudoPassoBtn} onPress={dudoPasso}>
            <Text style={styles.dudoBtnText}>DUDAR O PASSO de {game.players.find((p) => p.id === game.pendingPasso!.playerId)?.name}</Text>
          </TouchableOpacity>
        )}

        {game.hostId === mySocketId ? (
          <TouchableOpacity style={styles.leaveBtn} onPress={closeRoom}>
            <Text style={styles.leaveBtnText}>Encerrar sala</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.leaveBtn} onPress={() => { disconnect(); navigation.replace('Home'); }}>
            <Text style={styles.leaveBtnText}>Sair</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showReveal && game.lastReveal && (
        <RevealOverlay
          reveal={game.lastReveal}
          players={revealPlayers}
          palificoActive={game.palificoActive}
          onContinue={handleNextRound}
          waitingFor={iCanRestart ? undefined : loser?.name}
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

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 16, gap: 12 },
  roomBadge: { backgroundColor: t.surface, borderRadius: 8, padding: 8, alignItems: 'center' },
  roomBadgeText: { color: t.textMuted, fontSize: 13 },
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  playerChip: { backgroundColor: t.surface, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: t.border, minWidth: 80 },
  playerChipActive: { borderColor: t.accent, backgroundColor: t.surfaceActive },
  playerName: { color: t.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  playerStat: { color: t.textMuted, fontSize: 11, marginTop: 2 },
  tableDice: { flexDirection: 'row', gap: 3, marginTop: 2 },
  specialRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  specialBtn: { flex: 1, borderWidth: 1, borderColor: t.accent, borderRadius: t.radius, padding: 12, alignItems: 'center' },
  specialBtnDisabled: { opacity: 0.4 },
  specialBtnText: { color: t.accent, fontSize: 15, fontWeight: '700' },
  leaveBtn: { borderWidth: 1, borderColor: t.danger, borderRadius: t.radius, padding: 12, alignItems: 'center', marginTop: 12 },
  leaveBtnText: { color: t.danger, fontSize: 15 },
  dudoPassoBtn: { backgroundColor: t.danger, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  myDice: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16 },
  myDiceLabel: { color: t.accent, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  diceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  die: { fontSize: 40 },
  currentBid: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  currentBidLabel: { color: t.textMuted, fontSize: 13 },
  currentBidValue: { color: t.text, fontSize: 36, fontWeight: '900', marginTop: 4 },
  currentBidNone: { color: t.textMuted, fontSize: 18, marginTop: 4 },
  palificoBanner: { backgroundColor: t.surfaceActive, borderRadius: 8, padding: 10, alignItems: 'center' },
  palificoText: { color: t.accent, fontSize: 13, fontWeight: '700' },
  mesaPanel: { backgroundColor: t.surface, borderRadius: t.radius, padding: 14, borderWidth: 1, borderColor: t.accent },
  mesaPanelTitle: { color: t.accent, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  mesaPanelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  mesaPanelName: { color: t.text, fontSize: 14 },
  mesaPanelDice: { flexDirection: 'row', gap: 6 },
  waitBanner: { backgroundColor: t.surface, borderRadius: 8, padding: 14, alignItems: 'center' },
  waitText: { color: t.textMuted, fontSize: 16 },
  eliminatedBanner: { backgroundColor: t.surface, borderRadius: 8, padding: 14, alignItems: 'center' },
  eliminatedText: { color: t.danger, fontSize: 15 },
  actions: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16, gap: 12 },
  actionLabel: { color: t.accent, fontSize: 14, fontWeight: '700' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerLabel: { color: t.textMuted, fontSize: 14 },
  pickerButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pickerBtn: { backgroundColor: t.border, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pickerBtnText: { color: t.text, fontSize: 20, fontWeight: '700' },
  pickerValue: { color: t.text, fontSize: 22, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  facePicker: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  faceBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: t.border },
  faceBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  faceBtnText: { fontSize: 28 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  bidBtn: { flex: 1, backgroundColor: t.primary, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  bidBtnText: { color: t.text, fontSize: 16, fontWeight: '700' },
  dudoBtn: { flex: 1, backgroundColor: t.danger, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  dudoBtnText: { color: t.text, fontSize: 18, fontWeight: '900' },
});
