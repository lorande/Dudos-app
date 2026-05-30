import { Bid, Face, GameState, isBidHigher } from '../../packages/game-core/src';

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
  const totalDice = active.reduce((s, p) => s + p.dice.length, 0);
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
  const newBid = formulateBid(currentBid, myDice, totalDice, p, level, state.palificoActive);
  return { action: 'bid', bid: newBid };
}

function formulateBid(
  current: Bid | null,
  myDice: Face[],
  totalDice: number,
  p: number,
  level: BotLevel,
  palificoActive: boolean
): Bid {
  const faces: Face[] = palificoActive ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];

  // Estimar quantidade "segura" baseada nos próprios dados
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of myDice) counts[d]++;

  let bestFace: Face = faces[Math.floor(Math.random() * faces.length)];
  if (level >= 2) {
    // Escolhe a face que o bot mais tem
    bestFace = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as unknown as Face);
    if (palificoActive && (bestFace as unknown as number) === 1) {
      bestFace = faces[1]; // evita coringa no palafico
    }
  }

  const myCount = counts[bestFace as unknown as number] ?? 0;
  // Estima que outros jogadores têm ~p * (totalDice - myDice.length) dessa face
  const estimatedOthers = Math.round(p * (totalDice - myDice.length));
  let quantity = myCount + estimatedOthers;

  if (level === 1) {
    quantity = Math.max(1, quantity + Math.floor((Math.random() - 0.3) * 2));
  }

  quantity = Math.max(1, quantity);

  const candidate: Bid = { quantity, face: bestFace };
  if (!current || isBidHigher(current, candidate)) {
    return candidate;
  }

  // Se não é maior, incrementa quantidade ou face
  if (current.face < 6) {
    return { quantity: current.quantity, face: (current.face + 1) as Face };
  }
  return { quantity: current.quantity + 1, face: faces[0] };
}

export function recordHumanWin(humanId: string): void {
  humanWins[humanId] = (humanWins[humanId] ?? 0) + 1;
}

export function getHumanWins(humanId: string): number {
  return humanWins[humanId] ?? 0;
}
