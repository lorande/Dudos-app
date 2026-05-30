import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DUDOS</Text>
        <Text style={styles.subtitle}>Jogo de Blefe</Text>
      </View>

      <View style={styles.buttons}>
        <MenuButton
          label="Jogar Online"
          emoji="🌐"
          onPress={() => navigation.navigate('OnlineLobby')}
        />
        <MenuButton
          label="Jogar com Bots"
          emoji="🤖"
          onPress={() => navigation.navigate('RuleConfig', { mode: 'local' })}
        />
        <MenuButton
          label="Modo Físico"
          emoji="🎲"
          onPress={() => navigation.navigate('RuleConfig', { mode: 'physical' })}
        />
        <MenuButton
          label="Tutorial"
          emoji="📖"
          onPress={() => navigation.navigate('Tutorial')}
        />
        <MenuButton
          label="Regras"
          emoji="📜"
          onPress={() => navigation.navigate('Rules')}
        />
      </View>
    </SafeAreaView>
  );
}

function MenuButton({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.btnEmoji}>{emoji}</Text>
      <Text style={styles.btnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  header: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 64, fontWeight: '900', color: '#f5c518', letterSpacing: 8 },
  subtitle: { fontSize: 18, color: '#aaa', marginTop: 4 },
  buttons: { paddingHorizontal: 32, paddingBottom: 48, gap: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d1b4e',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#4a2e7a',
  },
  btnEmoji: { fontSize: 28 },
  btnLabel: { fontSize: 20, fontWeight: '700', color: '#fff' },
});
