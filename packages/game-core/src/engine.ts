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

// ─── Início de Partida ────────────────────────────────────────────────────────

export function initGame(rules: RuleConfig, players: Omit<PlayerState, 'dice' | 'lives' | 'isEliminated'>[]): GameState {
  const initialDice = rules.punishmentMode === 'dice' ? rules.startingDice : rules.startingDice;
  const initialLives = rules.startingLives;

  const fullPlayers: PlayerState[] = players.map((p) => ({
    ...p,
    dice: rollDice(rules.punishmentMode === 'dice' ? initialDice : rules.startingDice),
    lives: rules.punishmentMode === 'lives' ? initialLives : 1,
    isEliminated: false,
  }));

  const palificoActive = isPalificoRound(fullPlayers, rules);

  return {
    rules,
    players: fullPlayers,
    currentBid: null,
    currentPlayerIndex: 0,
    phase: 'bidding',
    lastReveal: null,
    winnerId: null,
    palificoActive,
    roundNumber: 1,
  };
}

// ─── Ação: Apostar ────────────────────────────────────────────────────────────

export function bid(state: GameState, playerId: string, newBid: Bid): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase para apostar');

  const player = state.players[state.currentPlayerIndex];
  if (player.id !== playerId) throw new Error('Não é a vez deste jogador');

  if (!isBidHigher(state.currentBid, newBid)) {
    throw new Error('Aposta deve ser maior que a atual');
  }

  return {
    ...state,
    currentBid: newBid,
    currentPlayerIndex: nextActiveIndex(state, state.currentPlayerIndex),
  };
}

export function isBidHigher(current: Bid | null, next: Bid): boolean {
  if (!current) return true;
  if (next.quantity > current.quantity) return true;
  if (next.quantity === current.quantity && next.face > current.face) return true;
  return false;
}

// ─── Ação: Dudar ─────────────────────────────────────────────────────────────

export function dudo(state: GameState, playerId: string): GameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase para dudar');
  if (!state.currentBid) throw new Error('Ninguém apostou ainda');

  const challenger = state.players[state.currentPlayerIndex];
  if (challenger.id !== playerId) throw new Error('Não é a vez deste jogador');

  const revealResult = resolveChallenge(state);

  const updatedPlayers = applyPenalty(state.players, revealResult, state.rules);
  const eliminated = updatedPlayers.filter((p) => p.isEliminated);
  const remaining = updatedPlayers.filter((p) => !p.isEliminated);
  const winnerId = remaining.length === 1 ? remaining[0].id : null;

  return {
    ...state,
    players: updatedPlayers,
    phase: winnerId ? 'game_over' : 'round_end',
    lastReveal: revealResult,
    winnerId,
  };
}

function resolveChallenge(state: GameState): RevealResult {
  const bid = state.currentBid!;
  const allDice = state.players.filter((p) => !p.isEliminated).flatMap((p) => p.dice);
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
  };
}

function applyPenalty(players: PlayerState[], result: RevealResult, rules: RuleConfig): PlayerState[] {
  return players.map((p) => {
    if (!result.loserIds.includes(p.id)) return p;

    if (rules.punishmentMode === 'lives') {
      const newLives = p.lives - 1;
      const isEliminated = newLives <= 0;
      const newDiceCount = isEliminated ? 0 : p.dice.length;
      return {
        ...p,
        lives: Math.max(0, newLives),
        dice: isEliminated ? [] : rollDice(newDiceCount),
        isEliminated,
      };
    } else {
      const newDiceCount = p.dice.length - 1;
      const isEliminated = newDiceCount <= 0;
      return {
        ...p,
        dice: isEliminated ? [] : rollDice(newDiceCount),
        isEliminated,
      };
    }
  });
}

// ─── Próxima Rodada ───────────────────────────────────────────────────────────

export function nextRound(state: GameState): GameState {
  if (state.phase !== 'round_end') throw new Error('Partida não está em round_end');

  const updatedPlayers = state.players.map((p) =>
    p.isEliminated ? p : { ...p, dice: rollDice(p.dice.length) }
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
    roundNumber: state.roundNumber + 1,
  };
}
