import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_RULES, RuleConfig } from '../../packages/game-core/src';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';

export default function SettingsScreen() {
  const { templates, loadTemplates, saveTemplate, deleteTemplate } = useGameStore();
  const { soundEnabled, loadSettings, setSoundEnabled } = useSettingsStore();

  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    loadTemplates();
    loadSettings();
  }, []);

  function handleSave() {
    const name = templateName.trim();
    if (!name) { Alert.alert('Dê um nome ao template'); return; }
    saveTemplate(name, rules);
    setTemplateName('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Som */}
        <Section title="Som">
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Efeitos sonoros</Text>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ true: '#7c3aed' }} />
          </View>
        </Section>

        {/* Criar template de regras */}
        <Section title="Salvar Template de Regras">
          <Text style={styles.sub}>Configure as regras e salve com um nome para reutilizar nas partidas.</Text>

          <Text style={styles.label}>Modo de Punição</Text>
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

          <Text style={styles.label}>Regras Especiais</Text>
          <ToggleRow label="Palafico" value={rules.palificoEnabled} onChange={(v) => setRules((r) => ({ ...r, palificoEnabled: v }))} />
          <ToggleRow label="Passo" value={rules.passoEnabled} onChange={(v) => setRules((r) => ({ ...r, passoEnabled: v }))} />
          <ToggleRow label="Mesa" value={rules.mesaEnabled} onChange={(v) => setRules((r) => ({ ...r, mesaEnabled: v }))} />

          <Text style={styles.label}>Nome do template</Text>
          <TextInput
            style={styles.input}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="Ex.: Clássico, Rápido…"
            placeholderTextColor="#666"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar Template</Text>
          </TouchableOpacity>
        </Section>

        {/* Templates salvos */}
        <Section title={`Templates Salvos (${templates.length})`}>
          {templates.length === 0 && <Text style={styles.sub}>Nenhum template salvo ainda.</Text>}
          {templates.map((t) => (
            <View key={t.id} style={styles.templateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.templateName}>{t.name}</Text>
                <Text style={styles.templateDesc}>
                  {t.rules.punishmentMode === 'lives' ? 'Vidas' : 'Dados'}
                  {t.rules.palificoEnabled ? ' · Palafico' : ''}
                  {t.rules.passoEnabled ? ' · Passo' : ''}
                  {t.rules.mesaEnabled ? ' · Mesa' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteTemplate(t.id)}>
                <Text style={styles.deleteBtn}>Excluir</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Section>
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
  sub: { color: '#888', fontSize: 13, marginBottom: 10 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8, marginTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#4a2e7a' },
  chipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { color: '#aaa', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleLabel: { color: '#ddd', fontSize: 15, flex: 1, marginRight: 12 },
  input: { backgroundColor: '#1a0a2e', color: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#4a2e7a' },
  saveBtn: { backgroundColor: '#7c3aed', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  templateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0a2e', borderRadius: 8, padding: 12, marginBottom: 8, gap: 10 },
  templateName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  templateDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  deleteBtn: { color: '#f87171', fontSize: 14, fontWeight: '700' },
});
