import { describe, it, expect } from 'vitest';
import { gerarId, validarIngredientes, planejarSeed, ordenarPorNome } from './ingredientes.js';

describe('gerarId', () => {
  it('vira slug sem acento', () => {
    expect(gerarId('Cebola roxa')).toBe('cebola-roxa');
    expect(gerarId('  Feijão   preto! ')).toBe('feijao-preto');
    expect(gerarId('Pimentão')).toBe('pimentao');
  });
});

describe('validarIngredientes', () => {
  const ok = { id: 'atum', nome: 'Atum', emoji: '🐟', unidade: 'lata', estoque: 1 };

  it('aceita uma lista boa', () => {
    expect(validarIngredientes([ok, { id: 'sal', nome: 'Sal', emoji: '🧂', unidade: 'pacote', basico: true }])).toEqual([]);
  });

  it('acusa id ruim, repetido, campos faltando e estoque não inteiro', () => {
    const erros = validarIngredientes([
      ok,
      { ...ok },
      { id: 'Cebola Roxa', nome: 'Cebola', emoji: '🧅', unidade: 'unidade' },
      { id: 'tomate', nome: '', emoji: '', unidade: '' },
      { id: 'ovo', nome: 'Ovo', emoji: '🥚', unidade: 'unidade', estoque: 1.5 },
      { id: 'leite', nome: 'Leite', emoji: '🥛', unidade: 'caixa', estoque: -1 },
    ]);
    expect(erros.some((e) => e.includes('id repetido'))).toBe(true);
    expect(erros.some((e) => e.includes('Cebola Roxa'))).toBe(true);
    expect(erros.filter((e) => e.includes('(tomate)'))).toHaveLength(3);
    expect(erros.some((e) => e.includes('(ovo)') && e.includes('inteiro'))).toBe(true);
    expect(erros.some((e) => e.includes('(leite)') && e.includes('inteiro'))).toBe(true);
  });

  it('acusa quando não é lista', () => {
    expect(validarIngredientes(undefined)).toHaveLength(1);
  });
});

describe('planejarSeed', () => {
  const lista = [
    { id: 'atum', nome: 'Atum', emoji: '🐟', unidade: 'lata', estoque: 3 },
    { id: 'massa', nome: 'Massa', emoji: '🍝', unidade: 'pacote' },
    { id: 'sal', nome: 'Sal', emoji: '🧂', unidade: 'pacote', basico: true, estoque: 5 },
  ];

  it('nunca mexe no estoque de quem já existe', () => {
    const [atum] = planejarSeed(lista, ['atum']);
    expect(atum.novo).toBe(false);
    expect(atum.dados).not.toHaveProperty('estoque');
  });

  it('novo entra com o estoque do arquivo ou 0; básico sem estoque', () => {
    const [atum, massa, sal] = planejarSeed(lista, []);
    expect(atum.dados.estoque).toBe(3);
    expect(massa.dados.estoque).toBe(0);
    expect(sal.dados).not.toHaveProperty('estoque');
    expect(sal.dados.basico).toBe(true);
  });
});

describe('ordenarPorNome', () => {
  it('ordena em português', () => {
    const nomes = ordenarPorNome([{ nome: 'Ovo' }, { nome: 'Abóbora' }, { nome: 'Açúcar' }, { nome: 'Batata' }]).map((i) => i.nome);
    expect(nomes).toEqual(['Abóbora', 'Açúcar', 'Batata', 'Ovo']);
  });
});
