import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DEFAULT_RULES, RuleConfig } from '../../packages/game-core/src';
import { useGameStore, RuleTemplate } from '../store/gameStore';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'RuleConfig'>;

const TIMER_OPTIONS = [
  { label: 'Sem timer', value: null },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

export default function RuleConfigScreen({ navigation, route }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
  const { mode } = route.params;
  const { templates, loadTemplates, deleteTemplate } = useGameStore();

  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);
  const [humanName, setHumanName] = useState('Jogador');
  const [botCount, setBotCount] = useState(1);
  const [playerCount, setPlayerCount] = useState(4); // modo físico
  const [playerNames, setPlayerNames] = useState<string[]>(['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4']);

  useEffect(() => { loadTemplates(); }, []);

  function applyTemplate(tpl: RuleTemplate) {
    // Mescla com os padrões para garantir todos os campos (toggles + punição).
    setRules({ ...DEFAULT_RULES, ...tpl.rules });
  }

  function handleStart() {
    // RuleConfig é usado apenas para o jogo local com bots.
    // O Modo Físico agora é multiplayer em rede (via OnlineLobby).
    navigation.navigate('Game', { rules, humanName, botCount });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Templates */}
        {templates.length > 0 && (
          <Section t={t} title="Templates Salvos">
            {templates.map((tpl) => (
              <View key={tpl.id} style={styles.templateRow}>
                <Text style={styles.templateName}>{tpl.name}</Text>
                <TouchableOpacity style={styles.applyBtn} onPress={() => applyTemplate(tpl)}>
                  <Text style={styles.applyBtnText}>Aplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTemplate(tpl.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Section>
        )}

        {/* Modo de punição */}
        <Section t={t} title="Modo de Punição">
          <View style={styles.row}>
            {(['lives', 'dice'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, rules.punishmentMode === m && styles.chipActive]}
                onPress={() => setRules((r) => ({ ...r, punishmentMode: m }))}
              >
                <Text style={[styles.chipText, rules.punishmentMode === m && styles.chipTextActive]}>
                  {m === 'lives' ? '❤️ Vidas (3)' : '🎲 Dados (5)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section t={t} title="Regras Especiais">
          <ToggleRow
            t={t}
            label="Palafico (1 dado → rodada sem coringa)"
            value={rules.palificoEnabled}
            onChange={(v) => setRules((r) => ({ ...r, palificoEnabled: v }))}
          />
          <ToggleRow
            t={t}
            label="Passo (pular a vez com 5 dados distintos)"
            value={rules.passoEnabled}
            onChange={(v) => setRules((r) => ({ ...r, passoEnabled: v }))}
          />
          <ToggleRow
            t={t}
            label="Mesa (revelar dados e re-sortear)"
            value={rules.mesaEnabled}
            onChange={(v) => setRules((r) => ({ ...r, mesaEnabled: v }))}
          />
        </Section>

        {/* Timer */}
        <Section t={t} title="Timer por jogada">
          <View style={styles.row}>
            {TIMER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[styles.chip, rules.turnTimerSeconds === opt.value && styles.chipActive]}
                onPress={() => setRules((r) => ({ ...r, turnTimerSeconds: opt.value }))}
              >
                <Text style={[styles.chipText, rules.turnTimerSeconds === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Jogadores */}
        {mode === 'local' && (
          <Section t={t} title="Jogadores">
            <Text style={styles.label}>Seu nome</Text>
            <TextInput
              style={styles.input}
              value={humanName}
              onChangeText={setHumanName}
              placeholder="Nome"
              placeholderTextColor={t.textMuted}
            />
            <Text style={styles.label}>Número de bots: {botCount}</Text>
            <View style={styles.row}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, botCount === n && styles.chipActive]}
                  onPress={() => setBotCount(n)}
                >
                  <Text style={[styles.chipText, botCount === n && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        )}

        {mode === 'physical' && (
          <Section t={t} title="Jogadores">
            <Text style={styles.label}>Número de jogadores: {playerCount}</Text>
            <View style={styles.row}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, playerCount === n && styles.chipActive]}
                  onPress={() => {
                    setPlayerCount(n);
                    setPlayerNames(Array.from({ length: n }, (_, i) => `Jogador ${i + 1}`));
                  }}
                >
                  <Text style={[styles.chipText, playerCount === n && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {playerNames.map((name, i) => (
              <TextInput
                key={i}
                style={styles.input}
                value={name}
                onChangeText={(v) => setPlayerNames((arr) => arr.map((a, j) => (j === i ? v : a)))}
                placeholder={`Jogador ${i + 1}`}
                placeholderTextColor={t.textMuted}
              />
            ))}
          </Section>
        )}

        <Text style={styles.tip}>💡 Crie e gerencie templates de regras em Configurações (⚙️ na tela inicial).</Text>

        <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>Iniciar Jogo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ t, title, children }: { t: Theme; title: string; children: React.ReactNode }) {
  const styles = makeStyles(t);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ t, label, value, onChange }: { t: Theme; label: string; value: boolean; onChange: (v: boolean) => void }) {
  const styles = makeStyles(t);
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.primary }} />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, gap: 8 },
  tip: { color: t.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  section: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16, marginBottom: 12 },
  sectionTitle: { color: t.accent, fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: t.border },
  chipActive: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { color: t.textMuted, fontSize: 14 },
  chipTextActive: { color: t.text, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleLabel: { color: t.text, fontSize: 14, flex: 1, marginRight: 12 },
  label: { color: t.textMuted, fontSize: 13, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: t.bg, color: t.text, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: t.border },
  templateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: t.bg, borderRadius: 8, padding: 10, gap: 10 },
  templateName: { color: t.text, fontSize: 15, flex: 1 },
  applyBtn: { backgroundColor: t.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  applyBtnText: { color: t.text, fontSize: 14, fontWeight: '700' },
  deleteBtn: { color: t.danger, fontSize: 18, paddingHorizontal: 8 },
  secondaryBtn: { borderWidth: 1, borderColor: t.border, borderRadius: t.radius, padding: 14, alignItems: 'center', marginBottom: 8 },
  secondaryBtnText: { color: t.textMuted, fontSize: 15 },
  templateSave: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16, marginBottom: 8 },
  saveBtn: { backgroundColor: t.primary, borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: t.text, fontWeight: '700', fontSize: 15 },
  startBtn: { backgroundColor: t.accent, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  startBtnText: { color: t.bg, fontSize: 20, fontWeight: '900' },
});
