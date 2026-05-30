# Dudos — Plano 3: Rede (servidor, aprovação, Físico em rede) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar as regras avançadas e o novo Modo Físico para a rede: espelhar o motor no servidor (bico, aposta mínima, Passo/Mesa, Dudo manual, Palafico atualizado), adicionar fluxo de aprovação de jogadores (Online + Físico) e transformar o Modo Físico em sala multiplayer (sem menu de apostas, sem Passo, com Mesa e Dudo manual).

**Architecture:** O servidor mantém um motor **espelhado** (auto-contido, para deploy standalone via Docker) em `server/src/game`. Ele é a autoridade do estado; clientes recebem estado público + dados privados. O Modo Físico é uma sala com `mode: 'physical'` que não rastreia `currentBid` e resolve o Dudo escolhendo o perdedor manualmente. A aprovação coloca quem entra numa fila `pending` até o criador liberar.

**Tech Stack:** Node.js, Socket.IO, TypeScript, Jest (servidor); React Native (Expo SDK 54), Zustand (cliente).

**Spec:** `docs/superpowers/specs/2026-05-29-dudos-regras-avancadas-design.md`
**Depende de:** Planos 1 (motor) e 2 (UI local) mesclados.

> **Nota de arquitetura:** o servidor duplica a lógica do `game-core` porque o Dockerfile empacota apenas `server/`. Mantemos o espelho fiel ao `packages/game-core/src/engine.ts`. (Consolidar num pacote publicado é melhoria futura, fora do escopo.)

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `server/src/game/types.ts` (modificar) | novos campos de player/estado/eventos/público |
| `server/src/game/engine.ts` (modificar) | paridade com game-core: bico, opening min, passo/mesa/manual, palafico |
| `server/src/rooms/roomManager.ts` (modificar) | `mode`, fila de aprovação, ações passo/mesa/manual |
| `server/src/index.ts` (modificar) | eventos de aprovação e de jogo (passo/mesa/dudo físico) |
| `server/jest.config.js` (criar) + `server/src/game/__tests__/engine.test.ts` (criar) | testes de paridade do servidor |
| `server/package.json` (modificar) | devDeps de teste + script |
| `src/store/onlineGameStore.ts` (modificar) | `mode`, aprovação, passo/mesa/dudoPasso/manualDudo, tableDice, pendingPasso |
| `src/screens/OnlineLobbyScreen.tsx` (modificar) | criar sala com `mode`, fila de aprovação |
| `src/screens/OnlineGameScreen.tsx` (modificar) | Passo/Mesa/Dudar Passo + tableDice + msg Passo distinto |
| `src/screens/PhysicalGameScreen.tsx` (reescrever) | sala em rede: sem aposta/Passo, Dudo manual, Mesa |
| `src/components/LoserSelectOverlay.tsx` (criar) | overlay para marcar o perdedor (físico) |
| `src/screens/HomeScreen.tsx` (modificar) | Modo Físico → OnlineLobby com `mode: 'physical'` |
| `src/navigation/AppNavigator.tsx` (modificar) | parâmetros de rota para `mode` |

---

## Task 1: Setup de testes do servidor

**Files:**
- Modify: `server/package.json`
- Create: `server/jest.config.js`

- [ ] **Step 1: Instalar deps de teste no servidor**

Run:
```bash
cd server
npm install -D jest@29 ts-jest@29 @types/jest@29
cd ..
```
Expected: instala sem erro fatal.

- [ ] **Step 2: Criar `server/jest.config.js`**

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

- [ ] **Step 3: Adicionar script `test` ao `server/package.json`**

No bloco `"scripts"`, adicionar `"test": "jest"`.

- [ ] **Step 4: Smoke test**

Create `server/src/game/__tests__/engine.test.ts`:
```ts
import { initServerGame } from '../engine';
import { RuleConfig } from '../types';

const RULES: RuleConfig = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: true, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('smoke', () => {
  it('initServerGame cria N jogadores', () => {
    const g = initServerGame(RULES, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 'ABC123', 'a');
    expect(g.players).toHaveLength(2);
  });
});
```
Nota: esse teste vai falhar a compilação até a Task 2 adicionar `passoEnabled`/`mesaEnabled` em `RuleConfig` do servidor. Tudo bem — implemente a Task 2 antes de rodar.

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/jest.config.js server/src/game/__tests__/engine.test.ts
git commit -m "test(server): set up Jest for server engine parity tests"
```

---

## Task 2: Paridade de tipos no servidor

**Files:**
- Modify: `server/src/game/types.ts`

- [ ] **Step 1: RuleConfig — adicionar toggles**

Em `RuleConfig`, após `palificoEnabled`, adicionar:
```ts
  palificoEnabled: boolean;
  passoEnabled: boolean;
  mesaEnabled: boolean;
```

- [ ] **Step 2: ServerPlayer — novos campos**

```ts
export interface ServerPlayer {
  id: string;
  name: string;
  dice: Face[];
  tableDice: Face[];
  lives: number;
  usedPasso: boolean;
  usedMesa: boolean;
  isEliminated: boolean;
}
```

- [ ] **Step 3: RevealResult — kind/passoWasDistinct**

Acrescentar ao final da interface `RevealResult`:
```ts
  kind?: 'bid' | 'passo' | 'manual';
  passoWasDistinct?: boolean;
```

- [ ] **Step 4: ServerGameState — pendingPasso e mode**

```ts
  palificoActive: boolean;
  pendingPasso: { playerId: string } | null;
  mode: 'online' | 'physical';
```

- [ ] **Step 5: PublicPlayer — tableDice**

```ts
export interface PublicPlayer {
  id: string;
  name: string;
  diceCount: number;
  tableDice: Face[];
  lives: number;
  isEliminated: boolean;
}
```

- [ ] **Step 6: PublicGameState — pendingPasso e mode**

Adicionar à interface `PublicGameState` os campos:
```ts
  palificoActive: boolean;
  pendingPasso: { playerId: string } | null;
  mode: 'online' | 'physical';
