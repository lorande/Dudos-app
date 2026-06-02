import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettingsStore } from '../store/settingsStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  useEffect(() => { loadSettings(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.title}>DUDOS</Text>
        <Text style={styles.subtitle}>Jogo de Blefe</Text>
      </View>

      <View style={styles.buttons}>
        <MenuButton
          label="Modo Físico"
          emoji="🎲"
          onPress={() => navigation.navigate('OnlineLobby', { mode: 'physical' })}
        />
        <MenuButton
          label="Jogar Online"
          emoji="🌐"
          onPress={() => navigation.navigate('OnlineLobby', { mode: 'online' })}
        />
        <MenuButton
          label="Jogar com Bots"
          emoji="🤖"
          onPress={() => navigation.navigate('RuleConfig', { mode: 'local' })}
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
  settingsBtn: { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 8 },
  settingsIcon: { fontSize: 28 },
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
