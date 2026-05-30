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

function activePlayers(state: ServerGameState): ServerPlayer[] {
  return state.players.filter((p) => !p.isEliminated);
}

function nextActiveIndex(players: ServerPlayer[], from: number): number {
  const total = players.length;
  let idx = (from + 1) % total;
  while (players[idx].isEliminated) idx = (idx + 1) % total;
  return idx;
}

function isPalificoRound(players: ServerPlayer[], rules: RuleConfig): boolean {
  if (!rules.palificoEnabled) return false;
  return players.some((p) => !p.isEliminated && p.dice.length === 1);
}

export function initServerGame(
  rules: RuleConfig,
  players: { id: string; name: string }[],
  roomCode: string,
  hostId: string
): ServerGameState {
  const dicePerPlayer = rules.punishmentMode === 'dice' ? rules.startingDice : rules.startingDice;
  const fullPlayers: ServerPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    dice: rollDice(dicePerPlayer),
    lives: rules.punishmentMode === 'lives' ? rules.startingLives : 1,
    isEliminated: false,
  }));

  return {
    roomCode,
    rules,
    players: fullPlayers,
    currentBid: null,
    currentPlayerIndex: 0,
    phase: 'bidding',
    lastReveal: null,
    winnerId: null,
    palificoActive: isPalificoRound(fullPlayers, rules),
    roundNumber: 1,
    hostId,
  };
}

export function isBidHigher(current: Bid | null, next: Bid): boolean {
  if (!current) return true;
  if (next.quantity > current.quantity) return true;
  if (next.quantity === current.quantity && next.face > current.face) return true;
  return false;
}

export function applyBid(state: ServerGameState, playerId: string, newBid: Bid): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  const current = state.players[state.currentPlayerIndex];
  if (current.id !== playerId) throw new Error('Não é sua vez');
  if (!isBidHigher(state.currentBid, newBid)) throw new Error('Aposta deve ser maior');

  return {
    ...state,
    currentBid: newBid,
    currentPlayerIndex: nextActiveIndex(state.players, state.currentPlayerIndex),
  };
}

export function applyDudo(state: ServerGameState, playerId: string): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.currentBid) throw new Error('Ninguém apostou ainda');
  const current = state.players[state.currentPlayerIndex];
  if (current.id !== playerId) throw new Error('Não é sua vez');

  const reveal = resolveChallenge(state);
  const updatedPlayers = applyPenalty(state.players, reveal, state.rules);
  const remaining = updatedPlayers.filter((p) => !p.isEliminated);
  const winnerId = remaining.length === 1 ? remaining[0].id : null;

  return {
    ...state,
    players: updatedPlayers,
    phase: winnerId ? 'game_over' : 'round_end',
    lastReveal: reveal,
    winnerId,
  };
}

function resolveChallenge(state: ServerGameState): RevealResult {
  const bid = state.currentBid!;
  const active = state.players.filter((p) => !p.isEliminated);
  const allDice = active.flatMap((p) => p.dice);
  const faceCounts = countFaces(allDice);

  const wildCount =
    state.rules.wildEnabled && !state.palificoActive
      ? (faceCounts.find((f) => f.face === WILD)?.count ?? 0)
      : 0;

  const literalCount = faceCounts.find((f) => f.face === bid.face)?.count ?? 0;
  const effectiveCount = bid.face === WILD ? literalCount : literalCount + wildCount;
  const bidWasTrue = effectiveCount >= bid.quantity;

  const activeIds = active.map((p) => p.id);
  const challengerIdx = activeIds.indexOf(state.players[state.currentPlayerIndex].id);
  const bidderIdx = (challengerIdx - 1 + activeIds.length) % activeIds.length;

  const loserIds = bidWasTrue ? [activeIds[challengerIdx]] : [activeIds[bidderIdx]];

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

function applyPenalty(
  players: ServerPlayer[],
  result: RevealResult,
  rules: RuleConfig
): ServerPlayer[] {
  return players.map((p) => {
    if (!result.loserIds.includes(p.id)) return p;

    if (rules.punishmentMode === 'lives') {
      const newLives = Math.max(0, p.lives - 1);
      const isEliminated = newLives <= 0;
      return {
        ...p,
        lives: newLives,
        dice: isEliminated ? [] : rollDice(p.dice.length),
        isEliminated,
      };
    } else {
      const newCount = p.dice.length - 1;
      const isEliminated = newCount <= 0;
      return {
        ...p,
        dice: isEliminated ? [] : rollDice(newCount),
        isEliminated,
      };
    }
  });
}

export function applyNextRound(state: ServerGameState): ServerGameState {
  if (state.phase !== 'round_end') throw new Error('Não está em round_end');

  const updatedPlayers = state.players.map((p) =>
    p.isEliminated ? p : { ...p, dice: rollDice(p.dice.length) }
  );

  const palificoActive = isPalificoRound(updatedPlayers, state.rules);
  const loserId = state.lastReveal?.loserIds[0];
  const loserIdx = loserId ? updatedPlayers.findIndex((p) => p.id === loserId) : 0;
  const startIdx = updatedPlayers[loserIdx]?.isEliminated
    ? nextActiveIndex(updatedPlayers, loserIdx)
    : loserIdx;

  return {
    ...state,
    players: updatedPlayers,
    currentBid: null,
    currentPlayerIndex: startIdx,
    phase: 'bidding',
    lastReveal: null,
    palificoActive,
    roundNumber: state.roundNumber + 1,
  };
}

export function toPublicState(state: ServerGameState): PublicGameState {
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    diceCount: p.dice.length,
    lives: p.lives,
    isEliminated: p.isEliminated,
  }));

  return {
    roomCode: state.roomCode,
    rules: state.rules,
    players,
    currentBid: state.currentBid,
    currentPlayerId: state.players[state.currentPlayerIndex]?.id ?? null,
    phase: state.phase,
    lastReveal: state.lastReveal,
    winnerId: state.winnerId,
    palificoActive: state.palificoActive,
    roundNumber: state.roundNumber,
    hostId: state.hostId,
  };
}
