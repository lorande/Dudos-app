import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

const SECTIONS = [
  { title: '🎯 Objetivo', body: 'Ser o último jogador com vidas ou dados restantes.' },
  { title: '🎲 As faces (jargão)', body: 'Cada valor tem um nome: 1 = Bico (coringa), 2 = Duque, 3 = Terno, 4 = Quadra, 5 = Quina, 6 = Sena.' },
  { title: '📣 Aposta inicial', body: 'Quem abre a rodada é obrigado a apostar (não pode dudar de cara). A quantidade mínima de abertura é 2N−2 (N = número de jogadores). Abrindo em bico, o mínimo é N−1.' },
  { title: '⬆️ Apostas válidas', body: 'A aposta é válida somente se a quantidade for maior e/ou a face for maior.\n\nConverter para bico: aposte bicos em quantidade ≥ metade da quantidade atual, arredondado para cima (teto de X/2).\n\nSair do bico: para voltar a uma face normal, aposte pelo menos 2×Y+1 dessa face (Y = quantidade de bicos atual).' },
  { title: '🎯 Dudar', body: 'Se achar que a aposta é mentira, grite DUDAR! Todos revelam os dados e conta-se a face apostada (+ bicos, se ativos). Se houver dados suficientes, quem dudou perde; senão, quem apostou perde.' },
  { title: '⭐ Bico (coringa)', body: 'O bico (face 1) conta como qualquer face apostada, exceto: quando a aposta é no próprio bico, ou durante o Palafico.' },
  { title: '🔒 Palafico', body: 'Quando um jogador fica com apenas 1 dado (ou 1 vida, no modo Vidas), começa uma rodada Palafico: o bico NÃO conta, só a face literal vale. A aposta de abertura mínima nessa rodada é N−1.' },
  { title: '🟣 Passo', body: 'Na sua vez, se você tiver 5 dados distintos, pode declarar "Passo": você pula a vez e a aposta atual permanece. O Passo pode ser dudado pelo próximo jogador — se você realmente tiver 5 distintos, quem duvidou perde; senão, você perde. 1× por rodada.' },
  { title: '🟢 Mesa', body: 'Na sua vez, você pode escolher quantos dados quiser, revelá-los na mesa (públicos, continuam contando) e re-sortear os dados restantes — e em seguida faz uma aposta. 1× por rodada. Usar a Mesa desabilita o Passo naquela rodada.' },
  { title: '❤️ Modos de punição', body: 'Vidas: cada jogador começa com 3 vidas; ao perder, perde 1 vida.\nDados: começa com 5 dados; ao perder, perde 1 dado. Com 0, é eliminado.' },
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
