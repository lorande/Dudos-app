# Dudos — Plano 1: Motor (game-core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar no motor puro (`packages/game-core`) as regras avançadas do Dudos — jargão das faces, validação de bico, aposta inicial mínima, Passo, Mesa e Dudo manual — com suíte de testes Jest.

**Architecture:** `game-core` é TypeScript puro sem dependências de React Native. Adicionamos campos ao estado (`tableDice`, `usedPasso`, `usedMesa`, `pendingPasso`), novas funções exportadas e uma suíte Jest+ts-jest rodando só sobre `packages/game-core`. As mudanças mantêm o app compilando (campos novos de `RevealResult` são opcionais; `kind` default `'bid'`).

**Tech Stack:** TypeScript, Jest, ts-jest.

**Spec:** `docs/superpowers/specs/2026-05-29-dudos-regras-avancadas-design.md`

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `jest.config.js` (criar) | Config Jest com ts-jest, escopo `packages/game-core` |
| `packages/game-core/src/types.ts` (modificar) | RuleConfig, PlayerState, GameState, RevealResult, constantes |
| `packages/game-core/src/engine.ts` (modificar) | validação bico, opening min, passo, dudoPasso, mesa, resolveManualDudo, helpers |
| `packages/game-core/src/__tests__/engine.test.ts` (criar) | testes unitários do motor |
| `package.json` (modificar) | devDeps de teste + script `test` |

---

## Task 1: Configurar Jest para game-core

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`

- [ ] **Step 1: Instalar dependências de teste**

Run:
```bash
npm install -D jest ts-jest @types/jest --legacy-peer-deps
```
Expected: instala sem erro fatal (avisos de peer deps são aceitáveis).

- [ ] **Step 2: Criar `jest.config.js`**

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/game-core'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

- [ ] **Step 3: Adicionar script `test` ao `package.json`**

No bloco `"scripts"`, adicionar a linha `"test": "jest"` (manter as demais). Exemplo do bloco final:
```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "test": "jest"
}
```

- [ ] **Step 4: Criar teste de fumaça**

Create `packages/game-core/src/__tests__/engine.test.ts`:
```ts
import { rollDice } from '../engine';

describe('smoke', () => {
  it('rollDice retorna a quantidade pedida', () => {
    expect(rollDice(5)).toHaveLength(5);
  });
});
```

- [ ] **Step 5: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS (1 teste).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.config.js packages/game-core/src/__tests__/engine.test.ts
git commit -m "test: set up Jest + ts-jest for game-core"
```

---

## Task 2: Constantes de jargão e novos campos de tipos

**Files:**
- Modify: `packages/game-core/src/types.ts`

- [ ] **Step 1: Adicionar constantes e campos**

Em `packages/game-core/src/types.ts`:

a) Após a linha `export const WILD: Face = 1;`, adicionar:
```ts
export const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;
export const FACE_NAMES = ['', 'Bico', 'Duque', 'Terno', 'Quadra', 'Quina', 'Sena'] as const;
```

b) Em `RuleConfig`, adicionar dois campos após `palificoEnabled`:
```ts
  palificoEnabled: boolean; // variante palafico
  passoEnabled: boolean;    // regra especial Passo
  mesaEnabled: boolean;     // regra especial Mesa
```

c) Em `DEFAULT_RULES`, adicionar:
```ts
  palificoEnabled: true,
  passoEnabled: true,
  mesaEnabled: true,
```

d) Em `PlayerState`, adicionar três campos após `dice`:
```ts
  dice: Face[];
  tableDice: Face[];   // dados públicos na mesa (regra Mesa)
  usedPasso: boolean;  // reset a cada rodada
  usedMesa: boolean;   // reset a cada rodada
```

e) Em `RevealResult`, adicionar dois campos opcionais ao final da interface:
```ts
  loserIds: string[];
  kind?: 'bid' | 'passo' | 'manual'; // default 'bid'
  passoWasDistinct?: boolean;        // só quando kind === 'passo'
```