```
(mantendo os demais campos já existentes: roomCode, rules, players, currentBid, currentPlayerId, phase, lastReveal, winnerId, roundNumber, hostId.)

- [ ] **Step 7: Eventos cliente→servidor**

Substituir `ClientToServerEvents` por:
```ts
export interface ClientToServerEvents {
  'room:create': (payload: { name: string; rules: RuleConfig; mode: 'online' | 'physical' }) => void;
  'room:request_join': (payload: { code: string; name: string }) => void;
  'room:approve': (payload: { socketId: string }) => void;
  'room:reject': (payload: { socketId: string }) => void;
  'room:start': () => void;
  'room:reconnect': (payload: { code: string; name: string }) => void;
  'game:bid': (payload: { quantity: number; face: Face }) => void;
  'game:dudo': () => void;
  'game:passo': () => void;
  'game:dudo_passo': () => void;
  'game:mesa': (payload: { indexes: number[] }) => void;
  'game:resolve_dudo': (payload: { loserId: string }) => void;
  'game:next_round': () => void;
}
```

- [ ] **Step 8: Eventos servidor→cliente**

Substituir `ServerToClientEvents` por:
```ts
export interface ServerToClientEvents {
  'room:created': (payload: { code: string }) => void;
  'room:joined': (payload: { code: string; players: { id: string; name: string }[] }) => void;
  'room:player_joined': (payload: { id: string; name: string }) => void;
  'room:player_left': (payload: { id: string; name: string }) => void;
  'room:pending_update': (payload: { pending: { id: string; name: string }[] }) => void;
  'room:join_result': (payload: { approved: boolean }) => void;
  'game:state': (state: PublicGameState) => void;
  'game:your_dice': (dice: Face[]) => void;
  'error': (msg: string) => void;
}
```

- [ ] **Step 9: Verificar**

Run: `cd server; npx tsc --noEmit`
Expected: vai apontar erros em `engine.ts`/`roomManager.ts` (campos novos não preenchidos) — esperado, corrigido nas próximas tasks. Confirme que `types.ts` em si não tem erro de sintaxe.

- [ ] **Step 10: Commit**

```bash
git add server/src/game/types.ts
git commit -m "feat(server): parity types for Mesa/Passo/approval/physical mode"
```

---

## Task 3: Paridade do motor do servidor

**Files:**
- Modify: `server/src/game/engine.ts`
- Test: `server/src/game/__tests__/engine.test.ts`

**Context:** Portar fielmente as funções do `packages/game-core/src/engine.ts` (Planos 1 + correções) para o motor do servidor, adaptando ao tipo `ServerPlayer` (sem `isBot`). As regras de bico, mínimo de abertura (2N-2 / N-1 / Palafico N-1), Palafico (1 dado ou 1 vida), Passo/Mesa/Dudo manual e resets devem ficar idênticas.

- [ ] **Step 1: Escrever testes de paridade (falhando)**

Substituir o conteúdo de `server/src/game/__tests__/engine.test.ts` por:
```ts
import {
  initServerGame, isBidHigher, minOpeningQuantity, applyBid,
  applyPasso, applyDudoPasso, applyMesa, applyManualDudo, applyNextRound,
} from '../engine';
import { RuleConfig, ServerGameState } from '../types';

const RULES: RuleConfig = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

function two(): ServerGameState {
  return initServerGame(RULES, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 'ABC123', 'a');
}

describe('paridade do motor (servidor)', () => {
  it('player começa com campos novos', () => {
    const g = two();
    expect(g.players[0].tableDice).toEqual([]);
    expect(g.players[0].usedPasso).toBe(false);
    expect(g.mode).toBe('online');
  });
  it('isBidHigher bico: normal->bico teto(q/2)', () => {
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 3, face: 1 })).toBe(true);
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 2, face: 1 })).toBe(false);
  });
  it('minOpeningQuantity: 2N-2 / N-1 / palafico N-1', () => {
    expect(minOpeningQuantity(4, 6, false)).toBe(6);
    expect(minOpeningQuantity(4, 1, false)).toBe(3);
    expect(minOpeningQuantity(4, 6, true)).toBe(3);
  });
  it('passo + dudoPasso honesto faz duvidador perder', () => {
    let g = two();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    g = applyPasso(g, 'a');
    const after = applyDudoPasso(g, 'b');
    expect(after.lastReveal?.kind).toBe('passo');
    expect(after.lastReveal?.loserIds).toContain('b');
  });
  it('mesa move dados e bloqueia passo', () => {
    let g = two();
    g = { ...g, players: [{ ...g.players[0], dice: [6, 6, 2, 3, 4] }, g.players[1]] };
    g = applyMesa(g, 'a', [0, 1]);
    expect(g.players[0].tableDice).toEqual([6, 6]);
    expect(() => applyPasso(g, 'a')).toThrow();
  });
  it('manual dudo penaliza o escolhido', () => {
    let g = two();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, { ...g.players[1], dice: [1, 1, 2, 2, 3] }] };
    const after = applyManualDudo(g, 'b');
    expect(after.lastReveal?.kind).toBe('manual');
    expect(after.players[1].dice).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd server; npm test`
Expected: FAIL (funções inexistentes / sem campos novos).

- [ ] **Step 3: Reescrever `server/src/game/engine.ts`**

Substituir todo o conteúdo por (porta fiel do game-core, tipos `ServerPlayer`):
```ts
import {
  Face, Bid, ServerGameState, ServerPlayer, RevealResult,
  FaceCount, RuleConfig, WILD, PublicGameState, PublicPlayer,
} from './types';

function rollDice(n: number): Face[] {
  return Array.from({ length: n }, () => (Math.floor(Math.random() * 6) + 1) as Face);
}

function countFaces(allDice: Face[]): FaceCount[] {
  const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of allDice) c[d]++;
  return ([1, 2, 3, 4, 5, 6] as Face[]).map((face) => ({ face, count: c[face] }));
}

