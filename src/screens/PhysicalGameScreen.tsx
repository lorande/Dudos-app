import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  RuleConfig, Face, Bid, PlayerState, RevealResult, FaceCount,
  rollDice, initGame, bid, dudo, nextRound,
} from '../../packages/game-core/src';
import RevealOverlay from '../components/RevealOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'PhysicalGame'>;

const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function PhysicalGameScreen({ navigation, route }: Props) {
  const { rules, playerNames } = route.params;

  const [game, setGame] = useState(() =>
    initGame(
      rules,
      playerNames.map((name, i) => ({ id: `p${i}`, name, isBot: false }))
    )
  );
  const [bidQty, setBidQty] = useState(1);
  const [bidFace, setBidFace] = useState<Face>(2);
  const [showReveal, setShowReveal] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);

  // Modo físico: cada jogador "passa o celular" para ver seus dados em privado
  const [privateView, setPrivateView] = useState(true); // true = pedindo para passar o celular

  useEffect(() => {
    if (game.phase === 'game_over') {
      Alert.alert('Fim de Jogo!', `${game.players.find(p => p.id === game.winnerId)?.name} venceu!`, [
        { text: 'Menu', onPress: () => navigation.replace('Home') },
      ]);
    }
    if (game.phase === 'round_end') {
      setShowReveal(true);
    }
  }, [game.phase]);

  const activePlayers = game.players.filter((p) => !p.isEliminated);
  const currentPlayer = game.players[game.currentPlayerIndex];

  function handleDudo() {
    try {
      setGame((g) => dudo(g, currentPlayer.id));
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  function handleBid() {
    const newBid: Bid = { quantity: bidQty, face: bidFace };
    try {
      setGame((g) => bid(g, currentPlayer.id, newBid));
    } catch (e: any) {
      Alert.alert('Aposta inválida', e.message);
    }
  }

  function handleNextRound() {
    setShowReveal(false);
    setGame((g) => nextRound(g));
  }

  // Tela de "passe o celular para X ver seus dados"
  if (viewingPlayerId === null && privateView) {
    const nextViewer = activePlayers[0];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.passTitle}>Passe o celular para</Text>
          <Text style={styles.passName}>{nextViewer?.name}</Text>
          <Text style={styles.passSubtitle}>ver seus dados em privado</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => {
            setViewingPlayerId(nextViewer.id);
            setPrivateView(false);
          }}>
            <Text style={styles.startBtnText}>Ver meus dados 🎲</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Tela privada de um jogador específico
  if (viewingPlayerId !== null) {
    const viewer = game.players.find(p => p.id === viewingPlayerId)!;
    const viewerIndex = activePlayers.findIndex(p => p.id === viewingPlayerId);
    const isLast = viewerIndex >= activePlayers.length - 1;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.passTitle}>Dados de</Text>
          <Text style={styles.passName}>{viewer.name}</Text>
          <View style={styles.privateDice}>
            {viewer.dice.map((d, i) => (
              <Text key={i} style={styles.bigDie}>{DICE_FACE[d]}</Text>
            ))}
          </View>
          {rules.punishmentMode === 'lives' && (
            <Text style={styles.lives}>{'❤️'.repeat(viewer.lives)}</Text>
          )}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => {
              if (isLast) {
                setViewingPlayerId(null);
                setPrivateView(false);
              } else {
                const next = activePlayers[viewerIndex + 1];
                setViewingPlayerId(next.id);
              }
            }}
          >
            <Text style={styles.startBtnText}>
              {isLast ? 'Começar Rodada →' : `Passar para ${activePlayers[viewerIndex + 1]?.name}`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Mesa de jogo
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Jogadores */}
        <View style={styles.playersRow}>
          {activePlayers.map((p) => (
            <View
              key={p.id}
              style={[styles.playerChip, currentPlayer?.id === p.id && styles.playerChipActive]}
            >
              <Text style={styles.playerName}>{p.name}</Text>
              {rules.punishmentMode === 'lives' ? (
                <Text style={styles.playerStat}>{'❤️'.repeat(p.lives)}</Text>
              ) : (
                <Text style={styles.playerStat}>🎲×{p.dice.length}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Aposta atual */}
        <View style={styles.currentBid}>
          <Text style={styles.currentBidLabel}>Aposta atual</Text>
          {game.currentBid ? (
            <Text style={styles.currentBidValue}>
              {game.currentBid.quantity}× {DICE_FACE[game.currentBid.face]}
            </Text>
          ) : (
            <Text style={styles.currentBidNone}>Nenhuma ainda — {currentPlayer?.name} começa</Text>
          )}
        </View>

        {game.palificoActive && (
          <View style={styles.palificoBanner}>
            <Text style={styles.palificoText}>🔒 Palafico — sem coringa</Text>
          </View>
        )}

        {/* Ações — qualquer um pode apertar */}
        <View style={styles.actions}>
          <Text style={styles.actionLabel}>
            Vez de {currentPlayer?.name} — apostas em voz alta
          </Text>

          {/* Registrar aposta (botão para confirmar o que foi dito em voz alta) */}
          <Text style={styles.hint}>Registre a aposta feita em voz alta:</Text>

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
            {([2, 3, 4, 5, 6, ...(rules.wildEnabled && !game.palificoActive ? [1] : [])] as Face[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.faceBtn, bidFace === f && styles.faceBtnActive]}
                onPress={() => setBidFace(f)}
              >
                <Text style={styles.faceBtnText}>{DICE_FACE[f]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.bidBtn} onPress={handleBid}>
            <Text style={styles.bidBtnText}>Confirmar Aposta {bidQty}× {DICE_FACE[bidFace]}</Text>
          </TouchableOpacity>

          {game.currentBid && (
            <TouchableOpacity style={styles.dudoBtn} onPress={handleDudo}>
              <Text style={styles.dudoBtnText}>DUDAR! 🎯</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {showReveal && game.lastReveal && (
        <RevealOverlay
          reveal={game.lastReveal}
          players={game.players}
          palificoActive={game.palificoActive}
          onContinue={() => {
            handleNextRound();
            setPrivateView(true);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  passTitle: { color: '#aaa', fontSize: 18 },
  passName: { color: '#f5c518', fontSize: 36, fontWeight: '900' },
  passSubtitle: { color: '#888', fontSize: 15 },
  privateDice: { flexDirection: 'row', gap: 12, marginVertical: 16, flexWrap: 'wrap', justifyContent: 'center' },
  bigDie: { fontSize: 64 },
  lives: { fontSize: 24, marginBottom: 8 },
  startBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 12 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  playerChip: { backgroundColor: '#2d1b4e', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4a2e7a', minWidth: 80 },
  playerChipActive: { borderColor: '#f5c518', backgroundColor: '#3d2060' },
  playerName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  playerStat: { color: '#aaa', fontSize: 12, marginTop: 2 },
  currentBid: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, alignItems: 'center' },
  currentBidLabel: { color: '#aaa', fontSize: 13 },
  currentBidValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 },
  currentBidNone: { color: '#555', fontSize: 15, marginTop: 4, textAlign: 'center' },
  palificoBanner: { backgroundColor: '#3b0764', borderRadius: 8, padding: 10, alignItems: 'center' },
  palificoText: { color: '#c084fc', fontSize: 13, fontWeight: '700' },
  actions: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, gap: 12 },
  actionLabel: { color: '#f5c518', fontSize: 14, fontWeight: '700' },
  hint: { color: '#888', fontSize: 13 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerLabel: { color: '#aaa', fontSize: 14 },
  pickerButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pickerBtn: { backgroundColor: '#4a2e7a', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pickerBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  pickerValue: { color: '#fff', fontSize: 22, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  facePicker: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  faceBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#4a2e7a' },
  faceBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  faceBtnText: { fontSize: 30 },
  bidBtn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center' },
  bidBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dudoBtn: { backgroundColor: '#dc2626', borderRadius: 12, padding: 18, alignItems: 'center' },
  dudoBtnText: { color: '#fff', fontSize: 20, fontWeight: '900' },
});
