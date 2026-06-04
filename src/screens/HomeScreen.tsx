import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettingsStore, useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const t = useTheme();
  const s = makeStyles(t);
  useEffect(() => { loadSettings(); }, []);

  const Btn = ({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) => (
    <TouchableOpacity style={s.btn} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.btnEmoji}>{emoji}</Text>
      <Text style={s.btnLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>DUDOS</Text>
        <Text style={s.subtitle}>Jogo de Blefe</Text>
      </View>

      <View style={s.buttons}>
        <Btn label="Modo Físico" emoji="🎲" onPress={() => navigation.navigate('OnlineLobby', { mode: 'physical' })} />
        <Btn label="Jogar Online" emoji="🌐" onPress={() => navigation.navigate('OnlineLobby', { mode: 'online' })} />
        <Btn label="Jogar com Bots" emoji="🤖" onPress={() => navigation.navigate('RuleConfig', { mode: 'local' })} />
        <Btn label="Tutorial" emoji="📖" onPress={() => navigation.navigate('Tutorial')} />
        <Btn label="Regras" emoji="📜" onPress={() => navigation.navigate('Rules')} />
        <Btn label="Configurações" emoji="⚙️" onPress={() => navigation.navigate('Settings')} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 64, fontWeight: '900', color: t.accent, letterSpacing: 8 },
  subtitle: { fontSize: 18, color: t.textMuted, marginTop: 4 },
  buttons: { paddingHorizontal: 32, paddingBottom: 48, gap: 16 },
  btn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface,
    borderRadius: t.radius + 4, paddingVertical: 18, paddingHorizontal: 24, gap: 16,
    borderWidth: 1, borderColor: t.border,
  },
  btnEmoji: { fontSize: 28 },
  btnLabel: { fontSize: 20, fontWeight: '700', color: t.text },
});
