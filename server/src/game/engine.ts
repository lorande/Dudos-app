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

export function isBidHigher(
  current: Bid | null,
  next: Bid,
  palificoActive = false,
  faceBeforeBico: Face | null = null
): boolean {
  if (!current) return true;
  if (palificoActive) {
    return next.face === current.face && next.quantity > current.quantity;
  }
  const curBico = current.face === WILD;
  const nextBico = next.face === WILD;
  if (!curBico && !nextBico) {
    if (next.face < current.face) return false;
    if (next.quantity > current.quantity) return true;
    if (next.quantity === current.quantity && next.face > current.face) return true;
    return false;
  }
  if (!curBico && nextBico) return next.quantity >= Math.ceil(current.quantity / 2);
  if (curBico && !nextBico) {
    if (next.quantity < 2 * current.quantity + 1) return false;
    if (faceBeforeBico != null && next.face < faceBeforeBico) return false;
    return true;
  }
  return next.quantity > current.quantity;
}

function nextFaceBeforeBico(current: Bid | null, next: Bid, prev: Face | null): Face | null {
  if (next.face !== WILD) return null;
  if (current && current.face !== WILD) return current.face;
  return prev;
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
    pendingPasso: null, faceBeforeBico: null, revealing: false, roundNumber: 1, hostId, mode,
  };
}

// Físico: revela a contagem de todos os dados antes de atribuir o perdedor.
export function applyReveal(state: ServerGameState): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  const allDice = state.players.filter((p) => !p.isEliminated).flatMap((p) => [...p.dice, ...p.tableDice]);
  const reveal: RevealResult = {
    faceCounts: countFaces(allDice), wildCount: 0, bidFace: WILD,
    bidQuantity: 0, effectiveCount: 0, bidWasTrue: false, loserIds: [], kind: 'manual',
  };
  return { ...state, lastReveal: reveal, revealing: true };
}

function finishRound(state: ServerGameState, players: ServerPlayer[], reveal: RevealResult): ServerGameState {
  const remaining = players.filter((p) => !p.isEliminated);
  const winnerId = remaining.length === 1 ? remaining[0].id : null;
  return { ...state, players, phase: winnerId ? 'game_over' : 'round_end', lastReveal: reveal, winnerId, pendingPasso: null, revealing: false };
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
  } else if (!isBidHigher(state.currentBid, newBid, state.palificoActive, state.faceBeforeBico)) {
    throw new Error('Aposta deve ser maior');
  }
  return {
    ...state, currentBid: newBid,
    currentPlayerIndex: nextActiveIndex(state.players, state.currentPlayerIndex),
    pendingPasso: null,
    faceBeforeBico: nextFaceBeforeBico(state.currentBid, newBid, state.faceBeforeBico),
  };
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

// Todas as faces distintas, considerando mão + dados na mesa.
export function hasFiveDistinct(player: ServerPlayer): boolean {
  const all = [...player.dice, ...player.tableDice];
  if (all.length < 2) return false;
  return new Set(all).size === all.length;
}

export function applyPasso(state: ServerGameState, playerId: string): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.rules.passoEnabled) throw new Error('Passo desabilitado');
  const player = state.players[state.currentPlayerIndex];
  if (player.id !== playerId) throw new Error('Não é sua vez');
  if (player.usedPasso) throw new Error('Passo já usado');
  // Blefe permitido mesmo após a Mesa: a distinção (mão + mesa) só é
  // verificada se o Passo for dudado.
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

// Re-sorteia os dados de todos, limpa a mesa e inicia a próxima rodada pelo perdedor.
function startFreshRound(state: ServerGameState, players: ServerPlayer[], loserId: string | undefined): ServerGameState {
  const updatedPlayers = players.map((p) =>
    p.isEliminated ? p : { ...p, dice: rollDice(p.dice.length + p.tableDice.length), tableDice: [], usedPasso: false, usedMesa: false }
  );
  const palificoActive = isPalificoRound(updatedPlayers, state.rules);
  const loserIdx = loserId ? updatedPlayers.findIndex((p) => p.id === loserId) : 0;
  const startIdx = (loserIdx >= 0 && updatedPlayers[loserIdx]?.isEliminated) ? nextActiveIndex(updatedPlayers, loserIdx) : Math.max(0, loserIdx);
  return { ...state, players: updatedPlayers, currentBid: null, currentPlayerIndex: startIdx, phase: 'bidding', lastReveal: null, palificoActive, pendingPasso: null, faceBeforeBico: null, revealing: false, roundNumber: state.roundNumber + 1 };
}

export function applyManualDudo(state: ServerGameState, loserId: string): ServerGameState {
  if (state.phase !== 'bidding') throw new Error('Fora de fase');
  if (!state.players.some((p) => p.id === loserId && !p.isEliminated)) throw new Error('Perdedor inválido');
  const allDice = state.players.filter((p) => !p.isEliminated).flatMap((p) => [...p.dice, ...p.tableDice]);
  const reveal: RevealResult = { faceCounts: countFaces(allDice), wildCount: 0, bidFace: WILD, bidQuantity: 0, effectiveCount: 0, bidWasTrue: false, loserIds: [loserId], kind: 'manual' };
  const penalized = applyPenalty(state.players, reveal, state.rules);
  const remaining = penalized.filter((p) => !p.isEliminated);
  // Fim de jogo: mantém o resultado para a tela final.
  if (remaining.length === 1) {
    return { ...state, players: penalized, phase: 'game_over', lastReveal: reveal, winnerId: remaining[0].id, pendingPasso: null, revealing: false };
  }
  // Físico: re-sorteia os dados automaticamente e segue para a próxima rodada.
  return startFreshRound(state, penalized, loserId);
}

export function applyNextRound(state: ServerGameState): ServerGameState {
  if (state.phase !== 'round_end') throw new Error('Não está em round_end');
  return startFreshRound(state, state.players, state.lastReveal?.loserIds[0]);
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
    palificoActive: state.palificoActive, pendingPasso: state.pendingPasso, faceBeforeBico: state.faceBeforeBico, revealing: state.revealing, roundNumber: state.roundNumber, hostId: state.hostId, mode: state.mode,
  };
}
