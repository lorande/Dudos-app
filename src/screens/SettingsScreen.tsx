import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_RULES, RuleConfig } from '../../packages/game-core/src';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore, useTheme } from '../store/settingsStore';
import { THEMES, Theme, DiceStyle } from '../theme/themes';
import Die from '../components/Die';

const DICE_OPTIONS: { id: DiceStyle; label: string }[] = [
  { id: 'symbol', label: 'Símbolos' },
  { id: 'pips', label: 'Pontinhos' },
  { id: 'colored', label: 'Coloridos' },
];

export default function SettingsScreen() {
  const t = useTheme();
  const s = makeStyles(t);
  const { templates, loadTemplates, saveTemplate, deleteTemplate } = useGameStore();
  const { soundEnabled, themeId, diceStyle, loadSettings, setSoundEnabled, setThemeId, setDiceStyle } = useSettingsStore();

  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => { loadTemplates(); loadSettings(); }, []);

  function handleSave() {
    const name = templateName.trim();
    if (!name) { Alert.alert('Dê um nome ao template'); return; }
    saveTemplate(name, rules);
    setTemplateName('');
  }

  function handleUpdate() {
    if (typeof window !== 'undefined' && window.location?.reload) window.location.reload();
    else Alert.alert('Atualizar', 'Feche e reabra o app para atualizar.');
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Tema */}
        <Section t={t} title="Tema (cores)">
          <View style={s.row}>
            {THEMES.map((th) => (
              <TouchableOpacity
                key={th.id}
                style={[s.themeChip, { backgroundColor: th.surface, borderColor: themeId === th.id ? th.accent : th.border }]}
                onPress={() => setThemeId(th.id)}
              >
                <View style={[s.swatch, { backgroundColor: th.primary }]} />
                <View style={[s.swatch, { backgroundColor: th.accent }]} />
                <Text style={[s.themeName, { color: th.text }]}>{th.name}</Text>
                {themeId === th.id && <Text style={[s.check, { color: th.accent }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Estilo dos dados */}
        <Section t={t} title="Estilo dos Dados">
          <View style={s.row}>
            {DICE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[s.diceChip, diceStyle === opt.id && { borderColor: t.accent, backgroundColor: t.surfaceActive }]}
                onPress={() => setDiceStyle(opt.id)}
              >
                {/* Prévia: força o estilo localmente não dá; mostra com o estilo atual */}
                <Text style={[s.diceLabel, { color: diceStyle === opt.id ? t.accent : t.textMuted }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.dicePreview}>
            <Die face={5} size={44} color={t.text} />
            <Die face={3} size={44} color={t.text} />
            <Die face={1} size={44} color={t.accent} />
          </View>
        </Section>

        {/* Som */}
        <Section t={t} title="Som">
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Efeitos sonoros</Text>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ true: t.primary }} />
          </View>
        </Section>

        {/* Atualizar */}
        <Section t={t} title="Aplicativo">
          <Text style={s.sub}>Recarrega o app para obter a versão mais recente.</Text>
          <TouchableOpacity style={s.saveBtn} onPress={handleUpdate}>
            <Text style={s.saveBtnText}>🔄 Atualizar</Text>
          </TouchableOpacity>
        </Section>

        {/* Templates de regras */}
        <Section t={t} title="Salvar Template de Regras">
          <Text style={s.sub}>Configure as regras e salve com um nome para reutilizar nas partidas.</Text>

          <Text style={s.label}>Modo de Punição</Text>
          <View style={s.row}>
            {(['lives', 'dice'] as const).map((m) => (
              <TouchableOpacity key={m} style={[s.chip, rules.punishmentMode === m && s.chipActive]} onPress={() => setRules((r) => ({ ...r, punishmentMode: m }))}>
                <Text style={[s.chipText, rules.punishmentMode === m && s.chipTextActive]}>{m === 'lives' ? '❤️ Vidas (3)' : '🎲 Dados (5)'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Regras Especiais</Text>
          <ToggleRow t={t} label="Palafico" value={rules.palificoEnabled} onChange={(v) => setRules((r) => ({ ...r, palificoEnabled: v }))} />
          <ToggleRow t={t} label="Passo" value={rules.passoEnabled} onChange={(v) => setRules((r) => ({ ...r, passoEnabled: v }))} />
          <ToggleRow t={t} label="Mesa" value={rules.mesaEnabled} onChange={(v) => setRules((r) => ({ ...r, mesaEnabled: v }))} />

          <Text style={s.label}>Nome do template</Text>
          <TextInput style={s.input} value={templateName} onChangeText={setTemplateName} placeholder="Ex.: Clássico, Rápido…" placeholderTextColor={t.textMuted} />
          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Text style={s.saveBtnText}>Salvar Template</Text>
          </TouchableOpacity>
        </Section>

        <Section t={t} title={`Templates Salvos (${templates.length})`}>
          {templates.length === 0 && <Text style={s.sub}>Nenhum template salvo ainda.</Text>}
          {templates.map((tpl) => (
            <View key={tpl.id} style={s.templateRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.templateName}>{tpl.name}</Text>
                <Text style={s.templateDesc}>
                  {tpl.rules.punishmentMode === 'lives' ? 'Vidas' : 'Dados'}
                  {tpl.rules.palificoEnabled ? ' · Palafico' : ''}{tpl.rules.passoEnabled ? ' · Passo' : ''}{tpl.rules.mesaEnabled ? ' · Mesa' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteTemplate(tpl.id)}><Text style={s.deleteBtn}>Excluir</Text></TouchableOpacity>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ t, title, children }: { t: Theme; title: string; children: React.ReactNode }) {
  const s = makeStyles(t);
  return (<View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>);
}

function ToggleRow({ t, label, value, onChange }: { t: Theme; label: string; value: boolean; onChange: (v: boolean) => void }) {
  const s = makeStyles(t);
  return (<View style={s.toggleRow}><Text style={s.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ true: t.primary }} /></View>);
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, gap: 8 },
  section: { backgroundColor: t.surface, borderRadius: t.radius, padding: 16, marginBottom: 12 },
  sectionTitle: { color: t.accent, fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  sub: { color: t.textMuted, fontSize: 13, marginBottom: 10 },
  label: { color: t.textMuted, fontSize: 13, marginBottom: 8, marginTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: t.border },
  chipActive: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { color: t.textMuted, fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  themeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
  swatch: { width: 16, height: 16, borderRadius: 4 },
  themeName: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  check: { fontSize: 16, fontWeight: '900', marginLeft: 2 },
  diceChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: t.border },
  diceLabel: { fontSize: 14, fontWeight: '600' },
  dicePreview: { flexDirection: 'row', gap: 12, marginTop: 14, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleLabel: { color: t.text, fontSize: 15, flex: 1, marginRight: 12 },
  input: { backgroundColor: t.bg, color: t.text, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  saveBtn: { backgroundColor: t.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  templateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 8, padding: 12, marginBottom: 8, gap: 10 },
  templateName: { color: t.text, fontSize: 15, fontWeight: '700' },
  templateDesc: { color: t.textMuted, fontSize: 12, marginTop: 2 },
  deleteBtn: { color: t.danger, fontSize: 14, fontWeight: '700' },
});
