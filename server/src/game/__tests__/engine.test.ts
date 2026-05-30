import {
  initServerGame, isBidHigher, minOpeningQuantity, applyBid,
  applyPasso, applyDudoPasso, applyMesa, applyManualDudo, applyNextRound,
} from '../engine';
import { RuleConfig, ServerGameState } from '../types';

const RULES: RuleConfig = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

function two(): ServerGameState {
  return initServerGame(RULES, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 'ABC123', 'a');
}

describe('paridade do motor (servidor)', () => {
  it('player começa com campos novos', () => {
    const g = two();
    expect(g.players[0].tableDice).toEqual([]);
    expect(g.players[0].usedPasso).toBe(false);
    expect(g.mode).toBe('online');
  });
  it('isBidHigher bico: normal->bico teto(q/2)', () => {
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 3, face: 1 })).toBe(true);
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 2, face: 1 })).toBe(false);
  });
  it('minOpeningQuantity: 2N-2 / N-1 / palafico N-1', () => {
    expect(minOpeningQuantity(4, 6, false)).toBe(6);
    expect(minOpeningQuantity(4, 1, false)).toBe(3);
    expect(minOpeningQuantity(4, 6, true)).toBe(3);
  });
  it('passo + dudoPasso honesto faz duvidador perder', () => {
    let g = two();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    g = applyPasso(g, 'a');
    const after = applyDudoPasso(g, 'b');
    expect(after.lastReveal?.kind).toBe('passo');
    expect(after.lastReveal?.loserIds).toContain('b');
  });
  it('mesa move dados e bloqueia passo', () => {
    let g = two();
    g = { ...g, players: [{ ...g.players[0], dice: [6, 6, 2, 3, 4] }, g.players[1]] };
    g = applyMesa(g, 'a', [0, 1]);
    expect(g.players[0].tableDice).toEqual([6, 6]);
    expect(() => applyPasso(g, 'a')).toThrow();
  });
  it('manual dudo penaliza o escolhido', () => {
    let g = two();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, { ...g.players[1], dice: [1, 1, 2, 2, 3] }] };
    const after = applyManualDudo(g, 'b');
    expect(after.lastReveal?.kind).toBe('manual');
    expect(after.players[1].dice).toHaveLength(4);
  });
});
