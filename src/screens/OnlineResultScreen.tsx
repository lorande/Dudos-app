import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOnlineGameStore } from '../store/onlineGameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'OnlineResult'>;

export default function OnlineResultScreen({ navigation }: Props) {
  const { game, mySocketId, disconnect } = useOnlineGameStore();

  if (!game) return null;

  const winner = game.players.find((p) => p.id === game.winnerId);
  const isMe = winner?.id === mySocketId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.trophy}>{isMe ? '🏆' : '💀'}</Text>
        <Text style={styles.result}>{isMe ? 'Você venceu!' : `${winner?.name} venceu!`}</Text>

        <View style={styles.ranking}>
          <Text style={styles.rankingTitle}>Classificação</Text>
          {game.players
            .slice()
            .sort((a, b) => {
              if (a.id === game.winnerId) return -1;
              if (b.id === game.winnerId) return 1;
              return 0;
            })
            .map((p, i) => (
              <View key={p.id} style={styles.rankRow}>
                <Text style={styles.rankPos}>{i + 1}º</Text>
                <Text style={styles.rankName}>
                  {p.name}{p.id === mySocketId ? ' (eu)' : ''}
                </Text>
              </View>
            ))}
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => { disconnect(); navigation.replace('Home'); }}
        >
          <Text style={styles.homeBtnText}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  trophy: { fontSize: 80 },
  result: { color: '#f5c518', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  ranking: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 20, width: '100%', gap: 8 },
  rankingTitle: { color: '#aaa', fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankPos: { color: '#f5c518', fontSize: 18, fontWeight: '900', width: 32 },
  rankName: { color: '#fff', fontSize: 18 },
  homeBtn: { backgroundColor: '#f5c518', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, marginTop: 8 },
  homeBtnText: { color: '#1a0a2e', fontSize: 18, fontWeight: '900' },
});
