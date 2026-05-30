# Dudos — Plano 2: UI local, textos e bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor as regras avançadas (já no motor) no cliente **local**: textos/jargão na RulesScreen, os 3 toggles de Regras Especiais na configuração, botões Passo/Mesa no jogo com bots, componentes compartilhados e correção do bot para apostar conforme as novas regras.

**Architecture:** Reusa as funções e constantes do `game-core` (já implementadas no Plano 1). Cria componentes de UI compartilhados (`FacePicker`, `PlayerChip`, `DiceRow`) que leem `DICE_FACE`/`FACE_NAMES` do `game-core`, eliminando duplicação. O Modo Físico em rede, o servidor e o Passo/Mesa **online** ficam para o Plano 3 — aqui só o caminho local (bots) é ligado de ponta a ponta.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, Zustand, Jest (para o bot).

**Spec:** `docs/superpowers/specs/2026-05-29-dudos-regras-avancadas-design.md`
**Depende de:** Plano 1 (motor) já mesclado no master.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `jest.config.js` (modificar) | incluir `src` nos roots para testar o bot |
| `src/bots/adaptiveBot.ts` (modificar) | apostas válidas sob novas regras (abertura mínima, bico, tableDice) |
| `src/bots/__tests__/adaptiveBot.test.ts` (criar) | testes do bot |
| `src/components/DiceRow.tsx` (criar) | linha de dados (usa DICE_FACE) |
| `src/components/PlayerChip.tsx` (criar) | chip de jogador (vidas/dados + tableDice) |
| `src/components/FacePicker.tsx` (criar) | seletor de face (respeita palafico/wild) |
| `src/components/MesaSelector.tsx` (criar) | modal de seleção de dados para a Mesa |
| `src/screens/RulesScreen.tsx` (modificar) | jargão + apostas válidas + Regras Especiais |
| `src/screens/RuleConfigScreen.tsx` (modificar) | seção "Regras Especiais" (3 toggles) |
| `src/screens/GameScreen.tsx` (modificar) | botões Passo/Mesa/Dudar Passo, tableDice |
| `src/store/gameStore.ts` (modificar) | ações `playerPasso`, `playerMesa`, `playerDudoPasso` |

---

## Task 1: Habilitar testes do bot no Jest

**Files:**
- Modify: `jest.config.js`

- [ ] **Step 1: Incluir `src` nos roots do Jest**

Substituir o conteúdo de `jest.config.js` por:
```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/game-core', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

- [ ] **Step 2: Rodar a suíte atual (não deve quebrar)**

Run: `npm test`
Expected: PASS (os 21 testes do motor continuam passando; nenhum teste novo em `src` ainda).

- [ ] **Step 3: Commit**

```bash
git add jest.config.js
git commit -m "test: include src in jest roots for bot tests"
```

---

## Task 2: Corrigir o bot para as novas regras (TDD)

**Context:** Sob as novas regras, a aposta de abertura precisa ter quantidade ≥ `minOpeningQuantity(N, face)` (2N-2 normal, N-1 bico), e o incremento de aposta precisa respeitar `isBidHigher` (inclusive transições para/de bico). O bot também deve contar `dice + tableDice`. Hoje, na abertura, o bot gera quantidade pequena e o motor lança erro → o turno trava.

**Files:**
- Modify: `src/bots/adaptiveBot.ts`
- Test: `src/bots/__tests__/adaptiveBot.test.ts`

- [ ] **Step 1: Escrever testes falhando**

Create `src/bots/__tests__/adaptiveBot.test.ts`:
```ts
import { botDecide } from '../adaptiveBot';
import { initGame, isBidHigher, minOpeningQuantity } from '../../../packages/game-core/src';
import { DEFAULT_RULES, GameState } from '../../../packages/game-core/src';

function gameWith(botDice: number[][]): GameState {
  const g = initGame(DEFAULT_RULES, [
    { id: 'bot_0', name: 'B0', isBot: true },
    { id: 'bot_1', name: 'B1', isBot: true },
    { id: 'bot_2', name: 'B2', isBot: true },
    { id: 'bot_3', name: 'B3', isBot: true },
  ]);
  return {
    ...g,
    players: g.players.map((p, i) => ({ ...p, dice: botDice[i] as any })),
  };
}