function nextActiveIndex(players: ServerPlayer[], from: number): number {
  const total = players.length;
  let idx = (from + 1) % total;
  while (players[idx].isEliminated) idx = (idx + 1) % total;
  return idx;
}

function isPalificoRound(players: ServerPlayer[], rules: RuleConfig): boolean {
  if (!rules.palificoEnabled) return false;
  return players.some((p) => {
    if (p.isEliminated) return false;
    return rules.punishmentMode === 'dice' ? p.dice.length === 1 : p.lives === 1;
  });
}

export function minOpeningQuantity(activeCount: number, face: Face, palificoActive = false): number {
  if (palificoActive) return activeCount - 1;
  return face === WILD ? activeCount - 1 : 2 * activeCount - 2;
}

export function isBidHigher(current: Bid | null, next: Bid): boolean {
  if (!current) return true;
  const curBico = current.face === WILD;
  const nextBico = next.face === WILD;
  if (!curBico && !nextBico) {
    if (next.quantity > current.quantity) return true;
    if (next.quantity === current.quantity && next.face > current.face) return true;
    return false;
  }
  if (!curBico && nextBico) return next.quantity >= Math.ceil(current.quantity / 2);
  if (curBico && !nextBico) return next.quantity >= 2 * current.quantity + 1;
  return next.quantity > current.quantity;
}

export function initServerGame(
  rules: RuleConfig,
  players: { id: string; name: string }[],
  roomCode: string,
  hostId: string,
  mode: 'online' | 'physical' = 'online'
): ServerGameState {
  const fullPlayers: ServerPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    dice: rollDice(rules.startingDice),
    tableDice: [],
    lives: rules.punishmentMode === 'lives' ? rules.startingLives : 1,
    usedPasso: false,
    usedMesa: false,
    isEliminated: false,
  }));
  return {
    roomCode, rules, players: fullPlayers,
    currentBid: null, currentPlayerIndex: 0, phase: 'bidding',
    lastReveal: null, winnerId: null,
    palificoActive: isPalificoRound(fullPlayers, rules),
    pendingPasso: null, roundNumber: 1, hostId, mode,
  };
}

function finishRound(state: ServerGameState, players: ServerPlayer[], reveal: RevealResult): ServerGameState {
  const remaining = players.filter((p) => !p.isEliminated);
  const winnerId = remaining.length === 1 ? remaining[0].id : null;
  return { ...state, players, phase: winnerId ? 'game_over' : 'round_end', lastReveal: reveal, winnerId, pendingPasso: null };
}

function applyPenalty(players: ServerPlayer[], result: RevealResult, rules: RuleConfig): ServerPlayer[] {
  return players.map((p) => {
    if (!result.loserIds.includes(p.id)) return p;
    const total = p.dice.length + p.tableDice.length;
    if (rules.punishmentMode === 'lives') {
      const newLives = Math.max(0, p.lives - 1);
      const isEliminated = newLives <= 0;
      return { ...p, lives: newLives, dice: isEliminated ? [] : rollDice(total), tableDice: [], isEliminated };
    }
    const newTotal = total - 1;
    const isEliminated = newTotal <= 0;
    return { ...p, dice: isEliminated ? [] : rollDice(newTotal), tableDice: [], isEliminated };
  });
}

export function applyBid(state: ServerGameState, playerId: string, newBid: Bid): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  const player = state.players[state.currentPlayerIndex];
  if (player.id !== playerId) throw new Error('Não é sua vez');
  if (state.currentBid === null) {
    const activeCount = state.players.filter((p) => !p.isEliminated).length;
    if (newBid.quantity < minOpeningQuantity(activeCount, newBid.face, state.palificoActive)) {
      throw new Error('Aposta de abertura abaixo do mínimo');
    }
  } else if (!isBidHigher(state.currentBid, newBid)) {
    throw new Error('Aposta deve ser maior');
  }
  return { ...state, currentBid: newBid, currentPlayerIndex: nextActiveIndex(state.players, state.currentPlayerIndex), pendingPasso: null };
}

function resolveChallenge(state: ServerGameState): RevealResult {
  const bid = state.currentBid!;
  const active = state.players.filter((p) => !p.isEliminated);
  const allDice = active.flatMap((p) => [...p.dice, ...p.tableDice]);
  const faceCounts = countFaces(allDice);
  const wildCount = state.rules.wildEnabled && !state.palificoActive ? (faceCounts.find((f) => f.face === WILD)?.count ?? 0) : 0;
  const literalCount = faceCounts.find((f) => f.face === bid.face)?.count ?? 0;
  const effectiveCount = bid.face === WILD ? literalCount : literalCount + wildCount;
  const bidWasTrue = effectiveCount >= bid.quantity;
  const activeIds = active.map((p) => p.id);
  const challengerIdx = activeIds.indexOf(state.players[state.currentPlayerIndex].id);
  const bidderIdx = (challengerIdx - 1 + activeIds.length) % activeIds.length;
  const loserIds = bidWasTrue ? [activeIds[challengerIdx]] : [activeIds[bidderIdx]];
  return { faceCounts, wildCount: state.palificoActive ? 0 : wildCount, bidFace: bid.face, bidQuantity: bid.quantity, effectiveCount, bidWasTrue, loserIds, kind: 'bid' };
}

export function applyDudo(state: ServerGameState, playerId: string): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.currentBid) throw new Error('Ninguém apostou ainda');
  const challenger = state.players[state.currentPlayerIndex];
  if (challenger.id !== playerId) throw new Error('Não é sua vez');
  const reveal = resolveChallenge(state);
  return finishRound(state, applyPenalty(state.players, reveal, state.rules), reveal);
}

export function hasFiveDistinct(player: ServerPlayer): boolean {
  const all = [...player.dice, ...player.tableDice];
  if (all.length !== 5) return false;
  return new Set(all).size === 5;
}

