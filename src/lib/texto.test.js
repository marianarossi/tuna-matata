import { describe, it, expect } from 'vitest';
import { plural, quantidadeComUnidade } from './texto.js';

describe('texto', () => {
  it('plural simples', () => {
    expect(plural('lata', 1)).toBe('lata');
    expect(plural('lata', 0)).toBe('latas');
    expect(plural('pacote', 3)).toBe('pacotes');
    expect(plural('kg', 2)).toBe('kg');
  });
  it('quantidade com unidade', () => {
    expect(quantidadeComUnidade(6, 'unidade')).toBe('6');
    expect(quantidadeComUnidade(2, 'lata')).toBe('2 latas');
    expect(quantidadeComUnidade(1, 'pacote')).toBe('1 pacote');
  });
});
