import { rollDice } from '../engine';

describe('smoke', () => {
  it('rollDice retorna a quantidade pedida', () => {
    expect(rollDice(5)).toHaveLength(5);
  });
});
