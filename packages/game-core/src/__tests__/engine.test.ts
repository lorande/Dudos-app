import { rollDice } from '../engine';

describe('smoke', () => {
  it('rollDice retorna a quantidade pedida', () => {
    expect(rollDice(5)).toHaveLength(5);
  });
});

import { initGame } from '../engine';
import { DEFAULT_RULES } from '../types';

describe('initGame', () => {
  it('inicializa novos campos por jogador e estado', () => {
    const g = initGame(DEFAULT_RULES, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    expect(g.players[0].tableDice).toEqual([]);
    expect(g.players[0].usedPasso).toBe(false);
    expect(g.players[0].usedMesa).toBe(false);
    expect(g.players[0].dice).toHaveLength(DEFAULT_RULES.startingDice);
    expect(g.pendingPasso).toBeNull();
  });
});

import { isBidHigher } from '../engine';

describe('isBidHigher (bico)', () => {
  it('primeira aposta é sempre válida', () => {
    expect(isBidHigher(null, { quantity: 3, face: 4 })).toBe(true);
  });
  it('normal -> normal: quantidade maior', () => {
    expect(isBidHigher({ quantity: 3, face: 4 }, { quantity: 4, face: 2 })).toBe(true);
  });
  it('normal -> normal: mesma quantidade, face maior', () => {
    expect(isBidHigher({ quantity: 3, face: 4 }, { quantity: 3, face: 5 })).toBe(true);
    expect(isBidHigher({ quantity: 3, face: 4 }, { quantity: 3, face: 3 })).toBe(false);
  });
  it('normal -> bico: precisa de teto(q/2) bicos', () => {
    // q=5 -> ceil(2.5)=3
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 3, face: 1 })).toBe(true);
    expect(isBidHigher({ quantity: 5, face: 6 }, { quantity: 2, face: 1 })).toBe(false);
  });
  it('bico -> normal: precisa de 2*Y+1', () => {
    // Y=3 -> 7
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 7, face: 2 })).toBe(true);
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 6, face: 6 })).toBe(false);
  });
  it('bico -> bico: mais bicos', () => {
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 4, face: 1 })).toBe(true);
    expect(isBidHigher({ quantity: 3, face: 1 }, { quantity: 3, face: 1 })).toBe(false);
  });
});