f) Em `GameState`, adicionar após `palificoActive`:
```ts
  palificoActive: boolean;
  pendingPasso: { playerId: string } | null; // Passo aguardando possível Dudo
```

- [ ] **Step 2: Verificar compilação dos tipos**

Run: `npx tsc --noEmit`
Expected: vai falhar em `engine.ts` (initGame não preenche os novos campos) — isso é esperado e será corrigido na Task 3. Confirme que os erros são apenas sobre `tableDice`/`usedPasso`/`usedMesa`/`pendingPasso` ausentes em `engine.ts`, e não erros de sintaxe em `types.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/game-core/src/types.ts
git commit -m "feat(core): add jargon constants and Mesa/Passo state fields"
```

---

## Task 3: Corrigir initGame e inicializar novos campos

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Adicionar a `engine.test.ts`:
```ts
import { initGame } from '../engine';
import { DEFAULT_RULES } from '../types';

describe('initGame', () => {
  it('inicializa novos campos por jogador e estado', () => {
    const g = initGame(DEFAULT_RULES, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    expect(g.players[0].tableDice).toEqual([]);
    expect(g.players[0].usedPasso).toBe(false);
    expect(g.players[0].usedMesa).toBe(false);
    expect(g.players[0].dice).toHaveLength(DEFAULT_RULES.startingDice);
    expect(g.pendingPasso).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (compilação/asserções sobre campos ausentes).

- [ ] **Step 3: Atualizar `initGame`**

Substituir o corpo de `initGame` (linhas ~44-68) por:
```ts
export function initGame(
  rules: RuleConfig,
  players: Pick<PlayerState, 'id' | 'name' | 'isBot'>[]
): GameState {
  const diceCount = rules.startingDice;

  const fullPlayers: PlayerState[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    isBot: p.isBot,
    dice: rollDice(diceCount),
    tableDice: [],
    lives: rules.punishmentMode === 'lives' ? rules.startingLives : 1,
    usedPasso: false,
    usedMesa: false,
    isEliminated: false,
  }));

  return {
    rules,
    players: fullPlayers,
    currentBid: null,
    currentPlayerIndex: 0,
    phase: 'bidding',
    lastReveal: null,
    winnerId: null,
    palificoActive: isPalificoRound(fullPlayers, rules),
    pendingPasso: null,
    roundNumber: 1,
  };
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "fix(core): init Mesa/Passo fields and remove redundant initGame branch"
```

---

## Task 4: Validação de aposta com bico (isBidHigher)

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever testes falhando**

Adicionar a `engine.test.ts`:
```ts
import { isBidHigher } from '../engine';

describe('isBidHigher (bico)', () => {
  it('primeira aposta é sempre válida', () => {
    expect(isBidHigher(null, { quantity: 3, face: 4 })).toBe(true);
  });
  it('normal -> normal: quantidade maior', () => {
    expect(isBidHigher({ quantity: 3, face: 4 }, { quantity: 4, face: 2 })).toBe(true);
  });
  it('normal -> normal: mesma quantidade, face maior', () => {
    expect(isBidHigher({ quantity: 3, face: 4 }, { quantity: 3, face: 5 })).toBe(true);
    expect(isBidHigher({ quantity: 3, face: 4 }, { quantity: 3, face: 3 })).toBe(false);
  });
  it('normal -> bico: precisa de teto(q/2) bicos', () => {
    // q=5 -> ceil(2.5)=3
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 3, face: 1 })).toBe(true);
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 2, face: 1 })).toBe(false);
  });
  it('bico -> normal: precisa de 2*Y+1', () => {
    // Y=3 -> 7
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 7, face: 2 })).toBe(true);
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 6, face: 6 })).toBe(false);
  });
  it('bico -> bico: mais bicos', () => {
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 4, face: 1 })).toBe(true);
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 3, face: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (lógica antiga trata bico como face normal).

- [ ] **Step 3: Reescrever `isBidHigher`**