export function applyPasso(state: ServerGameState, playerId: string): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.rules.passoEnabled) throw new Error('Passo desabilitado');
  const player = state.players[state.currentPlayerIndex];
  if (player.id !== playerId) throw new Error('Não é sua vez');
  if (player.usedPasso) throw new Error('Passo já usado');
  if (player.usedMesa) throw new Error('Mesa bloqueia o Passo');
  if (!hasFiveDistinct(player)) throw new Error('Passo exige 5 dados distintos');
  const players = state.players.map((p) => (p.id === playerId ? { ...p, usedPasso: true } : p));
  return { ...state, players, currentPlayerIndex: nextActiveIndex(state.players, state.currentPlayerIndex), pendingPasso: { playerId } };
}

export function applyDudoPasso(state: ServerGameState, challengerId: string): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.pendingPasso) throw new Error('Não há Passo para dudar');
  const challenger = state.players[state.currentPlayerIndex];
  if (challenger.id !== challengerId) throw new Error('Não é sua vez');
  const passer = state.players.find((p) => p.id === state.pendingPasso!.playerId)!;
  const distinct = hasFiveDistinct(passer);
  const loserId = distinct ? challengerId : passer.id;
  const reveal: RevealResult = {
    faceCounts: countFaces([...passer.dice, ...passer.tableDice]),
    wildCount: 0, bidFace: WILD, bidQuantity: 0, effectiveCount: 0,
    bidWasTrue: distinct, loserIds: [loserId], kind: 'passo', passoWasDistinct: distinct,
  };
  return finishRound(state, applyPenalty(state.players, reveal, state.rules), reveal);
}

export function applyMesa(state: ServerGameState, playerId: string, indexesToShow: number[]): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.rules.mesaEnabled) throw new Error('Mesa desabilitada');
  const idx = state.currentPlayerIndex;
  const player = state.players[idx];
  if (player.id !== playerId) throw new Error('Não é sua vez');
  if (player.usedMesa) throw new Error('Mesa já usada');
  const shown: Face[] = [];
  const remaining: Face[] = [];
  player.dice.forEach((d, i) => { if (indexesToShow.includes(i)) shown.push(d); else remaining.push(d); });
  const updated: ServerPlayer = { ...player, tableDice: [...player.tableDice, ...shown], dice: rollDice(remaining.length), usedMesa: true };
  return { ...state, players: state.players.map((p, i) => (i === idx ? updated : p)) };
}

export function applyManualDudo(state: ServerGameState, loserId: string): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.players.some((p) => p.id === loserId && !p.isEliminated)) throw new Error('Perdedor inválido');
  const allDice = state.players.filter((p) => !p.isEliminated).flatMap((p) => [...p.dice, ...p.tableDice]);
  const reveal: RevealResult = { faceCounts: countFaces(allDice), wildCount: 0, bidFace: WILD, bidQuantity: 0, effectiveCount: 0, bidWasTrue: false, loserIds: [loserId], kind: 'manual' };
  return finishRound(state, applyPenalty(state.players, reveal, state.rules), reveal);
}

export function applyNextRound(state: ServerGameState): ServerGameState {
  if (state.phase !== 'round_end') throw new Error('Não está em round_end');
  const updatedPlayers = state.players.map((p) =>
    p.isEliminated ? p : { ...p, dice: rollDice(p.dice.length + p.tableDice.length), tableDice: [], usedPasso: false, usedMesa: false }
  );
  const palificoActive = isPalificoRound(updatedPlayers, state.rules);
  const loserId = state.lastReveal?.loserIds[0];
  const loserIdx = loserId ? updatedPlayers.findIndex((p) => p.id === loserId) : 0;
  const startIdx = (loserIdx >= 0 && updatedPlayers[loserIdx]?.isEliminated) ? nextActiveIndex(updatedPlayers, loserIdx) : Math.max(0, loserIdx);
  return { ...state, players: updatedPlayers, currentBid: null, currentPlayerIndex: startIdx, phase: 'bidding', lastReveal: null, palificoActive, pendingPasso: null, roundNumber: state.roundNumber + 1 };
}

export function toPublicState(state: ServerGameState): PublicGameState {
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id, name: p.name, diceCount: p.dice.length, tableDice: p.tableDice, lives: p.lives, isEliminated: p.isEliminated,
  }));
  return {
    roomCode: state.roomCode, rules: state.rules, players,
    currentBid: state.currentBid, currentPlayerId: state.players[state.currentPlayerIndex]?.id ?? null,
    phase: state.phase, lastReveal: state.lastReveal, winnerId: state.winnerId,
    palificoActive: state.palificoActive, pendingPasso: state.pendingPasso, roundNumber: state.roundNumber, hostId: state.hostId, mode: state.mode,
  };
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd server; npm test`
Expected: PASS (smoke + paridade).

- [ ] **Step 5: Commit**

```bash
git add server/src/game/engine.ts server/src/game/__tests__/engine.test.ts
git commit -m "feat(server): mirror advanced engine (bico, Passo, Mesa, manual dudo, palafico)"
```

---

## Task 4: Modo de sala e fila de aprovação no roomManager

**Files:**
- Modify: `server/src/rooms/roomManager.ts`

- [ ] **Step 1: Estender `RoomMeta` e atualizar criação/entrada**

a) Atualizar imports do motor:
```ts
import {
  initServerGame, applyBid, applyDudo, applyNextRound,
  applyPasso, applyDudoPasso, applyMesa, applyManualDudo,
} from '../game/engine';
```

b) Atualizar a interface `RoomMeta`:
```ts
interface RoomMeta {
  code: string;
  hostId: string;
  mode: 'online' | 'physical';
  playerNames: Map<string, string>;        // aprovados (na sala)
  pending: Map<string, string>;             // aguardando aprovação
  state: ServerGameState | null;
  phase: 'lobby' | 'playing';
  rules: RuleConfig;
}
```

c) `createRoom` recebe `mode`:
```ts
export function createRoom(socketId: string, name: string, rules: RuleConfig, mode: 'online' | 'physical'): string {
  const code = generateCode();
  const playerNames = new Map<string, string>();
  playerNames.set(socketId, name);
  rooms.set(code, { code, hostId: socketId, mode, playerNames, pending: new Map(), state: null, phase: 'lobby', rules });
  socketRoomMap.set(socketId, code);
  return code;
}
```

- [ ] **Step 2: Substituir `joinRoom` por fila de aprovação**

```ts
export function requestJoin(socketId: string, code: string, name: string): RoomMeta | null {
  const room = rooms.get(code);
  if (!room || room.phase !== 'lobby') return null;
  room.pending.set(socketId, name);
  socketRoomMap.set(socketId, code);
  return room;
}

