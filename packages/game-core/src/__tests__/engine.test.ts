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

import { minOpeningQuantity, bid, initGame as init2 } from '../engine';
import { DEFAULT_RULES as R2 } from '../types';

describe('minOpeningQuantity', () => {
  it('normal = 2N-2, bico = N-1', () => {
    expect(minOpeningQuantity(4, 6)).toBe(6);
    expect(minOpeningQuantity(4, 1)).toBe(3);
  });
});

describe('bid abertura', () => {
  const make = () =>
    init2(R2, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
      { id: 'c', name: 'C', isBot: false },
      { id: 'd', name: 'D', isBot: false },
    ]);

  it('rejeita abertura abaixo de 2N-2', () => {
    const g = make();
    expect(() => bid(g, 'a', { quantity: 5, face: 3 })).toThrow();
  });
  it('aceita abertura em 2N-2', () => {
    const g = make();
    const g2 = bid(g, 'a', { quantity: 6, face: 3 });
    expect(g2.currentBid).toEqual({ quantity: 6, face: 3 });
  });
});

import { dudo, bid as bid3, initGame as init3 } from '../engine';
import { RuleConfig } from '../types';

const RULES_NO_PALIFICO: RuleConfig = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('tableDice conta no Dudo', () => {
  it('dados na mesa entram na contagem', () => {
    let g = init3(RULES_NO_PALIFICO, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    // Força mãos determinísticas
    g = {
      ...g,
      players: [
        { ...g.players[0], dice: [4, 4], tableDice: [4] },
        { ...g.players[1], dice: [2, 3], tableDice: [] },
      ],
      currentBid: { quantity: 3, face: 4 },
      currentPlayerIndex: 1, // B duda
    };
    const after = dudo(g, 'b');
    // 3 quadras existem (2 na mão de A + 1 na mesa) -> aposta verdadeira -> B perde
    expect(after.lastReveal?.bidWasTrue).toBe(true);
    expect(after.lastReveal?.loserIds).toContain('b');
  });
});
