import { botDecide } from '../adaptiveBot';
import { initGame, isBidHigher, minOpeningQuantity } from '../../../packages/game-core/src';
import { DEFAULT_RULES, GameState } from '../../../packages/game-core/src';

function gameWith(botDice: number[][]): GameState {
  const g = initGame(DEFAULT_RULES, [
    { id: 'bot_0', name: 'B0', isBot: true },
    { id: 'bot_1', name: 'B1', isBot: true },
    { id: 'bot_2', name: 'B2', isBot: true },
    { id: 'bot_3', name: 'B3', isBot: true },
  ]);
  return {
    ...g,
    players: g.players.map((p, i) => ({ ...p, dice: botDice[i] as any })),
  };
}

describe('bot respeita regras de aposta', () => {
  it('abertura tem quantidade >= minimo (2N-2)', () => {
    const g = gameWith([[2, 2, 3, 4, 5], [1, 1, 1, 1, 1], [6, 6, 6, 2, 3], [4, 4, 5, 5, 6]]);
    const decision = botDecide({ ...g, currentBid: null, currentPlayerIndex: 0 }, 'bot_0', 0);
    expect(decision.action).toBe('bid');
    if (decision.action === 'bid') {
      const min = minOpeningQuantity(4, decision.bid.face);
      expect(decision.bid.quantity).toBeGreaterThanOrEqual(min);
    }
  });

  it('aposta de continuação é estritamente maior (isBidHigher)', () => {
    const g = gameWith([[2, 2, 3, 4, 5], [1, 1, 1, 1, 1], [6, 6, 6, 2, 3], [4, 4, 5, 5, 6]]);
    const current = { quantity: 6, face: 3 as const };
    const decision = botDecide({ ...g, currentBid: current, currentPlayerIndex: 0 }, 'bot_0', 0);
    if (decision.action === 'bid') {
      expect(isBidHigher(current, decision.bid)).toBe(true);
    }
  });
});
