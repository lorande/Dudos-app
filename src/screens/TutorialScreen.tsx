import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../store/settingsStore';
import { Theme } from '../theme/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'Tutorial'>;

const STEPS = [
  {
    emoji: '🎲',
    title: 'Bem-vindo ao Dudos!',
    body: 'Dudos é um jogo de blefe com dados. Cada jogador recebe dados secretos e faz apostas sobre o total de dados na mesa. O objetivo é ser o último sobrevivente!',
  },
  {
    emoji: '🤫',
    title: 'Seus dados são secretos',
    body: 'Só você vê os seus dados. Cada rodada começa com todos lançando seus dados em privado. Você precisa adivinhar o que os outros têm!',
  },
  {
    emoji: '📣',
    title: 'Como apostar',
    body: 'Na sua vez, aposte uma quantidade e uma face: por exemplo "3 quatros" significa que você acredita que existem pelo menos 3 dados com a face ⚄ na mesa (incluindo os seus e dos outros).\n\nCada aposta deve ser maior que a anterior: mais quantidade OU mesma quantidade com face maior.',
  },
  {
    emoji: '🎯',
    title: 'Como dudar',
    body: 'Se você achar que a aposta anterior é mentira, grite DUDAR!\n\nTodos revelam seus dados. Se havia dados suficientes da face apostada → quem duvidou perde. Se não havia → quem apostou perde.\n\nLembre: o coringa ★ (face 1) conta para qualquer face!',
  },
  {
    emoji: '⚠️',
    title: 'Palafico',
    body: 'Quando um jogador fica com apenas 1 dado, uma rodada especial começa: o Palafico!\n\nNessa rodada, o coringa não conta — só a face literal vale. Preste atenção!',
  },
  {
    emoji: '🏆',
    title: 'Fim de Jogo',
    body: 'Quem perde uma rodada perde 1 vida ou 1 dado (dependendo do modo). Quando zerar, é eliminado.\n\nO último jogador de pé vence. Boa sorte!',
  },
];

export default function TutorialScreen({ navigation }: Props) {
  const t = useTheme();
  const styles = makeStyles(t);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      {/* Indicadores */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.nav}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
            <Text style={styles.backBtnText}>← Anterior</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { flex: step > 0 ? 1 : undefined, width: step === 0 ? '100%' : undefined }]}
          onPress={() => isLast ? navigation.goBack() : setStep((s) => s + 1)}
        >
          <Text style={styles.nextBtnText}>{isLast ? 'Pronto!' : 'Próximo →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  emoji: { fontSize: 72 },
  title: { color: t.accent, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  body: { color: t.text, fontSize: 16, lineHeight: 26, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.border },
  dotActive: { backgroundColor: t.accent, width: 20 },
  nav: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 32 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  backBtnText: { color: t.textMuted, fontSize: 16 },
  nextBtn: { backgroundColor: t.primary, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  nextBtnText: { color: t.text, fontSize: 16, fontWeight: '700' },
});
