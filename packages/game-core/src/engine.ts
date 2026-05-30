import {
  Face,
  Bid,
  GameState,
  PlayerState,
  RevealResult,
  FaceCount,
  RuleConfig,
  WILD,
} from './types';

// ─── Utilitários ──────────────────────────────────────────────────────────────

export function rollDice(n: number): Face[] {
  return Array.from({ length: n }, () => (Math.floor(Math.random() * 6) + 1) as Face);
}

function countFaces(allDice: Face[]): FaceCount[] {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of allDice) counts[d]++;
  return ([1, 2, 3, 4, 5, 6] as Face[]).map((face) => ({ face, count: counts[face] }));
}

function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.isEliminated);
}

function nextActiveIndex(state: GameState, from: number): number {
  const total = state.players.length;
  let idx = (from + 1) % total;
  while (state.players[idx].isEliminated) {
    idx = (idx + 1) % total;
  }
  return idx;
}

function isPalificoRound(players: PlayerState[], rules: RuleConfig): boolean {
  if (!rules.palificoEnabled) return false;
  return players.some((p) => !p.isEliminated && p.dice.length === 1);
}

function finishRound(state: GameState, players: PlayerState[], reveal: RevealResult): GameState {
  const remaining = players.filter((p) => !p.isEliminated);
  const winnerId = remaining.length === 1 ? remaining[0].id : null;
  return {
    ...state,
    players,
    phase: winnerId ? 'game_over' : 'round_end',
    lastReveal: reveal,
    winnerId,
    pendingPasso: null,
  };
}

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
  return finishRound(state, updatedPlayers, reveal);
}

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
  return finishRound(state, updatedPlayers, reveal);
}

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

// ─── Início de Partida ────────────────────────────────────────────────────────

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

// ─── Ação: Apostar ────────────────────────────────────────────────────────────

export function bid(state: GameState, playerId: string, newBid: Bid): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase para apostar');

  const player = state.players[state.currentPlayerIndex];
  if (player.id !== playerId) throw new Error('Não é a vez deste jogador');

  if (state.currentBid === null) {
    const activeCount = state.players.filter((p) => !p.isEliminated).length;
    if (newBid.quantity < minOpeningQuantity(activeCount, newBid.face)) {
      throw new Error('Aposta de abertura abaixo do mínimo');
    }
  } else if (!isBidHigher(state.currentBid, newBid)) {
    throw new Error('Aposta deve ser maior que a atual');
  }

  return {
    ...state,
    currentBid: newBid,
    currentPlayerIndex: nextActiveIndex(state, state.currentPlayerIndex),
    pendingPasso: null,
  };
}

export function minOpeningQuantity(activeCount: number, face: Face): number {
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
  if (!curBico && nextBico) {
    return next.quantity >= Math.ceil(current.quantity / 2);
  }
  if (curBico && !nextBico) {
    return next.quantity >= 2 * current.quantity + 1;
  }
  return next.quantity > current.quantity; // bico -> bico
}

// ─── Ação: Dudar ─────────────────────────────────────────────────────────────

export function dudo(state: GameState, playerId: string): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase para dudar');
  if (!state.currentBid) throw new Error('Ninguém apostou ainda');

  const challenger = state.players[state.currentPlayerIndex];
  if (challenger.id !== playerId) throw new Error('Não é a vez deste jogador');

  const revealResult = resolveChallenge(state);

  const updatedPlayers = applyPenalty(state.players, revealResult, state.rules);
  return finishRound(state, updatedPlayers, revealResult);
}

function resolveChallenge(state: GameState): RevealResult {
  const bid = state.currentBid!;
  const allDice = state.players
    .filter((p) => !p.isEliminated)
    .flatMap((p) => [...p.dice, ...p.tableDice]);
  const faceCounts = countFaces(allDice);

  const wildCount =
    state.rules.wildEnabled && !state.palificoActive
      ? faceCounts.find((f) => f.face === WILD)?.count ?? 0
      : 0;

  const literalCount = faceCounts.find((f) => f.face === bid.face)?.count ?? 0;
  const effectiveCount = bid.face === WILD ? literalCount : literalCount + wildCount;
  const bidWasTrue = effectiveCount >= bid.quantity;

  // quem perde: se bid foi verdadeiro → quem duvidou; se falso → quem apostou (anterior)
  const active = state.players.filter((p) => !p.isEliminated);
  const challengerIndex = state.currentPlayerIndex;
  const challengerId = state.players[challengerIndex].id;

  // o apostador é o jogador anterior na ordem ativa
  const activeIds = active.map((p) => p.id);
  const challengerPosInActive = activeIds.indexOf(challengerId);
  const bidderPosInActive = (challengerPosInActive - 1 + activeIds.length) % activeIds.length;
  const bidderId = activeIds[bidderPosInActive];

  const loserIds = bidWasTrue ? [challengerId] : [bidderId];

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
}

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

// ─── Próxima Rodada ───────────────────────────────────────────────────────────

export function nextRound(state: GameState): GameState {
  if (state.phase !== 'round_end') throw new Error('Partida não está em round_end');

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

  const palificoActive = isPalificoRound(updatedPlayers, state.rules);

  // começa a próxima rodada pelo perdedor (se ainda ativo), ou o próximo
  const loserId = state.lastReveal?.loserIds[0];
  const loserIndex = loserId ? updatedPlayers.findIndex((p) => p.id === loserId) : 0;
  const startIndex = updatedPlayers[loserIndex]?.isEliminated
    ? nextActiveIndex({ ...state, players: updatedPlayers }, loserIndex)
    : loserIndex;

  return {
    ...state,
    players: updatedPlayers,
    currentBid: null,
    currentPlayerIndex: startIndex,
    phase: 'bidding',
    lastReveal: null,
    palificoActive,
    pendingPasso: null,
    roundNumber: state.roundNumber + 1,
  };
}
