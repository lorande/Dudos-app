import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GENERAL = [
  { title: '🎯 Objetivo', body: 'Ser o último jogador com vidas ou dados restantes.' },
  { title: '🎲 As faces (jargão)', body: 'Cada valor tem um nome: 1 = Bico (coringa), 2 = Duque, 3 = Terno, 4 = Quadra, 5 = Quina, 6 = Sena.' },
  { title: '📣 Aposta inicial', body: 'Quem abre a rodada é obrigado a apostar (não pode dudar de cara). A quantidade mínima de abertura é 2N−2 (N = número de jogadores). Abrindo em bico, o mínimo é N−1.' },
  { title: '⬆️ Apostas válidas', body: 'A aposta é válida somente se a quantidade for maior e/ou a face for maior. A face nunca pode diminuir.\n\nConverter para bico: aposte bicos em quantidade ≥ metade da quantidade atual, arredondado para cima (teto de X/2).\n\nSair do bico: para voltar a uma face normal, aposte pelo menos 2×Y+1 dessa face (Y = quantidade de bicos atual).' },
  { title: '🎯 Dudar', body: 'Se achar que a aposta é mentira, grite DUDAR! Todos revelam os dados e conta-se a face apostada (+ bicos, se ativos). Se houver dados suficientes, quem dudou perde; senão, quem apostou perde. Quem perde inicia a próxima rodada.' },
  { title: '⭐ Bico (coringa)', body: 'O bico (face 1) conta como qualquer face apostada, exceto: quando a aposta é no próprio bico, ou durante o Palafico.' },
  { title: '❤️ Modos de punição', body: 'Vidas: cada jogador começa com 3 vidas; ao perder, perde 1 vida.\nDados: começa com 5 dados; ao perder, perde 1 dado. Com 0, é eliminado.' },
];

const SPECIAL = [
  { title: '🔒 Palafico', body: 'Quando um jogador fica com apenas 1 dado (ou 1 vida, no modo Vidas), começa uma rodada Palafico: o bico NÃO conta como coringa (mas ainda pode ser apostado como face literal). A face fica travada — só dá para aumentar a quantidade. A aposta de abertura mínima nessa rodada é N−1.' },
  { title: '🟣 Passo', body: 'A qualquer momento (na sua vez) você pode declarar "Passo" — pula a vez e a aposta atual permanece. É um blefe: você está alegando ter todas as faces diferentes. Outro jogador pode dudar o Passo: se você realmente tiver todas as faces distintas, quem dudou perde a rodada; se tiver faces repetidas, você perde. 1× por rodada.' },
  { title: '🟢 Mesa', body: 'Escolha quantos dados quiser, revele-os na mesa (públicos, continuam contando) e re-sorteie os dados restantes — em seguida faça uma aposta. 1× por rodada. Usar a Mesa desabilita o Passo naquela rodada.' },
];

export default function RulesScreen() {
  const [open, setOpen] = useState<string | null>(null);

  const renderSection = (s: { title: string; body: string }, key: string) => (
    <TouchableOpacity
      key={key}
      style={styles.section}
      onPress={() => setOpen(open === key ? null : key)}
      activeOpacity={0.8}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{s.title}</Text>
        <Text style={styles.chevron}>{open === key ? '▲' : '▼'}</Text>
      </View>
      {open === key && <Text style={styles.sectionBody}>{s.body}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Regras do Dudos</Text>
        {GENERAL.map((s, i) => renderSection(s, `g${i}`))}

        <View style={styles.blockHeader}>
          <Text style={styles.blockHeaderText}>✨ Regras Especiais</Text>
          <Text style={styles.blockHeaderSub}>Ativáveis na configuração da partida</Text>
        </View>
        {SPECIAL.map((s, i) => renderSection(s, `s${i}`))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e' },
  scroll: { padding: 20, gap: 8 },
  header: { color: '#f5c518', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  section: { backgroundColor: '#2d1b4e', borderRadius: 12, padding: 16, gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chevron: { color: '#7c3aed', fontSize: 14 },
  sectionBody: { color: '#ccc', fontSize: 15, lineHeight: 24 },
  blockHeader: { marginTop: 16, marginBottom: 4, paddingHorizontal: 4 },
  blockHeaderText: { color: '#c084fc', fontSize: 18, fontWeight: '900' },
  blockHeaderSub: { color: '#888', fontSize: 13, marginTop: 2 },
});
