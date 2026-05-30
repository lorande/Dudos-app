# Design: Regras Avançadas do Dudos

**Data:** 2026-05-29
**Status:** Aprovado para planejamento

## Context

O Dudos hoje implementa uma versão simplificada de Liar's Dice: aposta de quantidade+face, dudo, coringa (face 1) e Palafico. Faltam mecânicas centrais do jogo real que o usuário joga presencialmente:

1. **Aposta inicial obrigatória com mínimo** baseado no número de jogadores.
2. **Conversão correta para/de bico** (coringa) seguindo a regra clássica de "ases" do Perudo.
3. **Jargão brasileiro** das faces (bico, duque, terno, quadra, quina, sena).
4. **Regras especiais** configuráveis: além do Palafico, adicionar **Passo** e **Mesa**.

Estas mudanças afetam três camadas: o texto exibido (RulesScreen), o motor de jogo (`game-core`) e as telas de jogo (local, físico, online) + servidor.

## Jargão das Faces

| Valor | Nome |
|---|---|
| 1 | **Bico** (coringa) |
| 2 | **Duque** |
| 3 | **Terno** |
| 4 | **Quadra** |
| 5 | **Quina** |
| 6 | **Sena** |

Centralizar em `game-core` um array `FACE_NAMES` e o array `DICE_FACE` (símbolos ⚀–⚅), eliminando as 5 duplicações atuais espalhadas pelas telas.

## Aposta Inicial

- Quem abre a rodada **deve apostar** — não pode dudar sem aposta na mesa.
- Quantidade mínima de abertura:
  - Face normal (2–6): **2N − 2**, onde N = número de jogadores ativos.
  - Bico (face 1): **N − 1** (equivalente a teto((2N−2)/2), portanto consistente).
- Aplica-se à primeira aposta de **cada** rodada.

## Validação de Apostas (regra do bico)

Reescrever `isBidHigher(current, next)` para tratar bico como trilha separada:

| De → Para | Aposta válida quando |
|---|---|
| normal → normal | `next.quantity > current.quantity`, ou `next.quantity == current.quantity && next.face > current.face` |
| normal(q) → bico | `bicos >= teto(q / 2)` |
| bico(Y) → normal | `quantity >= 2*Y + 1` (qualquer face 2–6) |
| bico → bico | `next.quantity > current.quantity` |

Texto de regra exibido: "A aposta é válida somente se a quantidade for maior e/ou a face for maior."

## Regras Especiais (renomeia "Palafico")

A configuração passa a ter a seção **"Regras Especiais"** com **três toggles independentes**:

### Palafico (já existente)
Quando qualquer jogador ativo fica com 1 dado, a rodada vira Palafico: o bico não conta como coringa, apenas a face literal vale.

### Passo (novo)
- **Pré-condição:** é a vez do jogador, ele possui **5 dados distintos** (5 dados, todos com valores diferentes), e ainda não usou Passo nesta rodada.
- **Ação:** declara "Passo" — pula a vez sem apostar; a aposta atual permanece inalterada; o turno passa ao próximo jogador.
- **Sujeito a Dudo:** o próximo jogador pode "Dudar o Passo". Resolução:
  - Se o passador realmente tem 5 dados distintos → quem duvidou perde 1 vida/dado.
  - Caso contrário → o passador perde 1 vida/dado.
- **Frequência:** 1× por rodada por jogador.
- A verificação de "5 distintos" considera `dice + tableDice` (mão completa do jogador).

### Mesa (novo)
- **Pré-condição:** é a vez do jogador e ele ainda não usou Mesa nesta rodada.
- **Ação:** escolhe qualquer quantidade dos seus dados privados, revela os valores na **mesa** (públicos a todos), re-sorteia os dados privados restantes e **em seguida faz uma aposta** (obrigatória).
- Os dados na mesa **continuam contando** na contagem ao resolver um Dudo, e ficam visíveis pelo resto da rodada.
- **Frequência:** 1× por rodada por jogador.
- **Restrição:** ao usar Mesa, o jogador **não pode mais usar Passo** naquela rodada (Mesa desabilita Passo; Passo não desabilita Mesa).

## Modelo de Dados (`packages/game-core/src/types.ts`)

```ts
// RuleConfig
- palificoEnabled: boolean
+ palificoEnabled: boolean   // mantém
+ passoEnabled: boolean      // novo
+ mesaEnabled: boolean       // novo

// PlayerState
+ tableDice: Face[]   // dados na mesa, públicos, persistem na rodada
+ usedPasso: boolean  // reset a cada rodada
+ usedMesa: boolean   // reset a cada rodada

// Constantes exportadas
+ export const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
+ export const FACE_NAMES = ['', 'Bico', 'Duque', 'Terno', 'Quadra', 'Quina', 'Sena'];
```