export function approveJoin(hostId: string, socketId: string): RoomMeta | null {
  const room = getRoomBySocket(hostId);
  if (!room || room.hostId !== hostId) return null;
  const name = room.pending.get(socketId);
  if (name === undefined) return null;
  room.pending.delete(socketId);
  room.playerNames.set(socketId, name);
  return room;
}

export function rejectJoin(hostId: string, socketId: string): RoomMeta | null {
  const room = getRoomBySocket(hostId);
  if (!room || room.hostId !== hostId) return null;
  room.pending.delete(socketId);
  socketRoomMap.delete(socketId);
  return room;
}

export function getPending(code: string): { id: string; name: string }[] {
  const room = rooms.get(code);
  if (!room) return [];
  return [...room.pending.entries()].map(([id, name]) => ({ id, name }));
}
```

- [ ] **Step 3: `startGame` passa o `mode`**

```ts
export function startGame(code: string): ServerGameState | null {
  const room = rooms.get(code);
  if (!room || room.phase !== 'lobby') return null;
  const players = [...room.playerNames.entries()].map(([id, name]) => ({ id, name }));
  if (players.length < 2) return null;
  const state = initServerGame(room.rules, players, code, room.hostId, room.mode);
  room.state = state;
  room.phase = 'playing';
  return state;
}
```

- [ ] **Step 4: Ações de jogo novas**

Adicionar, no padrão das existentes (`performBid`/`performDudo`):
```ts
export function performPasso(socketId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyPasso(room.state, socketId);
  return room.state;
}
export function performDudoPasso(socketId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyDudoPasso(room.state, socketId);
  return room.state;
}
export function performMesa(socketId: string, indexes: number[]): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyMesa(room.state, socketId, indexes);
  return room.state;
}
export function performManualDudo(socketId: string, loserId: string): ServerGameState {
  const room = getRoomBySocket(socketId);
  if (!room?.state) throw new Error('Sala não encontrada');
  room.state = applyManualDudo(room.state, loserId);
  return room.state;
}
```

- [ ] **Step 5: `removeSocket` também limpa `pending`**

No `removeSocket`, antes do bloco `if (room.phase === 'lobby')`, adicionar:
```ts
  room.pending.delete(socketId);
```

- [ ] **Step 6: Verificar**

Run: `cd server; npx tsc --noEmit`
Expected: erros restantes apenas em `index.ts` (handlers antigos) — corrigido na Task 5.

- [ ] **Step 7: Commit**

```bash
git add server/src/rooms/roomManager.ts
git commit -m "feat(server): room mode and join-approval queue"
```

---

## Task 5: Handlers Socket.IO (aprovação + jogo)

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Atualizar imports do roomManager**

```ts
import {
  createRoom, requestJoin, approveJoin, rejectJoin, getPending, startGame,
  performBid, performDudo, performPasso, performDudoPasso, performMesa,
  performManualDudo, performNextRound, removeSocket, getLobbyPlayers,
  reconnectToRoom, getRoomBySocket,
} from './rooms/roomManager';
```

- [ ] **Step 2: `room:create` com `mode`**

```ts
  socket.on('room:create', ({ name, rules, mode }) => {
    try {
      const code = createRoom(socket.id, name, rules, mode);
      socket.join(code);
      socket.emit('room:created', { code });
      socket.emit('room:joined', { code, players: getLobbyPlayers(code) });
    } catch (e: any) { socket.emit('error', e.message); }
  });
```

- [ ] **Step 3: Substituir `room:join` por fluxo de aprovação**

```ts
  socket.on('room:request_join', ({ code, name }) => {
    try {
      const room = requestJoin(socket.id, code, name);
      if (!room) { socket.emit('error', 'Sala não encontrada ou já iniciada'); return; }
      // avisa o host com a fila atualizada
      io.to(room.hostId).emit('room:pending_update', { pending: getPending(code) });
    } catch (e: any) { socket.emit('error', e.message); }
  });

  socket.on('room:approve', ({ socketId }) => {
    const room = approveJoin(socket.id, socketId);
    if (!room) return;
    const s = io.sockets.sockets.get(socketId);
    if (s) s.join(room.code);
    io.to(socketId).emit('room:join_result', { approved: true });
    io.to(room.code).emit('room:joined', { code: room.code, players: getLobbyPlayers(room.code) });
    io.to(room.hostId).emit('room:pending_update', { pending: getPending(room.code) });
  });

  socket.on('room:reject', ({ socketId }) => {
    const room = rejectJoin(socket.id, socketId);
    if (!room) return;
    io.to(socketId).emit('room:join_result', { approved: false });
    io.to(room.hostId).emit('room:pending_update', { pending: getPending(room.code) });
  });
