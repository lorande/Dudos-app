import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'OnlineResult'>;

export default function OnlineResultScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
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

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  trophy: { fontSize: 80 },
  result: { color: t.accent, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  ranking: { backgroundColor: t.surface, borderRadius: t.radius, padding: 20, width: '100%', gap: 8 },
  rankingTitle: { color: t.textMuted, fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankPos: { color: t.accent, fontSize: 18, fontWeight: '900', width: 32 },
  rankName: { color: t.text, fontSize: 18 },
  homeBtn: { backgroundColor: t.accent, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, marginTop: 8 },
  homeBtnText: { color: t.bg, fontSize: 18, fontWeight: '900' },
});
