import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

const SECTIONS = [
  {
    title: '🎯 Objetivo',
    body: 'Ser o último jogador com vidas ou dados restantes. Todos os outros devem ser eliminados.',
  },
  {
    title: '🎲 Preparação',
    body: 'Cada jogador recebe dados (padrão: 5) ou vidas (padrão: 3). Todos lançam seus dados em segredo — ninguém vê os dados dos outros.',
  },
  {
    title: '📣 Rodada',
    body: 'O primeiro jogador faz uma aposta: quantidade e face (ex: "3 cincos"). O próximo deve fazer uma aposta maior ou dudar. A rodada continua até alguém dudar.',
  },
  {
    title: '⬆️ Apostas válidas',
    body: 'Uma aposta é maior quando:\n• A quantidade é maior, OU\n• A quantidade é igual e a face é maior.\n\nExemplo: "2 doses" → pode ser "3 doses", "3 ases", "2 treses", etc.',
  },
  {
    title: '🎯 Dudar',
    body: 'Qualquer jogador pode dudar na sua vez. Todos revelam os dados.\n\nContam-se os dados da face apostada (+ coringas, se ativos).\n\n• Contagem ≥ aposta → quem dudou perde\n• Contagem < aposta → quem apostou perde',
  },
  {
    title: '★ Coringa',
    body: 'A face 1 (estrela ★) é coringa e conta como qualquer face apostada, exceto quando:\n• A aposta é na própria face 1 (conta literalmente)\n• O modo Palafico está ativo (coringa desativado na rodada)',
  },
  {
    title: '🔒 Palafico',
    body: 'Quando qualquer jogador fica com apenas 1 dado, uma rodada Palafico começa:\n• O coringa NÃO conta\n• Somente a face literal é válida\n• A restrição vale apenas nessa rodada',
  },
  {
    title: '❤️ Modos de punição',
    body: 'Modo Vidas: cada jogador começa com 3 vidas. Ao perder, perde 1 vida.\n\nModo Dados: cada jogador começa com 5 dados. Ao perder, perde 1 dado. Com 0 dados, é eliminado.',
  },
];

export default function RulesScreen() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Regras do Dudos</Text>
        {SECTIONS.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.section}
            onPress={() => setOpen(open === i ? null : i)}
            activeOpacity={0.8}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.chevron}>{open === i ? '▲' : '▼'}</Text>
            </View>
            {open === i && <Text style={styles.sectionBody}>{s.body}</Text>}
          </TouchableOpacity>
        ))}
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
});
