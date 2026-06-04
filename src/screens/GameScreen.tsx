import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGameStore } from '../store/gameStore';
import { Face, Bid, availableBidFaces, minBidQuantity } from '../../packages/game-core/src';
import MesaSelector from '../components/MesaSelector';
import RevealOverlay from '../components/RevealOverlay';
import AnimatedDie from '../components/AnimatedDie';
import AnimatedBidBanner from '../components/AnimatedBidBanner';
import Die from '../components/Die';
import { useSoundAndHaptics } from '../hooks/useSoundAndHaptics';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function GameScreen({ navigation, route }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
  const { rules, humanName, botCount } = route.params;
  const { game, startLocalGame, playerBid, playerDudo, advanceRound, runBotsIfNeeded, resetGame, playerPasso, playerMesa, playerDudoPasso } = useGameStore();

  const [bidQty, setBidQty] = useState(1);
  const [bidFace, setBidFace] = useState<Face>(2);
  const [showReveal, setShowReveal] = useState(false);
  const [showMesa, setShowMesa] = useState(false);
  const [diceAnim, setDiceAnim] = useState<'roll' | 'none'>('none');
  const sfx = useSoundAndHaptics();

  useEffect(() => {
    startLocalGame(rules, humanName, botCount);
    setDiceAnim('roll');
  }, []);

  useEffect(() => {
    if (!game) return;
    if (game.phase === 'game_over') {
      navigation.replace('Result');
      return;
    }
    if (game.phase === 'round_end') {
      setShowReveal(true);
      return;
    }
    runBotsIfNeeded();
  }, [game?.phase, game?.currentPlayerIndex]);

  // Garante que a face selecionada continua válida quando a aposta atual muda.
  useEffect(() => {
    if (!game) return;
    const faces = availableBidFaces(game.currentBid, rules.wildEnabled, game.palificoActive, game.faceBeforeBico);
    if (!faces.includes(bidFace)) setBidFace(faces[0]);
  }, [game?.currentBid?.quantity, game?.currentBid?.face, game?.palificoActive]);

  // Quantidade mínima conforme a face escolhida (não permite abaixar).
  const activeCount = game ? game.players.filter((p) => !p.isEliminated).length : 0;
  const minQty = game ? minBidQuantity(game.currentBid, bidFace, activeCount, game.palificoActive) : 1;
  useEffect(() => {
    if (bidQty < minQty) setBidQty(minQty);
  }, [minQty]);

  if (!game) return null;

  const human = game.players.find((p) => p.id === 'human')!;
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === 'human';
  const active = game.players.filter((p) => !p.isEliminated);

  function handleBid() {
    const newBid: Bid = { quantity: bidQty, face: bidFace };
    sfx.placeBid();
    playerBid('human', newBid);
  }

  function handleDudo() {
    sfx.callDudo();
    playerDudo('human');
  }

  function handlePasso() { sfx.placeBid(); playerPasso('human'); }
  function handleDudoPasso() { sfx.callDudo(); playerDudoPasso('human'); }
  function handleMesaConfirm(indexes: number[]) {
    setShowMesa(false);
    sfx.rollDice();
    playerMesa('human', indexes);
  }

  function handleNextRound() {
    setShowReveal(false);
    setDiceAnim('roll');
    sfx.rollDice();
    advanceRound();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Status jogadores */}
        <View style={styles.playersRow}>
          {active.map((p) => (
            <View
              key={p.id}
              style={[styles.playerChip, game.players[game.currentPlayerIndex]?.id === p.id && styles.playerChipActive]}
            >
              <Text style={styles.playerName}>{p.name}</Text>
              {rules.punishmentMode === 'lives' ? (
                <Text style={styles.playerStat}>{'❤️'.repeat(p.lives)}</Text>
              ) : (
                <Text style={styles.playerStat}>🎲×{p.dice.length}</Text>
              )}
              {p.tableDice.length > 0 && (
                <View style={styles.tableDice}>
                  {p.tableDice.map((d, i) => (
                    <Die key={i} face={d} size={14} color={t.accent} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Dados do humano */}
        {!human.isEliminated && (
          <View style={styles.myDice}>
            <Text style={styles.myDiceLabel}>Seus dados</Text>
            <View style={styles.diceRow}>
              {human.dice.map((d, i) => (
                <AnimatedDie
                  key={`${game.roundNumber}-${i}`}
                  face={d}
                  size={40}
                  animate={diceAnim}
                  delay={i * 80}
                />
              ))}
            </View>
          </View>
        )}

        {/* Aposta atual */}
        <View style={styles.currentBid}>
          <Text style={styles.currentBidLabel}>Aposta atual</Text>
          {game.currentBid
            ? <AnimatedBidBanner bid={game.currentBid} />
            : <Text style={styles.currentBidNone}>Nenhuma ainda</Text>
          }
        </View>

        {/* Palafico */}
        {game.palificoActive && (
          <View style={styles.palificoBanner}>
            <Text style={styles.palificoText}>🔒 Palafico ativo — sem coringa</Text>
          </View>
        )}

        {/* Turno */}
        {!isMyTurn && (
          <View style={styles.waitingBanner}>
            <Text style={styles.waitingText}>Aguardando {currentPlayer?.name}…</Text>
          </View>
        )}

        {/* Ações do humano */}
        {isMyTurn && game.phase === 'bidding' && (
          <View style={styles.actions}>
            <Text style={styles.actionLabel}>Sua vez — faça uma aposta</Text>

            {/* Quantidade */}
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

            {/* Face */}
            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>Face</Text>
              <View style={styles.facePicker}>
                {availableBidFaces(game.currentBid, rules.wildEnabled, game.palificoActive, game.faceBeforeBico).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.faceBtn, bidFace === f && styles.faceBtnActive]}
                    onPress={() => setBidFace(f)}
                  >
                    <Die face={f} size={28} color={t.text} />
                  </TouchableOpacity>
                ))}
              </View>
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

            <View style={styles.specialRow}>
              {game.rules.passoEnabled && !human.usedPasso && (
                <TouchableOpacity style={styles.specialBtn} onPress={handlePasso}>
                  <Text style={styles.specialBtnText}>Passo</Text>
                </TouchableOpacity>
              )}
              {game.rules.mesaEnabled && !human.usedMesa && (
                <TouchableOpacity style={styles.specialBtn} onPress={() => setShowMesa(true)}>
                  <Text style={styles.specialBtnText}>Mesa</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {isMyTurn && game.phase === 'bidding' && game.pendingPasso && game.pendingPasso.playerId !== 'human' && (
          <TouchableOpacity style={styles.dudoPassoBtn} onPress={handleDudoPasso}>
            <Text style={styles.dudoBtnText}>DUDAR O PASSO de {game.players.find(p => p.id === game.pendingPasso!.playerId)?.name}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Overlay de revelação */}
      {showReveal && game.lastReveal && (
        <RevealOverlay
          reveal={game.lastReveal}
          players={game.players}
          palificoActive={game.palificoActive}
          onContinue={handleNextRound}
        />
      )}

      <MesaSelector
        visible={showMesa}
        dice={human.dice}
        onCancel={() => setShowMesa(false)}
        onConfirm={handleMesaConfirm}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 16, gap: 12 },
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  playerChip: { backgroundColor: t.surface, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: t.border, minWidth: 80 },
  playerChipActive: { borderColor: t.accent, backgroundColor: t.surfaceActive },
  playerName: { color: t.text, fontSize: 12, fontWeight: '700' },
  playerStat: { color: t.textMuted, fontSize: 12, marginTop: 2 },
  myDice: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16 },
  myDiceLabel: { color: t.accent, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  diceRow: { flexDirection: 'row', gap: 10 },
  die: { fontSize: 40 },
  currentBid: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  currentBidLabel: { color: t.textMuted, fontSize: 13 },
  currentBidNone: { color: t.textMuted, fontSize: 18, marginTop: 4 },
  palificoBanner: { backgroundColor: t.surfaceActive, borderRadius: 8, padding: 10, alignItems: 'center' },
  palificoText: { color: t.accent, fontSize: 13, fontWeight: '700' },
  waitingBanner: { backgroundColor: t.surface, borderRadius: 8, padding: 14, alignItems: 'center' },
  waitingText: { color: t.textMuted, fontSize: 16 },
  actions: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16, gap: 12 },
  actionLabel: { color: t.accent, fontSize: 14, fontWeight: '700' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerLabel: { color: t.textMuted, fontSize: 14 },
  pickerButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pickerBtn: { backgroundColor: t.border, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pickerBtnText: { color: t.text, fontSize: 20, fontWeight: '700' },
  pickerValue: { color: t.text, fontSize: 22, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  facePicker: { flexDirection: 'row', gap: 8 },
  faceBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: t.border },
  faceBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  faceBtnText: { fontSize: 28 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  bidBtn: { flex: 1, backgroundColor: t.primary, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  bidBtnText: { color: t.text, fontSize: 16, fontWeight: '700' },
  dudoBtn: { flex: 1, backgroundColor: t.danger, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  dudoBtnText: { color: t.text, fontSize: 18, fontWeight: '900' },
  specialRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  specialBtn: { flex: 1, borderWidth: 1, borderColor: t.accent, borderRadius: t.radius, padding: 12, alignItems: 'center' },
  specialBtnText: { color: t.accent, fontSize: 15, fontWeight: '700' },
  specialBtnDisabled: { opacity: 0.4 },
  dudoPassoBtn: { backgroundColor: t.danger, borderRadius: t.radius, padding: 16, alignItems: 'center', marginTop: 8 },
  tableDice: { flexDirection: 'row', gap: 3, marginTop: 2 },
});
