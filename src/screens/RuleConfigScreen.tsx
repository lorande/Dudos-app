import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, TextInput, Alert, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DEFAULT_RULES, RuleConfig } from '../../packages/game-core/src';
import { useGameStore, RuleTemplate } from '../store/gameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'RuleConfig'>;

const TIMER_OPTIONS = [
  { label: 'Sem timer', value: null },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

export default function RuleConfigScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const { templates, loadTemplates, saveTemplate, deleteTemplate } = useGameStore();

  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);
  const [humanName, setHumanName] = useState('Jogador');
  const [botCount, setBotCount] = useState(1);
  const [playerCount, setPlayerCount] = useState(4); // modo físico
  const [playerNames, setPlayerNames] = useState<string[]>(['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4']);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  function applyTemplate(t: RuleTemplate) {
    setRules(t.rules);
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) { Alert.alert('Nome obrigatório'); return; }
    saveTemplate(templateName.trim(), rules);
    setTemplateName('');
    setShowSaveTemplate(false);
  }

  function handleStart() {
    if (mode === 'local') {
      navigation.navigate('Game', { rules, humanName, botCount });
    } else {
      const names = playerNames.slice(0, playerCount);
      navigation.navigate('PhysicalGame', { rules, playerNames: names });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Templates */}
        {templates.length > 0 && (
          <Section title="Templates Salvos">
            {templates.map((t) => (
              <View key={t.id} style={styles.templateRow}>
                <TouchableOpacity style={styles.templateBtn} onPress={() => applyTemplate(t)}>
                  <Text style={styles.templateName}>{t.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTemplate(t.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Section>
        )}

        {/* Modo de punição */}
        <Section title="Modo de Punição">
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

        {/* Opções */}
        <Section title="Regras">
          <ToggleRow
            label="Coringa ativo (★ conta para qualquer face)"
            value={rules.wildEnabled}
            onChange={(v) => setRules((r) => ({ ...r, wildEnabled: v }))}
          />
          <ToggleRow
            label="Variante Palafico"
            value={rules.palificoEnabled}
            onChange={(v) => setRules((r) => ({ ...r, palificoEnabled: v }))}
          />
          <ToggleRow
            label="Revelar dados entre rodadas"
            value={rules.revealBetweenRounds}
            onChange={(v) => setRules((r) => ({ ...r, revealBetweenRounds: v }))}
          />
        </Section>

        {/* Timer */}
        <Section title="Timer por jogada">
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
          <Section title="Jogadores">
            <Text style={styles.label}>Seu nome</Text>
            <TextInput
              style={styles.input}
              value={humanName}
              onChangeText={setHumanName}
              placeholder="Nome"
              placeholderTextColor="#666"
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
          <Section title="Jogadores">
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
                placeholderTextColor="#666"
              />
            ))}
          </Section>
        )}

        {/* Salvar template */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setShowSaveTemplate((s) => !s)}
        >
          <Text style={styles.secondaryBtnText}>💾 Salvar como template</Text>
        </TouchableOpacity>

        {showSaveTemplate && (
          <View style={styles.templateSave}>
            <TextInput
              style={styles.input}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Nome do template"
              placeholderTextColor="#666"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTemplate}>
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>Iniciar Jogo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#7c3aed' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  scroll: { padding: 20, gap: 8 },
  section: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { color: '#f5c518', fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4a2e7a' },
  chipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { color: '#aaa', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleLabel: { color: '#ddd', fontSize: 14, flex: 1, marginRight: 12 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#1a0a2e', color: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#4a2e7a' },
  templateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  templateBtn: { flex: 1, backgroundColor: '#1a0a2e', borderRadius: 8, padding: 10 },
  templateName: { color: '#fff', fontSize: 15 },
  deleteBtn: { color: '#f87171', fontSize: 18, paddingHorizontal: 12 },
  secondaryBtn: { borderWidth: 1, borderColor: '#4a2e7a', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  secondaryBtnText: { color: '#aaa', fontSize: 15 },
  templateSave: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, marginBottom: 8 },
  saveBtn: { backgroundColor: '#7c3aed', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  startBtn: { backgroundColor: '#f5c518', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  startBtnText: { color: '#1a0a2e', fontSize: 20, fontWeight: '900' },
});