Contagem total de uma face ao resolver Dudo = soma de `dice + tableDice` de todos os jogadores ativos (bico conta como coringa exceto em Palafico).

## Motor (`packages/game-core/src/engine.ts`)

Funções novas/modificadas:

- `isBidHigher` — reescrita com a tabela do bico acima.
- `minOpeningQuantity(activeCount, face)` — retorna `2N-2` (normal) ou `N-1` (bico). Nova função exportada.
- `bid()` — valida mínimo de abertura quando `currentBid == null`.
- `passo(state, playerId)` — valida pré-condições, marca `usedPasso`, avança turno mantendo a aposta. Registra que houve um Passo pendente passível de Dudo.
- `dudoPasso(state, challengerId)` — resolve o desafio ao Passo (checa 5 distintos).
- `mesa(state, playerId, diceIndexesToShow)` — move dados para `tableDice`, re-sorteia restantes, marca `usedMesa`, bloqueia Passo. O jogador segue obrigado a apostar na sequência.
- `nextRound()` — resetar `tableDice=[]`, `usedPasso=false`, `usedMesa=false`; devolver os `tableDice` à contagem de dados do jogador antes de re-sortear.
- `hasFiveDistinct(player)` — helper para a pré-condição do Passo.

Corrigir também o bug existente em `initGame` (`punishmentMode === 'dice' ? startingDice : startingDice` — ambos os ramos iguais).

## Configuração (`src/screens/RuleConfigScreen.tsx`)

- Renomear seção de "Palafico" para **"Regras Especiais"** com três `ToggleRow`: Palafico, Passo, Mesa.
- `DEFAULT_RULES` atualizado com `passoEnabled` e `mesaEnabled` (sugerido: ambos `true`).

## UI de Jogo (GameScreen, PhysicalGameScreen, OnlineGameScreen)

- **Botão "Passo"** — visível/habilitado apenas quando `passoEnabled`, é a vez do jogador, tem 5 distintos e `!usedPasso`.
- **Botão "Dudar Passo"** — aparece para o próximo jogador quando há um Passo pendente.
- **Botão "Mesa"** — visível/habilitado quando `mesaEnabled`, é a vez do jogador e `!usedMesa`; abre um seletor dos próprios dados; após confirmar, força o fluxo de aposta.
- **Exibição da mesa** — mostrar os `tableDice` públicos de cada jogador no `playerChip`.
- Extrair componentes compartilhados para reduzir duplicação: `FacePicker`, `PlayerChip`, `DiceRow`.

## Servidor (`server/`)

- Espelhar as mudanças de `types.ts` e `engine.ts` no `server/src/game/`.
- Novos eventos Socket.IO: `game:passo`, `game:dudo_passo`, `game:mesa`.
- Servidor continua autoridade; re-sorteio da Mesa acontece no servidor e os novos dados privados são reenviados via `game:your_dice`.

## RulesScreen (`src/screens/RulesScreen.tsx`)

Reescrever as seções com o novo jargão e a seção "Regras Especiais" (Palafico, Passo, Mesa), incluindo as fórmulas de aposta válida e conversão de bico.

## Testes

- Unitários em `game-core` para: `isBidHigher` (todas as 4 transições), `minOpeningQuantity`, `hasFiveDistinct`, `passo`/`dudoPasso`, `mesa` (contagem com `tableDice`), reset de flags em `nextRound`.
- Verificação manual end-to-end: partida com bots exercitando Passo e Mesa; partida física; partida online com dois clientes.

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `packages/game-core/src/types.ts` | RuleConfig, PlayerState, constantes |
| `packages/game-core/src/engine.ts` | validação, opening min, passo, mesa, helpers |
| `src/screens/RuleConfigScreen.tsx` | seção Regras Especiais (3 toggles) |
| `src/screens/RulesScreen.tsx` | texto + jargão |
| `src/screens/GameScreen.tsx` | botões Passo/Mesa, exibição mesa |
| `src/screens/PhysicalGameScreen.tsx` | idem |
| `src/screens/OnlineGameScreen.tsx` | idem |
| `src/components/` (novos) | FacePicker, PlayerChip, DiceRow |
| `src/store/gameStore.ts` / `onlineGameStore.ts` | ações passo/mesa |
| `server/src/game/{types,engine}.ts` | espelhar engine |
| `server/src/index.ts` | eventos passo/mesa |

## Decisões em Aberto (defaults assumidos)

- Bots: na primeira versão, **não** usarão Passo/Mesa (jogam só bid/dudo). Pode ser incrementado depois.
- Passo→Mesa permanece permitido (só Mesa→Passo é bloqueado), conforme instrução explícita.