Substituir a função `isBidHigher` (linhas ~89-94) por:
```ts
export function isBidHigher(current: Bid | null, next: Bid): boolean {
  if (!current) return true;
  const curBico = current.face === WILD;
  const nextBico = next.face === WILD;

  if (!curBico && !nextBico) {
    if (next.quantity > current.quantity) return true;
    if (next.quantity === current.quantity && next.face > current.face) return true;
    return false;
  }
  if (!curBico && nextBico) {
    return next.quantity >= Math.ceil(current.quantity / 2);
  }
  if (curBico && !nextBico) {
    return next.quantity >= 2 * current.quantity + 1;
  }
  return next.quantity > current.quantity; // bico -> bico
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "feat(core): bico/ace bid conversion in isBidHigher"
```

---

## Task 5: Aposta inicial mínima (minOpeningQuantity)

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever testes falhando**

Adicionar a `engine.test.ts`:
```ts
import { minOpeningQuantity, bid, initGame as init2 } from '../engine';
import { DEFAULT_RULES as R2 } from '../types';

describe('minOpeningQuantity', () => {
  it('normal = 2N-2, bico = N-1', () => {
    expect(minOpeningQuantity(4, 6)).toBe(6);
    expect(minOpeningQuantity(4, 1)).toBe(3);
  });
});

describe('bid abertura', () => {
  const make = () =>
    init2(R2, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
      { id: 'c', name: 'C', isBot: false },
      { id: 'd', name: 'D', isBot: false },
    ]);

  it('rejeita abertura abaixo de 2N-2', () => {
    const g = make();
    expect(() => bid(g, 'a', { quantity: 5, face: 3 })).toThrow();
  });
  it('aceita abertura em 2N-2', () => {
    const g = make();
    const g2 = bid(g, 'a', { quantity: 6, face: 3 });
    expect(g2.currentBid).toEqual({ quantity: 6, face: 3 });
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (`minOpeningQuantity` não existe; `bid` não valida mínimo).

- [ ] **Step 3: Implementar `minOpeningQuantity` e validar em `bid`**

a) Adicionar antes de `isBidHigher`:
```ts
export function minOpeningQuantity(activeCount: number, face: Face): number {
  return face === WILD ? activeCount - 1 : 2 * activeCount - 2;
}
```

b) Em `bid`, após a checagem de turno e antes do `isBidHigher`, inserir:
```ts
  if (state.currentBid === null) {
    const activeCount = state.players.filter((p) => !p.isEliminated).length;
    if (newBid.quantity < minOpeningQuantity(activeCount, newBid.face)) {
      throw new Error('Aposta de abertura abaixo do mínimo');
    }
  } else if (!isBidHigher(state.currentBid, newBid)) {
    throw new Error('Aposta deve ser maior que a atual');
  }
```
Remover o bloco antigo `if (!isBidHigher(...)) throw ...` para não duplicar.

c) `bid` também deve limpar `pendingPasso`. No `return` de `bid`, adicionar `pendingPasso: null`:
```ts
  return {
    ...state,
    currentBid: newBid,
    currentPlayerIndex: nextActiveIndex(state, state.currentPlayerIndex),
    pendingPasso: null,
  };
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "feat(core): mandatory opening bid minimum (2N-2 / N-1 for bico)"
```

---

## Task 6: tableDice na contagem e penalidade

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Adicionar a `engine.test.ts`:
```ts
import { dudo, bid as bid3, initGame as init3 } from '../engine';
import { RuleConfig } from '../types';