describe('bot respeita regras de aposta', () => {
  it('abertura tem quantidade >= minimo (2N-2)', () => {
    const g = gameWith([[2, 2, 3, 4, 5], [1, 1, 1, 1, 1], [6, 6, 6, 2, 3], [4, 4, 5, 5, 6]]);
    const decision = botDecide({ ...g, currentBid: null, currentPlayerIndex: 0 }, 'bot_0', 0);
    expect(decision.action).toBe('bid');
    if (decision.action === 'bid') {
      const min = minOpeningQuantity(4, decision.bid.face);
      expect(decision.bid.quantity).toBeGreaterThanOrEqual(min);
    }
  });

  it('aposta de continuação é estritamente maior (isBidHigher)', () => {
    const g = gameWith([[2, 2, 3, 4, 5], [1, 1, 1, 1, 1], [6, 6, 6, 2, 3], [4, 4, 5, 5, 6]]);
    const current = { quantity: 6, face: 3 as const };
    const decision = botDecide({ ...g, currentBid: current, currentPlayerIndex: 0 }, 'bot_0', 0);
    if (decision.action === 'bid') {
      expect(isBidHigher(current, decision.bid)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL no teste de abertura (quantidade abaixo do mínimo).

- [ ] **Step 3: Implementar correções no bot**

Em `src/bots/adaptiveBot.ts`:

a) Importar a função de mínimo:
```ts
import { Bid, Face, GameState, isBidHigher, minOpeningQuantity } from '../../packages/game-core/src';
```

b) Em `botDecide`, contar `dice + tableDice` no total e passar o `activeCount`/`currentBid` para `formulateBid`. Trocar a linha de `totalDice`:
```ts
  const totalDice = active.reduce((s, p) => s + p.dice.length + p.tableDice.length, 0);
  const activeCount = active.length;
```
E a chamada de formulação:
```ts
  const newBid = formulateBid(currentBid, [...bot.dice, ...bot.tableDice], totalDice, p, level, state.palificoActive, activeCount);
```

c) Atualizar a assinatura e o corpo de `formulateBid` para garantir validade:
```ts
function formulateBid(
  current: Bid | null,
  myDice: Face[],
  totalDice: number,
  p: number,
  level: BotLevel,
  palificoActive: boolean,
  activeCount: number
): Bid {
  const faces: Face[] = palificoActive ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of myDice) counts[d]++;

  let bestFace: Face = faces[Math.floor(Math.random() * faces.length)];
  if (level >= 2) {
    bestFace = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as unknown as Face;
    if (palificoActive && (bestFace as unknown as number) === 1) bestFace = faces[1];
  }

  const myCount = counts[bestFace as unknown as number] ?? 0;
  const estimatedOthers = Math.round(p * (totalDice - myDice.length));
  let quantity = Math.max(1, myCount + estimatedOthers);
  if (level === 1) quantity = Math.max(1, quantity + Math.floor((Math.random() - 0.3) * 2));

  // Abertura: respeita o mínimo 2N-2 / N-1
  if (!current) {
    const min = minOpeningQuantity(activeCount, bestFace);
    return { quantity: Math.max(quantity, min), face: bestFace };
  }

  // Continuação: garante que é estritamente maior
  let candidate: Bid = { quantity, face: bestFace };
  if (isBidHigher(current, candidate)) return candidate;

  // Sobe quantidade até virar válida (limite de segurança)
  for (let q = current.quantity; q <= current.quantity + totalDice + 2; q++) {
    candidate = { quantity: q, face: bestFace };
    if (isBidHigher(current, candidate)) return candidate;
  }
  // Fallback final: +1 na quantidade da face atual
  return { quantity: current.quantity + 1, face: current.face };
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS (incluindo os 2 novos testes do bot e os 21 do motor).

- [ ] **Step 5: Commit**

```bash
git add src/bots/adaptiveBot.ts src/bots/__tests__/adaptiveBot.test.ts
git commit -m "fix(bot): valid opening minimum and bid increments under new rules"
```

---

## Task 3: Componentes compartilhados (DiceRow, PlayerChip, FacePicker)

**Files:**
- Create: `src/components/DiceRow.tsx`
- Create: `src/components/PlayerChip.tsx`
- Create: `src/components/FacePicker.tsx`

- [ ] **Step 1: Criar `DiceRow.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DICE_FACE, Face } from '../../packages/game-core/src';

export default function DiceRow({ dice, size = 40, dim = false }: { dice: Face[]; size?: number; dim?: boolean }) {
  return (
    <View style={styles.row}>
      {dice.map((d, i) => (
        <Text key={i} style={[{ fontSize: size }, dim && styles.dim]}>{DICE_FACE[d]}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dim: { opacity: 0.5 },
});
```

- [ ] **Step 2: Criar `PlayerChip.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DICE_FACE, Face, PunishmentMode } from '../../packages/game-core/src';

interface Props {
  name: string;
  lives: number;
  diceCount: number;
  tableDice?: Face[];
  punishmentMode: PunishmentMode;
  active?: boolean;
  me?: boolean;
}

export default function PlayerChip({ name, lives, diceCount, tableDice = [], punishmentMode, active, me }: Props) {
  return (
    <View style={[styles.chip, active && styles.active]}>
      <Text style={styles.name}>{name}{me ? ' (eu)' : ''}</Text>
      {punishmentMode === 'lives'
        ? <Text style={styles.stat}>{'❤️'.repeat(lives)}</Text>
        : <Text style={styles.stat}>🎲×{diceCount}</Text>}
      {tableDice.length > 0 && (
        <Text style={styles.table}>{tableDice.map((d) => DICE_FACE[d]).join(' ')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { backgroundColor: '#2d1b4e', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4a2e7a', minWidth: 80 },
  active: { borderColor: '#f5c518', backgroundColor: '#3d2060' },
  name: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  stat: { color: '#aaa', fontSize: 12, marginTop: 2 },
  table: { color: '#c084fc', fontSize: 14, marginTop: 2 },
});
```

- [ ] **Step 3: Criar `FacePicker.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DICE_FACE, Face } from '../../packages/game-core/src';

interface Props {
  value: Face;
  onChange: (f: Face) => void;
  allowBico: boolean; // false em palafico ou wild desativado
}

export default function FacePicker({ value, onChange, allowBico }: Props) {
  const faces: Face[] = [2, 3, 4, 5, 6, ...(allowBico ? [1] as Face[] : [])];
  return (
    <View style={styles.row}>
      {faces.map((f) => (
        <TouchableOpacity key={f} style={[styles.btn, value === f && styles.active]} onPress={() => onChange(f)}>
          <Text style={styles.die}>{DICE_FACE[f]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4a2e7a' },
  active: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  die: { fontSize: 28 },
});
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiceRow.tsx src/components/PlayerChip.tsx src/components/FacePicker.tsx
git commit -m "feat(ui): shared DiceRow, PlayerChip, FacePicker components"
```

---

## Task 4: MesaSelector (modal de seleção de dados)

**Files:**
- Create: `src/components/MesaSelector.tsx`

- [ ] **Step 1: Criar `MesaSelector.tsx`**

```tsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DICE_FACE, Face } from '../../packages/game-core/src';

interface Props {
  visible: boolean;
  dice: Face[];
  onCancel: () => void;
  onConfirm: (indexes: number[]) => void;
}

export default function MesaSelector({ visible, dice, onCancel, onConfirm }: Props) {
  const [selected, setSelected] = useState<number[]>([]);

  function toggle(i: number) {
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Mesa</Text>
          <Text style={styles.subtitle}>Toque nos dados que vai revelar na mesa. Os demais serão re-sorteados.</Text>
          <View style={styles.diceRow}>
            {dice.map((d, i) => (
              <TouchableOpacity key={i} style={[styles.die, selected.includes(i) && styles.selected]} onPress={() => toggle(i)}>
                <Text style={styles.dieText}>{DICE_FACE[d]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={() => { setSelected([]); onCancel(); }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirm} onPress={() => { const s = selected; setSelected([]); onConfirm(s); }}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#2d1b4e', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  title: { color: '#f5c518', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#aaa', fontSize: 14, textAlign: 'center', marginVertical: 12 },
  diceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  die: { padding: 8, borderRadius: 10, borderWidth: 2, borderColor: '#4a2e7a' },
  selected: { borderColor: '#f5c518', backgroundColor: '#3d2060' },
  dieText: { fontSize: 40 },
  actions: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1, borderWidth: 1, borderColor: '#4a2e7a', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelText: { color: '#aaa', fontSize: 15 },
  confirm: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/MesaSelector.tsx
git commit -m "feat(ui): MesaSelector modal for choosing dice to reveal"
```

---

## Task 5: Ações de Passo/Mesa no gameStore

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: Importar as novas ações do motor**

No import de `../../packages/game-core/src`, acrescentar `passo`, `mesa`, `dudoPasso`:
```ts
import {
  GameState, RuleConfig, DEFAULT_RULES, initGame, bid, dudo, nextRound, Bid,
  passo, mesa, dudoPasso,
} from '../../packages/game-core/src';
```

- [ ] **Step 2: Adicionar as ações na interface `GameStore`**

Acrescentar à interface (perto de `playerDudo`):
```ts
  playerPasso: (playerId: string) => void;
  playerMesa: (playerId: string, indexes: number[]) => void;
  playerDudoPasso: (playerId: string) => void;
```

- [ ] **Step 3: Implementar as ações no store**

Após `playerDudo`, adicionar:
```ts
  playerPasso: (playerId) => {
    const { game } = get();
    if (!game) return;
    try { set({ game: passo(game, playerId) }); } catch (e) { console.warn(e); }
  },

  playerMesa: (playerId, indexes) => {
    const { game } = get();
    if (!game) return;
    try { set({ game: mesa(game, playerId, indexes) }); } catch (e) { console.warn(e); }
  },

  playerDudoPasso: (playerId) => {
    const { game } = get();
    if (!game) return;
    try { set({ game: dudoPasso(game, playerId) }); } catch (e) { console.warn(e); }
  },
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): playerPasso, playerMesa, playerDudoPasso actions"
```

---

## Task 6: Botões Passo/Mesa/Dudar Passo na GameScreen

**Files:**
- Modify: `src/screens/GameScreen.tsx`

**Context:** A GameScreen já tem o seletor de aposta e usa `DICE_FACE`. Vamos: (a) trocar a linha de dados/face picker pelos componentes compartilhados (opcional mas recomendado), (b) adicionar os botões **Passo** e **Mesa** na área de ação do humano, (c) adicionar o botão **Dudar Passo** quando houver `pendingPasso` e for a vez do humano, (d) exibir `tableDice` no chip e os dados do humano via `DiceRow`. Importar `hasFiveDistinct` do motor e o `MesaSelector`.

- [ ] **Step 1: Imports**

No topo de `GameScreen.tsx`, garantir:
```ts
import { Face, Bid, hasFiveDistinct } from '../../packages/game-core/src';
import MesaSelector from '../components/MesaSelector';
```
E do store, extrair as novas ações:
```ts
  const { game, startLocalGame, playerBid, playerDudo, advanceRound, runBotsIfNeeded, resetGame, playerPasso, playerMesa, playerDudoPasso } = useGameStore();
```

- [ ] **Step 2: Estado do seletor de Mesa**

Adicionar perto dos outros `useState`:
```ts
  const [showMesa, setShowMesa] = useState(false);
```

- [ ] **Step 3: Handlers**

Adicionar:
```ts
  function handlePasso() { sfx.placeBid(); playerPasso('human'); }
  function handleDudoPasso() { sfx.callDudo(); playerDudoPasso('human'); }
  function handleMesaConfirm(indexes: number[]) {
    setShowMesa(false);
    sfx.rollDice();
    playerMesa('human', indexes);
  }
```

- [ ] **Step 4: Botões na área de ação do humano**

Dentro do bloco `isMyTurn && game.phase === 'bidding'`, logo após os `actionButtons` de Apostar/Dudar, adicionar uma linha de regras especiais:
```tsx
            <View style={styles.specialRow}>
              {game.rules.passoEnabled && hasFiveDistinct(human) && !human.usedPasso && (
                <TouchableOpacity style={styles.specialBtn} onPress={handlePasso}>
                  <Text style={styles.specialBtnText}>Passo</Text>
                </TouchableOpacity>
              )}
              {game.rules.mesaEnabled && !human.usedMesa && (
                <TouchableOpacity style={styles.specialBtn} onPress={() => setShowMesa(true)}>
                  <Text style={styles.specialBtnText}>Mesa</Text>
                </TouchableOpacity>
              )}
            </View>
```

- [ ] **Step 5: Botão "Dudar Passo"**

Logo abaixo do bloco de ações, adicionar (quando há Passo pendente e é a vez do humano):
```tsx
        {isMyTurn && game.phase === 'bidding' && game.pendingPasso && game.pendingPasso.playerId !== 'human' && (
          <TouchableOpacity style={styles.dudoPassoBtn} onPress={handleDudoPasso}>
            <Text style={styles.dudoBtnText}>DUDAR O PASSO de {game.players.find(p => p.id === game.pendingPasso!.playerId)?.name}</Text>
          </TouchableOpacity>
        )}
```

- [ ] **Step 6: MesaSelector no final do JSX**

Antes do fechamento de `</SafeAreaView>`, junto ao RevealOverlay:
```tsx
      <MesaSelector
        visible={showMesa}
        dice={human.dice}
        onCancel={() => setShowMesa(false)}
        onConfirm={handleMesaConfirm}
      />
```

- [ ] **Step 7: Exibir tableDice no chip de jogador**

No `playerChip`, após a linha de vidas/dados, adicionar:
```tsx
              {p.tableDice.length > 0 && (
                <Text style={styles.tableDice}>{p.tableDice.map((d) => DICE_FACE[d]).join(' ')}</Text>
              )}
```

- [ ] **Step 8: Estilos**

Adicionar ao StyleSheet:
```ts
  specialRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  specialBtn: { flex: 1, borderWidth: 1, borderColor: '#c084fc', borderRadius: 12, padding: 12, alignItems: 'center' },
  specialBtnText: { color: '#c084fc', fontSize: 15, fontWeight: '700' },
  dudoPassoBtn: { backgroundColor: '#dc2626', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  tableDice: { color: '#c084fc', fontSize: 14, marginTop: 2 },
```

- [ ] **Step 9: Verificar compilação e bundle**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npx expo export --platform android --dev`
Expected: "Exported: dist".

- [ ] **Step 10: Commit**

```bash
git add src/screens/GameScreen.tsx
git commit -m "feat(ui): Passo, Mesa and Dudar Passo controls in local game"
```

---

## Task 7: Seção "Regras Especiais" na configuração

**Files:**
- Modify: `src/screens/RuleConfigScreen.tsx`

**Context:** A tela já tem uma `Section` "Regras" com `ToggleRow` para wildEnabled, palificoEnabled e revealBetweenRounds. Vamos separar Palafico/Passo/Mesa em uma seção "Regras Especiais".

- [ ] **Step 1: Adicionar a seção**

Após a `Section title="Regras"` existente, adicionar:
```tsx
        <Section title="Regras Especiais">
          <ToggleRow
            label="Palafico (1 dado → rodada sem coringa)"
            value={rules.palificoEnabled}
            onChange={(v) => setRules((r) => ({ ...r, palificoEnabled: v }))}
          />
          <ToggleRow
            label="Passo (pular a vez com 5 dados distintos)"
            value={rules.passoEnabled}
            onChange={(v) => setRules((r) => ({ ...r, passoEnabled: v }))}
          />
          <ToggleRow
            label="Mesa (revelar dados e re-sortear)"
            value={rules.mesaEnabled}
            onChange={(v) => setRules((r) => ({ ...r, mesaEnabled: v }))}
          />
        </Section>
```

- [ ] **Step 2: Remover o toggle de Palafico da seção "Regras" antiga**

Na `Section title="Regras"`, remover a `ToggleRow` de "Variante Palafico" (agora vive em Regras Especiais). Manter wildEnabled e revealBetweenRounds.

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/RuleConfigScreen.tsx
git commit -m "feat(config): Regras Especiais section with Palafico/Passo/Mesa toggles"
```

---

## Task 8: Reescrever a RulesScreen com jargão e regras novas

**Files:**
- Modify: `src/screens/RulesScreen.tsx`

- [ ] **Step 1: Substituir o array `SECTIONS`**

Trocar o array `SECTIONS` por:
```ts
const SECTIONS = [
  { title: '🎯 Objetivo', body: 'Ser o último jogador com vidas ou dados restantes.' },
  { title: '🎲 As faces (jargão)', body: 'Cada valor tem um nome: 1 = Bico (coringa), 2 = Duque, 3 = Terno, 4 = Quadra, 5 = Quina, 6 = Sena.' },
  { title: '📣 Aposta inicial', body: 'Quem abre a rodada é obrigado a apostar (não pode dudar de cara). A quantidade mínima de abertura é 2N−2 (N = número de jogadores). Abrindo em bico, o mínimo é N−1.' },
  { title: '⬆️ Apostas válidas', body: 'A aposta é válida somente se a quantidade for maior e/ou a face for maior.\n\nConverter para bico: aposte bicos em quantidade ≥ metade da quantidade atual, arredondado para cima (teto de X/2).\n\nSair do bico: para voltar a uma face normal, aposte pelo menos 2×Y+1 dessa face (Y = quantidade de bicos atual).' },
  { title: '🎯 Dudar', body: 'Se achar que a aposta é mentira, grite DUDAR! Todos revelam os dados e conta-se a face apostada (+ bicos, se ativos). Se houver dados suficientes, quem dudou perde; senão, quem apostou perde.' },
  { title: '⭐ Bico (coringa)', body: 'O bico (face 1) conta como qualquer face apostada, exceto: quando a aposta é no próprio bico, ou durante o Palafico.' },
  { title: '🔒 Palafico', body: 'Quando um jogador fica com apenas 1 dado, começa uma rodada Palafico: o bico NÃO conta, só a face literal vale.' },
  { title: '🟣 Passo', body: 'Na sua vez, se você tiver 5 dados distintos, pode declarar "Passo": você pula a vez e a aposta atual permanece. O Passo pode ser dudado pelo próximo jogador — se você realmente tiver 5 distintos, quem duvidou perde; senão, você perde. 1× por rodada.' },
  { title: '🟢 Mesa', body: 'Na sua vez, você pode escolher quantos dados quiser, revelá-los na mesa (públicos, continuam contando) e re-sortear os dados restantes — e em seguida faz uma aposta. 1× por rodada. Usar a Mesa desabilita o Passo naquela rodada.' },
  { title: '❤️ Modos de punição', body: 'Vidas: cada jogador começa com 3 vidas; ao perder, perde 1 vida.\nDados: começa com 5 dados; ao perder, perde 1 dado. Com 0, é eliminado.' },
];
```

- [ ] **Step 2: Verificar compilação e bundle**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npx expo export --platform android --dev`
Expected: "Exported: dist".

- [ ] **Step 3: Commit**

```bash
git add src/screens/RulesScreen.tsx
git commit -m "docs(ui): rewrite RulesScreen with jargon and advanced rules"
```

---

## Task 9: Verificação final

- [ ] **Step 1: Suíte completa**

Run: `npm test`
Expected: PASS (21 do motor + 2 do bot).

- [ ] **Step 2: Typecheck e bundle**

Run: `npx tsc --noEmit` → PASS
Run: `npx expo export --platform android --dev` → "Exported: dist"

- [ ] **Step 3: Verificação manual (Expo Go)**

Iniciar `npx expo start --tunnel --clear`, abrir no Expo Go e validar:
- Configurar regras: a seção "Regras Especiais" mostra Palafico/Passo/Mesa.
- Jogar com Bots: a partida abre sem travar (bot aposta acima do mínimo de abertura).
- Quando o humano tem 5 dados distintos, o botão **Passo** aparece; após usar, some.
- O botão **Mesa** abre o seletor; ao confirmar, os dados escolhidos aparecem no chip e os demais são re-sorteados.
- A tela **Regras** mostra o jargão e as Regras Especiais.

- [ ] **Step 4: Commit (se houve ajustes)**

```bash
git add -A
git commit -m "test: final verification for advanced rules local UI"
```

---

## Self-Review

**Cobertura da spec (escopo Plano 2 — cliente local):**
- Jargão na RulesScreen → Task 8 ✓
- Apostas válidas + conversão bico (texto) → Task 8 ✓
- Aposta inicial (texto) → Task 8 ✓
- Regras Especiais com 3 toggles → Task 7 ✓
- Botões Passo/Mesa/Dudar Passo (local) → Task 6 ✓
- Exibição de tableDice → Task 6 / componentes ✓
- Componentes compartilhados (DiceRow, PlayerChip, FacePicker, MesaSelector) → Tasks 3-4 ✓
- Bot válido sob novas regras (correção crítica) → Task 2 ✓

**Fora do escopo (Plano 3):** servidor, eventos socket de passo/mesa, aprovação de jogadores, Modo Físico em rede, Passo/Mesa **online**, mensagem de Passo distinto no overlay online.

**Notas de consistência:** as ações do store (`playerPasso/playerMesa/playerDudoPasso`) chamam as funções do motor `passo/mesa/dudoPasso` (Plano 1). `hasFiveDistinct` e `minOpeningQuantity` são reusadas do `game-core`. Os componentes `PlayerChip`/`FacePicker` são criados aqui mas a integração completa em todas as telas (substituir os inlines) é incremental — a GameScreen exibe tableDice via inline simples para minimizar regressão; trocar pelos componentes pode ser feito sem alterar comportamento.
```
