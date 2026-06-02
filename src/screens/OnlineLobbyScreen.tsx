import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { DEFAULT_RULES } from '../../packages/game-core/src';
import { useGameStore } from '../store/gameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'OnlineLobby'>;

export default function OnlineLobbyScreen({ navigation, route }: Props) {
  const mode = route.params?.mode ?? 'online';
  const {
    roomCode, mySocketId, amHost, lobbyPlayers, pending, joinStatus, roomClosed, game, error,
    connect, createRoom, requestJoin, approve, reject, startGame, closeRoom, disconnect, clearError,
  } = useOnlineGameStore();
  const { templates, loadTemplates } = useGameStore();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedRules, setSelectedRules] = useState(DEFAULT_RULES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    connect();
    loadTemplates();
    // Não desconectar no unmount: ao iniciar a partida o lobby desmonta e
    // navega para a tela de jogo, que precisa do mesmo socket vivo.
    // A desconexão é feita explicitamente nos botões "Sair"/"Cancelar".
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Erro', error, [{ text: 'OK', onPress: clearError }]);
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    if (game?.phase === 'bidding' || game?.phase === 'round_end') {
      navigation.replace(game.mode === 'physical' ? 'PhysicalGame' : 'OnlineGame');
    }
  }, [game?.phase]);

  useEffect(() => {
    if (roomClosed) {
      Alert.alert('Sala encerrada', 'A sala foi encerrada pelo host.');
      disconnect();
      navigation.navigate('Home');
    }
  }, [roomClosed]);

  const isHost = amHost;
  const title = mode === 'physical' ? 'Modo Físico' : 'Jogar Online';

  // Tela de espera de aprovação (solicitante)
  if (!roomCode && joinStatus === 'waiting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#f5c518" size="large" />
          <Text style={styles.waitBig}>Aguardando aprovação do criador da sala…</Text>
          <TouchableOpacity style={styles.leaveBtn} onPress={() => { disconnect(); navigation.goBack(); }}>
            <Text style={styles.leaveBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!roomCode && joinStatus === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.waitBig}>Entrada recusada pelo criador da sala.</Text>
          <TouchableOpacity style={styles.leaveBtn} onPress={() => { disconnect(); navigation.goBack(); }}>
            <Text style={styles.leaveBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (roomCode) {
    // Lobby da sala (já aprovado / criador)
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.codeLabel}>Código da sala ({title})</Text>
          <Text style={styles.code}>{roomCode}</Text>
          <Text style={styles.hint}>Compartilhe este código com seus amigos</Text>

          <Text style={styles.sectionTitle}>Jogadores ({lobbyPlayers.length})</Text>
          {lobbyPlayers.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <Text style={styles.playerName}>{p.name}</Text>
              {game?.hostId === p.id && <Text style={styles.hostBadge}>HOST</Text>}
            </View>
          ))}

          {/* Fila de aprovação (somente host) */}
          {isHost && pending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Pedidos de entrada</Text>
              {pending.map((p) => (
                <View key={p.id} style={styles.playerRow}>
                  <Text style={styles.playerName}>{p.name}</Text>
                  <TouchableOpacity onPress={() => approve(p.id)}>
                    <Text style={styles.approve}>Aprovar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => reject(p.id)}>
                    <Text style={styles.reject}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {isHost && lobbyPlayers.length >= 2 && (
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>Iniciar Partida →</Text>
            </TouchableOpacity>
          )}
          {isHost && lobbyPlayers.length < 2 && (
            <Text style={styles.waitText}>Aguardando mais jogadores…</Text>
          )}
          {!isHost && <Text style={styles.waitText}>Aguardando o host iniciar…</Text>}

          {isHost ? (
            <TouchableOpacity style={styles.leaveBtn} onPress={closeRoom}>
              <Text style={styles.leaveBtnText}>Encerrar sala (todos saem)</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.leaveBtn} onPress={() => { disconnect(); navigation.goBack(); }}>
              <Text style={styles.leaveBtnText}>Sair da sala</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.tabs}>
          {(['create', 'join'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'create' ? 'Criar Sala' : 'Entrar na Sala'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Seu nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome"
          placeholderTextColor="#666"
          maxLength={20}
        />

        {tab === 'join' && (
          <>
            <Text style={styles.label}>Código da sala</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase())}
              placeholder="XXXXXX"
              placeholderTextColor="#666"
              maxLength={6}
              autoCapitalize="characters"
            />
          </>
        )}

        {tab === 'create' && templates.length > 0 && (
          <>
            <Text style={styles.label}>Regras (template)</Text>
            <View style={styles.templateList}>
              {templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templateChip,
                    JSON.stringify(selectedRules) === JSON.stringify(t.rules) && styles.templateChipActive,
                  ]}
                  onPress={() => setSelectedRules(t.rules)}
                >
                  <Text style={styles.templateChipText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.actionBtn}
          disabled={loading || !name.trim()}
          onPress={() => {
            if (!name.trim()) { Alert.alert('Digite seu nome'); return; }
            setLoading(true);
            if (tab === 'create') createRoom(name.trim(), selectedRules, mode);
            else {
              if (!joinCode.trim() || joinCode.length !== 6) {
                Alert.alert('Código inválido'); setLoading(false); return;
              }
              requestJoin(joinCode.trim(), name.trim());
            }
          }}
        >
          {loading
            ? <ActivityIndicator color="#1a0a2e" />
            : <Text style={styles.actionBtnText}>{tab === 'create' ? 'Criar Sala' : 'Pedir Entrada'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  scroll: { padding: 24, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  title: { color: '#f5c518', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  waitBig: { color: '#fff', fontSize: 18, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#2d1b4e', borderRadius: 12, marginBottom: 8 },
  tab: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  label: { color: '#aaa', fontSize: 13, marginBottom: 4 },
  input: { backgroundColor: '#2d1b4e', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#4a2e7a', fontSize: 16 },
  codeInput: { fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 8 },
  templateList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4a2e7a' },
  templateChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  templateChipText: { color: '#fff', fontSize: 14 },
  actionBtn: { backgroundColor: '#f5c518', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  actionBtnText: { color: '#1a0a2e', fontSize: 18, fontWeight: '900' },
  codeLabel: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  code: { color: '#f5c518', fontSize: 52, fontWeight: '900', textAlign: 'center', letterSpacing: 10 },
  hint: { color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  sectionTitle: { color: '#f5c518', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d1b4e', borderRadius: 10, padding: 14, gap: 10 },
  playerName: { flex: 1, color: '#fff', fontSize: 16 },
  hostBadge: { color: '#f5c518', fontSize: 11, fontWeight: '700', borderWidth: 1, borderColor: '#f5c518', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  approve: { color: '#4ade80', fontSize: 14, fontWeight: '700' },
  reject: { color: '#f87171', fontSize: 14, fontWeight: '700' },
  startBtn: { backgroundColor: '#f5c518', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  startBtnText: { color: '#1a0a2e', fontSize: 18, fontWeight: '900' },
  waitText: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 16 },
  leaveBtn: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  leaveBtnText: { color: '#dc2626', fontSize: 15 },
});
