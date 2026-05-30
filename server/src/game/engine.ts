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
  // No modo físico não há turnos de aposta (são em voz alta), então qualquer
  // jogador ativo pode usar a Mesa. No online, só na sua vez.
  if (state.mode !== 'physical' && state.players[state.currentPlayerIndex].id !== playerId) {
    throw new Error('Não é sua vez');
  }
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0 || state.players[idx].isEliminated) throw new Error('Jogador inválido');
  const player = state.players[idx];
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
    id: p.id, name: p.name, diceCount: p.dice.length, tableDice: p.tableDice,
    lives: p.lives, usedPasso: p.usedPasso, usedMesa: p.usedMesa, isEliminated: p.isEliminated,
  }));
  return {
    roomCode: state.roomCode, rules: state.rules, players,
    currentBid: state.currentBid, currentPlayerId: state.players[state.currentPlayerIndex]?.id ?? null,
    phase: state.phase, lastReveal: state.lastReveal, winnerId: state.winnerId,
    palificoActive: state.palificoActive, pendingPasso: state.pendingPasso, roundNumber: state.roundNumber, hostId: state.hostId, mode: state.mode,
  };
}