```

- [ ] **Step 4: `room:start` envia dados privados (inclui tableDice vazio) — manter, com import de `toPublicState`**

Garantir que o handler `room:start` continua: chamar `startGame`, `io.to(code).emit('game:state', toPublicState(state))` e enviar `game:your_dice` para cada player.

- [ ] **Step 5: Eventos de jogo novos**

Adicionar handlers (broadcast de estado após cada um):
```ts
  socket.on('game:passo', () => {
    try { const st = performPasso(socket.id); io.to(st.roomCode).emit('game:state', toPublicState(st)); }
    catch (e: any) { socket.emit('error', e.message); }
  });
  socket.on('game:dudo_passo', () => {
    try { const st = performDudoPasso(socket.id); io.to(st.roomCode).emit('game:state', toPublicState(st)); }
    catch (e: any) { socket.emit('error', e.message); }
  });
  socket.on('game:mesa', ({ indexes }) => {
    try {
      const st = performMesa(socket.id, indexes);
      io.to(st.roomCode).emit('game:state', toPublicState(st));
      io.to(socket.id).emit('game:your_dice', st.players.find((p) => p.id === socket.id)?.dice ?? []);
    } catch (e: any) { socket.emit('error', e.message); }
  });
  socket.on('game:resolve_dudo', ({ loserId }) => {
    try { const st = performManualDudo(socket.id, loserId); io.to(st.roomCode).emit('game:state', toPublicState(st)); }
    catch (e: any) { socket.emit('error', e.message); }
  });
```

- [ ] **Step 6: `disconnect` avisa host da fila**

No handler `disconnect`, após `removeSocket`, se a sala existir e estiver em lobby, emitir `room:pending_update` ao host:
```ts
    if (result) {
      const { room, name } = result;
      io.to(room.code).emit('room:player_left', { id: socket.id, name });
      io.to(room.hostId).emit('room:pending_update', { pending: getPending(room.code) });
    }
```

- [ ] **Step 7: Verificar build do servidor**

Run: `cd server; npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(server): approval and game socket handlers (passo/mesa/manual dudo)"
```

---

## Task 6: onlineGameStore — modo, aprovação e novas ações

**Files:**
- Modify: `src/store/onlineGameStore.ts`

- [ ] **Step 1: Estender `PublicPlayer`/`PublicGameState` locais**

Adicionar `tableDice: Face[]` em `PublicPlayer`; em `PublicGameState` adicionar `pendingPasso: { playerId: string } | null` e `mode: 'online' | 'physical'`.

- [ ] **Step 2: Novos campos de estado e ações na store**

Adicionar ao estado: `pending: { id: string; name: string }[]`, `joinStatus: 'idle' | 'waiting' | 'approved' | 'rejected'`.
Adicionar à interface e implementação:
```ts
  createRoom: (name: string, rules: RuleConfig, mode: 'online' | 'physical') => void;
  requestJoin: (code: string, name: string) => void;
  approve: (socketId: string) => void;
  reject: (socketId: string) => void;
  passo: () => void;
  dudoPasso: () => void;
  mesa: (indexes: number[]) => void;
  resolveDudo: (loserId: string) => void;
```

- [ ] **Step 3: Implementar emitters e listeners**

No `connect()`, registrar:
```ts
    socket.on('room:pending_update', ({ pending }) => set({ pending }));
    socket.on('room:join_result', ({ approved }) => set({ joinStatus: approved ? 'approved' : 'rejected' }));
```
Implementar:
```ts
  createRoom: (name, rules, mode) => { set({ myName: name }); getSocket().emit('room:create', { name, rules, mode }); },
  requestJoin: (code, name) => { set({ myName: name, joinStatus: 'waiting' }); getSocket().emit('room:request_join', { code: code.toUpperCase(), name }); },
  approve: (socketId) => getSocket().emit('room:approve', { socketId }),
  reject: (socketId) => getSocket().emit('room:reject', { socketId }),
  passo: () => getSocket().emit('game:passo'),
  dudoPasso: () => getSocket().emit('game:dudo_passo'),
  mesa: (indexes) => getSocket().emit('game:mesa', { indexes }),
  resolveDudo: (loserId) => getSocket().emit('game:resolve_dudo', { loserId }),
```
Manter `startGame`, `bid`, `dudo`, `nextRound`, `disconnect`.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: PASS (erros nas telas serão resolvidos nas próximas tasks; se a store referenciar tipos só dela, deve compilar).

- [ ] **Step 5: Commit**

```bash
git add src/store/onlineGameStore.ts
git commit -m "feat(store): online mode, approval flow and passo/mesa/manual actions"
```

---

## Task 7: OnlineLobbyScreen — criar com modo e aprovar jogadores

**Files:**
- Modify: `src/screens/OnlineLobbyScreen.tsx`
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Rota aceita `mode`**

Em `AppNavigator.tsx`, mudar o tipo de `OnlineLobby` para `{ mode: 'online' | 'physical' }` e manter as telas `OnlineGame`/`OnlineResult`.

- [ ] **Step 2: Lobby usa o `mode` da rota**

Em `OnlineLobbyScreen`, ler `route.params.mode`. Ao criar sala, chamar `createRoom(name, selectedRules, mode)`. Ao entrar, chamar `requestJoin(code, name)`.

- [ ] **Step 3: Estado de espera do solicitante**

Se `joinStatus === 'waiting'`, mostrar tela "Aguardando aprovação do criador…". Se `'rejected'`, mostrar "Entrada recusada" e botão Voltar. Se `'approved'`, segue para o lobby normal (já recebe `room:joined`).

- [ ] **Step 4: Lista de pendentes para o host**

No lobby (quando `roomCode` definido e sou host), renderizar `pending` com botões Aprovar/Recusar chamando `approve(p.id)` / `reject(p.id)`:
```tsx
        {isHost && pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pedidos de entrada</Text>
            {pending.map((p) => (
              <View key={p.id} style={styles.playerRow}>
                <Text style={styles.playerName}>{p.name}</Text>
                <TouchableOpacity onPress={() => approve(p.id)}><Text style={styles.approve}>Aprovar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => reject(p.id)}><Text style={styles.reject}>Recusar</Text></TouchableOpacity>
              </View>
            ))}
          </>
        )}