const RULES_NO_PALIFICO: RuleConfig = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('tableDice conta no Dudo', () => {
  it('dados na mesa entram na contagem', () => {
    let g = init3(RULES_NO_PALIFICO, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    // Força mãos determinísticas
    g = {
      ...g,
      players: [
        { ...g.players[0], dice: [4, 4], tableDice: [4] },
        { ...g.players[1], dice: [2, 3], tableDice: [] },
      ],
      currentBid: { quantity: 3, face: 4 },
      currentPlayerIndex: 1, // B duda
    };
    const after = dudo(g, 'b');
    // 3 quadras existem (2 na mão de A + 1 na mesa) -> aposta verdadeira -> B perde
    expect(after.lastReveal?.bidWasTrue).toBe(true);
    expect(after.lastReveal?.loserIds).toContain('b');
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (contagem ignora `tableDice`).

- [ ] **Step 3: Incluir tableDice na contagem e na penalidade**

a) Em `resolveChallenge`, trocar a montagem de `allDice` (linha ~123) por:
```ts
  const allDice = state.players
    .filter((p) => !p.isEliminated)
    .flatMap((p) => [...p.dice, ...p.tableDice]);
```

b) Em `resolveChallenge`, ao retornar, incluir `kind: 'bid'` no objeto:
```ts
  return {
    faceCounts,
    wildCount: state.palificoActive ? 0 : wildCount,
    bidFace: bid.face,
    bidQuantity: bid.quantity,
    effectiveCount,
    bidWasTrue,
    loserIds,
    kind: 'bid',
  };
```

c) Reescrever `applyPenalty` para considerar `tableDice` (perda de 1 do total e limpeza da mesa):
```ts
function applyPenalty(players: PlayerState[], result: RevealResult, rules: RuleConfig): PlayerState[] {
  return players.map((p) => {
    if (!result.loserIds.includes(p.id)) return p;
    const total = p.dice.length + p.tableDice.length;

    if (rules.punishmentMode === 'lives') {
      const newLives = Math.max(0, p.lives - 1);
      const isEliminated = newLives <= 0;
      return {
        ...p,
        lives: newLives,
        dice: isEliminated ? [] : rollDice(total),
        tableDice: [],
        isEliminated,
      };
    } else {
      const newTotal = total - 1;
      const isEliminated = newTotal <= 0;
      return {
        ...p,
        dice: isEliminated ? [] : rollDice(newTotal),
        tableDice: [],
        isEliminated,
      };
    }
  });
}
```

d) `dudo` deve limpar `pendingPasso`. No `return` de `dudo`, adicionar `pendingPasso: null`.

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "feat(core): count tableDice in challenges and penalties"
```

---

## Task 7: hasFiveDistinct + Passo + dudoPasso

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever testes falhando**

Adicionar a `engine.test.ts`:
```ts
import { hasFiveDistinct, passo, dudoPasso, initGame as init4 } from '../engine';
import { RuleConfig as RC4 } from '../types';

const RULES4: RC4 = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

function twoPlayers() {
  return init4(RULES4, [
    { id: 'a', name: 'A', isBot: false },
    { id: 'b', name: 'B', isBot: false },
  ]);
}

describe('hasFiveDistinct', () => {
  it('true para 5 dados distintos', () => {
    const p = { id: 'a', name: 'A', dice: [1, 2, 3, 4, 5], tableDice: [], lives: 1, usedPasso: false, usedMesa: false, isBot: false, isEliminated: false };
    expect(hasFiveDistinct(p)).toBe(true);
  });
  it('false com repetição', () => {
    const p = { id: 'a', name: 'A', dice: [1, 2, 3, 4, 4], tableDice: [], lives: 1, usedPasso: false, usedMesa: false, isBot: false, isEliminated: false };
    expect(hasFiveDistinct(p)).toBe(false);
  });
});

describe('passo / dudoPasso', () => {
  it('passo mantém aposta e avança turno', () => {
    let g = twoPlayers();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    const after = passo(g, 'a');
    expect(after.currentBid).toEqual({ quantity: 6, face: 3 });
    expect(after.players[0].usedPasso).toBe(true);
    expect(after.pendingPasso).toEqual({ playerId: 'a' });
    expect(after.currentPlayerIndex).toBe(1);
  });
  it('passo rejeitado sem 5 distintos', () => {
    let g = twoPlayers();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 1, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    expect(() => passo(g, 'a')).toThrow();
  });
  it('dudoPasso: passador honesto faz o duvidador perder', () => {
    let g = twoPlayers();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    g = passo(g, 'a'); // turno vai para b
    const after = dudoPasso(g, 'b');
    expect(after.lastReveal?.kind).toBe('passo');
    expect(after.lastReveal?.passoWasDistinct).toBe(true);
    expect(after.lastReveal?.loserIds).toContain('b');
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (funções inexistentes).

- [ ] **Step 3: Implementar helpers e ações**

Adicionar ao `engine.ts` (após `nextActiveIndex`/utilitários, antes de `initGame` ou junto às ações):
```ts
export function hasFiveDistinct(player: PlayerState): boolean {
  const all = [...player.dice, ...player.tableDice];
  if (all.length !== 5) return false;
  return new Set(all).size === 5;
}

export function passo(state: GameState, playerId: string): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.rules.passoEnabled) throw new Error('Passo desabilitado');
  const player = state.players[state.currentPlayerIndex];
  if (player.id !== playerId) throw new Error('Não é a vez deste jogador');
  if (player.usedPasso) throw new Error('Passo já usado nesta rodada');
  if (player.usedMesa) throw new Error('Mesa usada bloqueia o Passo');
  if (!hasFiveDistinct(player)) throw new Error('Passo exige 5 dados distintos');

  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, usedPasso: true } : p
  );
  return {
    ...state,
    players,
    currentPlayerIndex: nextActiveIndex(state, state.currentPlayerIndex),
    pendingPasso: { playerId },
  };
}

export function dudoPasso(state: GameState, challengerId: string): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.pendingPasso) throw new Error('Não há Passo para dudar');
  const challenger = state.players[state.currentPlayerIndex];
  if (challenger.id !== challengerId) throw new Error('Não é a vez deste jogador');

  const passer = state.players.find((p) => p.id === state.pendingPasso!.playerId)!;
  const distinct = hasFiveDistinct(passer);
  const loserId = distinct ? challengerId : passer.id;

  const reveal: RevealResult = {
    faceCounts: countFaces([...passer.dice, ...passer.tableDice]),
    wildCount: 0,
    bidFace: WILD,
    bidQuantity: 0,
    effectiveCount: 0,
    bidWasTrue: distinct,
    loserIds: [loserId],
    kind: 'passo',
    passoWasDistinct: distinct,
  };

  const updatedPlayers = applyPenalty(state.players, reveal, state.rules);
  const remaining = updatedPlayers.filter((p) => !p.isEliminated);
  const winnerId = remaining.length === 1 ? remaining[0].id : null;

  return {
    ...state,
    players: updatedPlayers,
    phase: winnerId ? 'game_over' : 'round_end',
    lastReveal: reveal,
    winnerId,
    pendingPasso: null,
  };
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "feat(core): Passo action and dudoPasso resolution"
```

---

## Task 8: Mesa

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Adicionar a `engine.test.ts`:
```ts
import { mesa, passo as passo5, initGame as init5 } from '../engine';
import { RuleConfig as RC5 } from '../types';

const RULES5: RC5 = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('mesa', () => {
  it('move dados escolhidos para tableDice e re-sorteia o restante', () => {
    let g = init5(RULES5, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    g = { ...g, players: [{ ...g.players[0], dice: [6, 6, 2, 3, 4] }, g.players[1]] };
    const after = mesa(g, 'a', [0, 1]); // mostra os dois seis
    expect(after.players[0].tableDice).toEqual([6, 6]);
    expect(after.players[0].dice).toHaveLength(3); // restante re-sorteado
    expect(after.players[0].usedMesa).toBe(true);
    expect(after.currentPlayerIndex).toBe(0); // ainda é a vez de A (deve apostar)
  });
  it('Mesa bloqueia Passo na mesma rodada', () => {
    let g = init5(RULES5, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]] };
    g = mesa(g, 'a', []); // usa Mesa sem mostrar nada (re-sorteia tudo)
    expect(() => passo5(g, 'a')).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (`mesa` não existe).

- [ ] **Step 3: Implementar `mesa`**

Adicionar ao `engine.ts`:
```ts
export function mesa(state: GameState, playerId: string, indexesToShow: number[]): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.rules.mesaEnabled) throw new Error('Mesa desabilitada');
  const idx = state.currentPlayerIndex;
  const player = state.players[idx];
  if (player.id !== playerId) throw new Error('Não é a vez deste jogador');
  if (player.usedMesa) throw new Error('Mesa já usada nesta rodada');

  const shown: Face[] = [];
  const remaining: Face[] = [];
  player.dice.forEach((d, i) => {
    if (indexesToShow.includes(i)) shown.push(d);
    else remaining.push(d);
  });

  const updated: PlayerState = {
    ...player,
    tableDice: [...player.tableDice, ...shown],
    dice: rollDice(remaining.length),
    usedMesa: true,
  };

  const players = state.players.map((p, i) => (i === idx ? updated : p));
  return { ...state, players };
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "feat(core): Mesa action (reveal+reroll, blocks Passo)"
```

---

## Task 9: resolveManualDudo (Modo Físico)

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Adicionar a `engine.test.ts`:
```ts
import { resolveManualDudo, initGame as init6 } from '../engine';
import { RuleConfig as RC6 } from '../types';

const RULES6: RC6 = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('resolveManualDudo', () => {
  it('aplica penalidade ao perdedor escolhido e gera tally', () => {
    let g = init6(RULES6, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, { ...g.players[1], dice: [1, 1, 2, 2, 3] }] };
    const after = resolveManualDudo(g, 'b');
    expect(after.lastReveal?.kind).toBe('manual');
    expect(after.lastReveal?.loserIds).toEqual(['b']);
    expect(after.players[1].dice).toHaveLength(4); // B perdeu 1 dado
    expect(after.lastReveal?.faceCounts).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (`resolveManualDudo` não existe).

- [ ] **Step 3: Implementar `resolveManualDudo`**

Adicionar ao `engine.ts`:
```ts
export function resolveManualDudo(state: GameState, loserId: string): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.players.some((p) => p.id === loserId && !p.isEliminated)) {
    throw new Error('Perdedor inválido');
  }

  const allDice = state.players
    .filter((p) => !p.isEliminated)
    .flatMap((p) => [...p.dice, ...p.tableDice]);

  const reveal: RevealResult = {
    faceCounts: countFaces(allDice),
    wildCount: 0,
    bidFace: WILD,
    bidQuantity: 0,
    effectiveCount: 0,
    bidWasTrue: false,
    loserIds: [loserId],
    kind: 'manual',
  };

  const updatedPlayers = applyPenalty(state.players, reveal, state.rules);
  const remaining = updatedPlayers.filter((p) => !p.isEliminated);
  const winnerId = remaining.length === 1 ? remaining[0].id : null;

  return {
    ...state,
    players: updatedPlayers,
    phase: winnerId ? 'game_over' : 'round_end',
    lastReveal: reveal,
    winnerId,
    pendingPasso: null,
  };
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "feat(core): resolveManualDudo for physical mode"
```

---

## Task 10: nextRound reseta Mesa/Passo e re-sorteia o total

**Files:**
- Modify: `packages/game-core/src/engine.ts`
- Test: `packages/game-core/src/__tests__/engine.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Adicionar a `engine.test.ts`:
```ts
import { nextRound, initGame as init7 } from '../engine';
import { RuleConfig as RC7 } from '../types';

const RULES7: RC7 = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('nextRound reseta estado especial', () => {
  it('limpa tableDice/usedPasso/usedMesa e re-sorteia o total', () => {
    let g = init7(RULES7, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    g = {
      ...g,
      phase: 'round_end',
      lastReveal: { faceCounts: [], wildCount: 0, bidFace: 1, bidQuantity: 0, effectiveCount: 0, bidWasTrue: false, loserIds: ['a'], kind: 'bid' },
      players: [
        { ...g.players[0], dice: [6, 6], tableDice: [2, 3, 4], usedPasso: true, usedMesa: true },
        { ...g.players[1] },
      ],
    };
    const after = nextRound(g);
    expect(after.players[0].tableDice).toEqual([]);
    expect(after.players[0].usedPasso).toBe(false);
    expect(after.players[0].usedMesa).toBe(false);
    expect(after.players[0].dice).toHaveLength(5); // 2 privados + 3 da mesa
    expect(after.pendingPasso).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npm test`
Expected: FAIL (nextRound ignora tableDice e flags).

- [ ] **Step 3: Atualizar `nextRound`**

Substituir o `map` de jogadores e o `return` em `nextRound`:
```ts
  const updatedPlayers = state.players.map((p) =>
    p.isEliminated
      ? p
      : {
          ...p,
          dice: rollDice(p.dice.length + p.tableDice.length),
          tableDice: [],
          usedPasso: false,
          usedMesa: false,
        }
  );
```
E no objeto de retorno adicionar `pendingPasso: null`.

- [ ] **Step 4: Rodar e verificar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/game-core/src/engine.ts packages/game-core/src/__tests__/engine.test.ts
git commit -m "feat(core): reset Mesa/Passo state and reroll full hand in nextRound"
```

---

## Task 11: Verificação final do motor e build do app

**Files:**
- (nenhum novo)

- [ ] **Step 1: Rodar toda a suíte**

Run: `npm test`
Expected: PASS em todos os describes (initGame, isBidHigher, minOpeningQuantity, bid abertura, tableDice, hasFiveDistinct, passo/dudoPasso, mesa, resolveManualDudo, nextRound).

- [ ] **Step 2: Garantir que o app ainda compila**

Run: `npx tsc --noEmit`
Expected: PASS. Se houver erros, serão nas telas/stores que constroem `PlayerState`/`RuleConfig` sem os novos campos. Corrigir cada ocorrência adicionando os campos obrigatórios (`tableDice: []`, `usedPasso: false`, `usedMesa: false`, e em `RuleConfig`: `passoEnabled`/`mesaEnabled`). Locais prováveis: `src/store/gameStore.ts` (chamada de `initGame` via lista de players — ok, pois `initGame` agora preenche), `src/screens/PhysicalGameScreen.tsx` (constrói players para `initGame`), `src/store/onlineGameStore.ts` (interface local `PublicGameState` — adicionar campos se necessário). Ajustar `DEFAULT_RULES` já cobre os toggles.

- [ ] **Step 3: Build de bundle (sanity)**

Run: `npx expo export --platform android --dev`
Expected: "Exported: dist" sem erros.

- [ ] **Step 4: Commit (se houve ajustes de compilação)**

```bash
git add -A
git commit -m "fix: satisfy new PlayerState/RuleConfig fields across app"
```

---

## Self-Review

**Cobertura da spec (Plano 1 — escopo do motor):**
- Jargão (constantes DICE_FACE/FACE_NAMES) → Task 2 ✓
- Validação de bico (4 transições) → Task 4 ✓
- Aposta inicial mínima (2N-2 / N-1) → Task 5 ✓
- tableDice na contagem do Dudo → Task 6 ✓
- Passo + dudoPasso + mensagem distinct (`passoWasDistinct`) → Task 7 ✓
- Mesa (move+reroll, bloqueia Passo) → Task 8 ✓
- resolveManualDudo (físico) → Task 9 ✓
- Reset de estado especial em nextRound → Task 10 ✓
- Bug do initGame → Task 3 ✓

**Fora do escopo deste plano (vão para Planos 2 e 3):** RuleConfigScreen, RulesScreen, botões/telas, componentes compartilhados, servidor, aprovação de jogadores, Modo Físico em rede.

**Consistência de tipos:** `passoWasDistinct`/`kind` opcionais em `RevealResult`; `pendingPasso` em `GameState`; `tableDice/usedPasso/usedMesa` em `PlayerState`; `passoEnabled/mesaEnabled` em `RuleConfig` — usados consistentemente entre Tasks 2–10.
