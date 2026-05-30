import { initServerGame } from '../engine';
import { RuleConfig } from '../types';

const RULES: RuleConfig = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: true, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('smoke', () => {
  it('initServerGame cria N jogadores', () => {
    const g = initServerGame(RULES, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 'ABC123', 'a');
    expect(g.players).toHaveLength(2);
  });
});