```
Adicionar estilos `approve` (verde) e `reject` (vermelho).

- [ ] **Step 5: Navegação pós-início conforme o modo**

Quando `game.phase` virar `bidding`/`round_end`, navegar para `OnlineGame` se `game.mode === 'online'`, ou para `PhysicalGame` se `game.mode === 'physical'`.

- [ ] **Step 6: Verificar e commit**

Run: `npx tsc --noEmit` → PASS
```bash
git add src/screens/OnlineLobbyScreen.tsx src/navigation/AppNavigator.tsx
git commit -m "feat(ui): lobby create-with-mode and player approval"
```

---

## Task 8: OnlineGameScreen — Passo/Mesa/Dudar Passo + tableDice + msg Passo

**Files:**
- Modify: `src/screens/OnlineGameScreen.tsx`

- [ ] **Step 1: Ações da store e estado**

Extrair `passo, dudoPasso, mesa` da store; adicionar `const [showMesa, setShowMesa] = useState(false)` e importar `MesaSelector` e `hasFiveDistinct` do game-core. Calcular distintos a partir de `myDice` (o cliente só conhece os próprios dados): `const canPasso = game.rules.passoEnabled && myDice.length === 5 && new Set(myDice).size === 5 && !myPlayer?...`. Como o cliente não tem `usedPasso` no estado público, expor `usedPasso/usedMesa` no `PublicPlayer` (adicionar no servidor `toPublicState` e nos tipos) **ou** confiar no servidor para rejeitar — para UX, adicionar `usedPasso`/`usedMesa` em `PublicPlayer`.

  - [ ] Sub-passo: incluir `usedPasso`/`usedMesa` em `PublicPlayer` (server `types.ts` + `toPublicState`) e no tipo local da store. Commit junto.

- [ ] **Step 2: Botões na área do humano (quando é a vez)**

```tsx
            <View style={styles.specialRow}>
              {game.rules.passoEnabled && myDice.length === 5 && new Set(myDice).size === 5 && !myPlayer?.usedPasso && (
                <TouchableOpacity style={styles.specialBtn} onPress={passo}><Text style={styles.specialBtnText}>Passo</Text></TouchableOpacity>
              )}
              {game.rules.mesaEnabled && !myPlayer?.usedMesa && (
                <TouchableOpacity style={styles.specialBtn} onPress={() => setShowMesa(true)}><Text style={styles.specialBtnText}>Mesa</Text></TouchableOpacity>
              )}
            </View>
```

- [ ] **Step 3: Botão Dudar Passo**

```tsx
        {isMyTurn && game.phase === 'bidding' && game.pendingPasso && game.pendingPasso.playerId !== mySocketId && (
          <TouchableOpacity style={styles.dudoBtn} onPress={dudoPasso}>
            <Text style={styles.dudoBtnText}>DUDAR O PASSO</Text>
          </TouchableOpacity>
        )}
```

- [ ] **Step 4: tableDice no chip + MesaSelector**

Exibir `p.tableDice` no chip do jogador; adicionar `<MesaSelector visible={showMesa} dice={myDice} onCancel={() => setShowMesa(false)} onConfirm={(idx) => { setShowMesa(false); mesa(idx); }} />`.

- [ ] **Step 5: Mensagem de Passo distinto no overlay**

No `RevealOverlay` (já recebe `reveal`), quando `reveal.kind === 'passo' && reveal.passoWasDistinct`, exibir destaque "5 dados distintos confirmados! 🎲". Implementar a renderização condicional dentro do `RevealOverlay` baseada em `reveal.kind`.

- [ ] **Step 6: Verificar e commit**

Run: `npx tsc --noEmit` → PASS; `npx expo export --platform android --dev` → "Exported: dist"
```bash
git add src/screens/OnlineGameScreen.tsx src/components/RevealOverlay.tsx server/src/game/types.ts server/src/game/engine.ts src/store/onlineGameStore.ts
git commit -m "feat(ui): online Passo/Mesa/Dudar Passo, tableDice and distinct-passo message"
```

---

## Task 9: LoserSelectOverlay (seleção de perdedor no físico)

**Files:**
- Create: `src/components/LoserSelectOverlay.tsx`

- [ ] **Step 1: Criar componente**

```tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DICE_FACE, FaceCount } from '../../packages/game-core/src';

interface PlayerLite { id: string; name: string; }

interface Props {
  visible: boolean;
  faceCounts: FaceCount[];
  players: PlayerLite[];
  onSelect: (loserId: string) => void;
  onCancel: () => void;
}

