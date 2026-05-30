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

import { hasFiveDistinct, passo, dudoPasso, initGame as init4 } from '../engine';
import { RuleConfig as RC4, PlayerState as PS4 } from '../types';

const RULES4: RC4 = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

function twoPlayers() {
  return init4(RULES4, [
    { id: 'a', name: 'A', isBot: false },
    { id: 'b', name: 'B', isBot: false },
  ]);
}

describe('hasFiveDistinct', () => {
  it('true para 5 dados distintos', () => {
    const p: PS4 = { id: 'a', name: 'A', dice: [1, 2, 3, 4, 5], tableDice: [], lives: 1, usedPasso: false, usedMesa: false, isBot: false, isEliminated: false };
    expect(hasFiveDistinct(p)).toBe(true);
  });
  it('false com repetição', () => {
    const p: PS4 = { id: 'a', name: 'A', dice: [1, 2, 3, 4, 4], tableDice: [], lives: 1, usedPasso: false, usedMesa: false, isBot: false, isEliminated: false };
    expect(hasFiveDistinct(p)).toBe(false);
  });
});

describe('passo / dudoPasso', () => {
  it('passo mantém aposta e avança turno', () => {
    let g = twoPlayers();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    const after = passo(g, 'a');
    expect(after.currentBid).toEqual({ quantity: 6, face: 3 });
    expect(after.players[0].usedPasso).toBe(true);
    expect(after.pendingPasso).toEqual({ playerId: 'a' });
    expect(after.currentPlayerIndex).toBe(1);
  });
  it('passo rejeitado sem 5 distintos', () => {
    let g = twoPlayers();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 1, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    expect(() => passo(g, 'a')).toThrow();
  });
  it('dudoPasso: passador honesto faz o duvidador perder', () => {
    let g = twoPlayers();
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]], currentBid: { quantity: 6, face: 3 } };
    g = passo(g, 'a'); // turno vai para b
    const after = dudoPasso(g, 'b');
    expect(after.lastReveal?.kind).toBe('passo');
    expect(after.lastReveal?.passoWasDistinct).toBe(true);
    expect(after.lastReveal?.loserIds).toContain('b');
  });
});

import { mesa, passo as passo5, initGame as init5 } from '../engine';
import { RuleConfig as RC5 } from '../types';

const RULES5: RC5 = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('mesa', () => {
  it('move dados escolhidos para tableDice e re-sorteia o restante', () => {
    let g = init5(RULES5, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    g = { ...g, players: [{ ...g.players[0], dice: [6, 6, 2, 3, 4] }, g.players[1]] };
    const after = mesa(g, 'a', [0, 1]); // mostra os dois seis
    expect(after.players[0].tableDice).toEqual([6, 6]);
    expect(after.players[0].dice).toHaveLength(3); // restante re-sorteado
    expect(after.players[0].usedMesa).toBe(true);
    expect(after.currentPlayerIndex).toBe(0); // ainda é a vez de A (deve apostar)
  });
  it('Mesa bloqueia Passo na mesma rodada', () => {
    let g = init5(RULES5, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, g.players[1]] };
    g = mesa(g, 'a', []); // usa Mesa sem mostrar nada (re-sorteia tudo)
    expect(() => passo5(g, 'a')).toThrow();
  });
});

import { resolveManualDudo, initGame as init6 } from '../engine';
import { RuleConfig as RC6 } from '../types';

const RULES6: RC6 = {
  punishmentMode: 'dice', startingLives: 3, startingDice: 5,
  wildEnabled: true, palificoEnabled: false, passoEnabled: true,
  mesaEnabled: true, turnTimerSeconds: null, revealBetweenRounds: false,
};

describe('resolveManualDudo', () => {
  it('aplica penalidade ao perdedor escolhido e gera tally', () => {
    let g = init6(RULES6, [
      { id: 'a', name: 'A', isBot: false },
      { id: 'b', name: 'B', isBot: false },
    ]);
    g = { ...g, players: [{ ...g.players[0], dice: [1, 2, 3, 4, 5] }, { ...g.players[1], dice: [1, 1, 2, 2, 3] }] };
    const after = resolveManualDudo(g, 'b');
    expect(after.lastReveal?.kind).toBe('manual');
    expect(after.lastReveal?.loserIds).toEqual(['b']);
    expect(after.players[1].dice).toHaveLength(4); // B perdeu 1 dado
    expect(after.lastReveal?.faceCounts).toHaveLength(6);
  });
});
