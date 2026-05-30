import { Bid, Face, GameState, isBidHigher, minOpeningQuantity } from '../../packages/game-core/src';

type BotLevel = 1 | 2 | 3;

// Acumula vitórias do humano para aumentar dificuldade
const humanWins: Record<string, number> = {};

function getBotLevel(botId: string, humanWinCount: number): BotLevel {
  if (humanWinCount >= 3) return 3;
  if (humanWinCount >= 1) return 2;
  return 1;
}

// Probabilidade binomial CDF: P(X >= k) dado n dados e p por dado
function pAtLeast(k: number, n: number, p: number): number {
  let prob = 0;
  const binomCoeff = (n: number, k: number): number => {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i) / (i + 1);
    }
    return result;
  };
  for (let i = k; i <= n; i++) {
    prob += binomCoeff(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
  }
  return prob;
}

export function botDecide(
  state: GameState,
  botId: string,
  humanWinCount = 0
): { action: 'bid'; bid: Bid } | { action: 'dudo' } {
  const level = getBotLevel(botId, humanWinCount);
  const active = state.players.filter((p) => !p.isEliminated);
  const totalDice = active.reduce((s, p) => s + p.dice.length + p.tableDice.length, 0);
  const activeCount = active.length;
  const bot = state.players.find((p) => p.id === botId)!;
  const myDice = bot.dice;
  const currentBid = state.currentBid;
  const wildEnabled = state.rules.wildEnabled && !state.palificoActive;
  const p = wildEnabled ? 2 / 6 : 1 / 6;

  // Nível 1: threshold alto para dudar (duda cedo demais / aleatório)
  const thresholds: Record<BotLevel, number> = { 1: 0.6, 2: 0.35, 3: 0.2 };
  const dudaThreshold = thresholds[level];

  if (currentBid) {
    const prob = pAtLeast(currentBid.quantity, totalDice, p);
    const noiseLevel1 = level === 1 ? (Math.random() - 0.5) * 0.3 : 0;
    if (prob + noiseLevel1 < dudaThreshold) {
      return { action: 'dudo' };
    }
  }

  // Formular nova aposta
  const newBid = formulateBid(currentBid, [...bot.dice, ...bot.tableDice], totalDice, p, level, state.palificoActive, activeCount, wildEnabled);
  return { action: 'bid', bid: newBid };
}

function formulateBid(
  current: Bid | null,
  myDice: Face[],
  totalDice: number,
  p: number,
  level: BotLevel,
  palificoActive: boolean,
  activeCount: number,
  wildActive: boolean
): Bid {
  // O bico (face 1) só é apostável quando o coringa está ativo e fora do palafico.
  const faces: Face[] = wildActive ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6];

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

  // Abertura: respeita o mínimo 2N-2 / N-1 / (palafico) 2N-1
  if (!current) {
    const min = minOpeningQuantity(activeCount, bestFace, palificoActive);
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

export function recordHumanWin(humanId: string): void {
  humanWins[humanId] = (humanWins[humanId] ?? 0) + 1;
}

export function getHumanWins(humanId: string): number {
  return humanWins[humanId] ?? 0;
}