export default function LoserSelectOverlay({ visible, faceCounts, players, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Contagem</Text>
          <View style={styles.tally}>
            {faceCounts.map(({ face, count }) => (
              <Text key={face} style={styles.tallyItem}>{DICE_FACE[face]} ×{count}</Text>
            ))}
          </View>
          <Text style={styles.subtitle}>Quem perdeu a rodada?</Text>
          <ScrollView style={{ maxHeight: 240 }}>
            {players.map((p) => (
              <TouchableOpacity key={p.id} style={styles.playerBtn} onPress={() => onSelect(p.id)}>
                <Text style={styles.playerText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#2d1b4e', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  title: { color: '#f5c518', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  tally: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginVertical: 12 },
  tallyItem: { color: '#fff', fontSize: 20 },
  subtitle: { color: '#aaa', fontSize: 15, textAlign: 'center', marginBottom: 12 },
  playerBtn: { backgroundColor: '#3d2060', borderRadius: 10, padding: 14, marginBottom: 8 },
  playerText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  cancel: { borderWidth: 1, borderColor: '#4a2e7a', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#aaa', fontSize: 15 },
});
```

- [ ] **Step 2: Verificar e commit**

Run: `npx tsc --noEmit` → PASS
```bash
git add src/components/LoserSelectOverlay.tsx
git commit -m "feat(ui): LoserSelectOverlay for physical manual dudo"
```

---

## Task 10: Reescrever PhysicalGameScreen (rede)

**Files:**
- Modify: `src/screens/PhysicalGameScreen.tsx`

**Context:** A tela de "passa o celular" será substituída por uma tela em rede que reusa a `onlineGameStore`. Diferenças do Online: sem menu de apostas, sem Passo; com Mesa e Dudo manual. Ao Dudar, abre o `LoserSelectOverlay` para escolher o perdedor; confirma via `resolveDudo(loserId)`.

- [ ] **Step 1: Reescrever a tela**

Substituir o conteúdo por uma tela que:
- usa `useOnlineGameStore` (game, mySocketId, myDice, mesa, resolveDudo, nextRound);
- mostra os jogadores (chips com vidas/dados + tableDice) e os dados privados via `DiceRow`;
- mostra a aposta verbal apenas como lembrete textual ("apostas em voz alta");
- botão **Dudar** sempre disponível (qualquer um) → abre `LoserSelectOverlay` com `game.lastReveal?.faceCounts` quando vier do servidor. Como o físico calcula a contagem no servidor só ao resolver, o fluxo é: tocar "Dudar" → emitir nada ainda; precisamos da contagem. **Decisão:** ao tocar "Dudar", o cliente emite `game:resolve_dudo` apenas após escolher o perdedor; a contagem das faces é exibida localmente a partir dos dados conhecidos? Não — o cliente não conhece os dados dos outros. Portanto: o overlay de seleção mostra só a lista de jogadores (sem tally); o tally aparece na tela de resultado (`game:state` com `lastReveal.faceCounts`) após resolver. Ajustar o `LoserSelectOverlay` para tornar o tally opcional (renderizar só se `faceCounts.length > 0`).
- botão **Mesa** (igual ao online) abrindo `MesaSelector`;
- ao receber `game.phase === 'round_end'`, mostrar `RevealOverlay` com o `lastReveal` (kind 'manual' → mostra as 6 faces e o perdedor); o host avança a rodada com `nextRound()`.

- [ ] **Step 2: Tornar o tally opcional no LoserSelectOverlay**

Em `LoserSelectOverlay`, envolver o bloco `tally` em `{faceCounts.length > 0 && (...)}`.

- [ ] **Step 3: HomeScreen e navegação**

Em `HomeScreen`, o botão "Modo Físico" passa a navegar para `OnlineLobby` com `{ mode: 'physical' }`. Remover a navegação antiga para `RuleConfig { mode: 'physical' }`. Em `RuleConfigScreen`, o modo `physical` deixa de ser usado pela Home (pode permanecer para configurar regras antes de criar a sala — opcional; manter simples: o lobby físico usa `DEFAULT_RULES` ou um seletor de template como no online).

- [ ] **Step 4: Verificar e commit**

Run: `npx tsc --noEmit` → PASS; `npx expo export --platform android --dev` → "Exported: dist"
```bash
git add src/screens/PhysicalGameScreen.tsx src/components/LoserSelectOverlay.tsx src/screens/HomeScreen.tsx
git commit -m "feat(ui): networked physical mode with manual dudo and Mesa"
```

---

## Task 11: Verificação fim-a-fim

- [ ] **Step 1: Testes**

Run: `cd server; npm test` → PASS (paridade). `cd ..; npm test` → PASS (motor + bot).

- [ ] **Step 2: Build**

Run: `npx tsc --noEmit` → PASS; `cd server; npx tsc --noEmit` → PASS; `cd ..; npx expo export --platform android --dev` → "Exported: dist".

- [ ] **Step 3: Verificação manual (2 dispositivos/janelas)**

Subir o servidor (`cd server; npm run dev`) e o app (`npx expo start --tunnel`). Validar:
- **Aprovação:** criar sala (Online), pedir entrada de outro jogador, host vê o pedido e aprova; o jogador entra. Recusar também funciona.
- **Online:** Passo aparece com 5 distintos; Dudar Passo pelo próximo jogador; Mesa revela e re-sorteia; mensagem de Passo distinto aparece no resultado.
- **Físico:** criar sala (Modo Físico), entrar com 2º jogador (aprovado), iniciar; cada um vê só seus dados; "Dudar" abre seleção de perdedor; ao escolher, o app desconta e mostra a contagem das 6 faces; Mesa funciona; sem botões de aposta/Passo.

- [ ] **Step 4: Commit (se ajustes)**

```bash
git add -A
git commit -m "test: end-to-end verification for networked rules and physical mode"
```

---

## Self-Review

**Cobertura da spec (escopo Plano 3 — rede):**
- Espelhar motor no servidor (bico, opening min, Passo/Mesa, manual dudo, palafico 1 dado/1 vida) → Tasks 2-3 ✓
- Aprovação de jogadores (Online + Físico) → Tasks 4-5, 6-7 ✓
- Modo Físico em rede (sem aposta/Passo, Dudo manual, Mesa) → Tasks 9-10 ✓
- Eventos socket (passo/dudo_passo/mesa/resolve_dudo/aprovação) → Tasks 2,5,6 ✓
- tableDice no estado público e exibição → Tasks 2-3, 8, 10 ✓
- Mensagem de Passo distinto (online) → Task 8 ✓
- Reconexão existente preservada → mantida (roomManager.reconnectToRoom) ✓

**Consistência de tipos:** as funções do servidor usam o prefixo `apply*` (`applyPasso`, `applyDudoPasso`, `applyMesa`, `applyManualDudo`) — diferente do `game-core` (`passo`, `dudoPasso`, `mesa`, `resolveManualDudo`) por seguir o padrão existente do servidor (`applyBid`/`applyDudo`). `PublicPlayer` ganha `tableDice/usedPasso/usedMesa`; `PublicGameState` ganha `pendingPasso/mode`. A store cliente espelha esses campos.

**Notas:** o servidor permanece auto-contido (deploy Docker). A reconexão por nome continua funcionando; aprovação só ocorre no lobby (jogador aprovado reconecta normalmente). O tally no físico aparece no resultado pós-resolução (cliente não conhece dados alheios antes).
```
