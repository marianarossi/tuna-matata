import { describe, it, expect } from 'vitest';
import { cobertura, ordenarPorCobertura, textoCobertura, validarReceitas, lerJsonDeReceitas } from './receitas.js';

const ingredientes = {
  atum: { id: 'atum', nome: 'Atum', estoque: 1 },
  pimentao: { id: 'pimentao', nome: 'Pimentão', estoque: 0 },
  massa: { id: 'massa', nome: 'Massa', estoque: 2 },
  ovo: { id: 'ovo', nome: 'Ovo', estoque: 12 },
  sal: { id: 'sal', nome: 'Sal', basico: true },
};

const massaComAtum = {
  nome: 'Massa com atum',
  ingredientes: [
    { ingredienteId: 'atum', quantidade: 1 },
    { ingredienteId: 'pimentao', quantidade: 1 },
    { ingredienteId: 'massa', quantidade: 1 },
  ],
};
const omelete = { nome: 'Omelete', ingredientes: [{ ingredienteId: 'ovo', quantidade: 3 }, { ingredienteId: 'sal', quantidade: 1 }] };
const atumDuplo = { nome: 'Atum duplo', ingredientes: [{ ingredienteId: 'atum', quantidade: 2 }, { ingredienteId: 'pimentao', quantidade: 3 }] };

describe('cobertura', () => {
  it('marca verde/vermelho por ingrediente e conta os que faltam', () => {
    const c = cobertura(massaComAtum, ingredientes);
    expect(c.itens.map((i) => i.cobre)).toEqual([true, false, true]);
    expect(c.faltando).toBe(1);
    expect(c.completa).toBe(false);
  });

  it('básico sempre cobre', () => {
    expect(cobertura(omelete, ingredientes).completa).toBe(true);
  });

  it('ingrediente fora do catálogo conta como faltando', () => {
    const c = cobertura({ ingredientes: [{ ingredienteId: 'sumiu', quantidade: 1 }] }, ingredientes);
    expect(c.faltando).toBe(1);
  });

  it('aceita Map', () => {
    expect(cobertura(omelete, new Map(Object.entries(ingredientes))).completa).toBe(true);
  });
});

describe('ordenarPorCobertura', () => {
  it('100% primeiro, depois menos itens faltando', () => {
    const nomes = ordenarPorCobertura([atumDuplo, massaComAtum, omelete], ingredientes).map((r) => r.receita.nome);
    expect(nomes).toEqual(['Omelete', 'Massa com atum', 'Atum duplo']);
  });

  it('textos', () => {
    expect(textoCobertura(0)).toBe('Dá pra fazer');
    expect(textoCobertura(1)).toBe('Falta 1 item');
    expect(textoCobertura(3)).toBe('Faltam 3 itens');
  });
});

describe('importação', () => {
  const ids = Object.keys(ingredientes);
  const boa = { id: 'omelete', nome: 'Omelete', emoji: '🍳', tempoMin: 10, ingredientes: [{ ingredienteId: 'ovo', quantidade: 3 }] };

  it('lê o formato do seed ou uma lista', () => {
    expect(lerJsonDeReceitas('{"receitas":[]}')).toEqual([]);
    expect(lerJsonDeReceitas('[{"nome":"x"}]')).toHaveLength(1);
    expect(() => lerJsonDeReceitas('{oops')).toThrow('JSON');
    expect(() => lerJsonDeReceitas('{"outra":1}')).toThrow('receitas');
  });

  it('aceita receita boa e gera id pelo nome quando falta', () => {
    const semId = { ...boa, id: undefined, nome: 'Ovo mexido' };
    const r = validarReceitas([boa, semId], ids);
    expect(r.prontas.map((p) => p.id)).toEqual(['omelete', 'ovo-mexido']);
    expect(r.prontas[0].dados).toEqual({ nome: 'Omelete', emoji: '🍳', tempoMin: 10, ingredientes: [{ ingredienteId: 'ovo', quantidade: 3 }] });
  });

  it('pula id repetido (já existe ou repetido no próprio JSON)', () => {
    const r = validarReceitas([boa, boa], ids, ['omelete']);
    expect(r.prontas).toHaveLength(0);
    expect(r.puladas).toHaveLength(2);
    const r2 = validarReceitas([boa, boa], ids);
    expect(r2.prontas).toHaveLength(1);
    expect(r2.puladas).toHaveLength(1);
  });

  it('avisa quais ingredienteId não existem e não importa essa receita', () => {
    const ruim = { ...boa, id: 'bolo', nome: 'Bolo', ingredientes: [{ ingredienteId: 'farinha', quantidade: 1 }, { ingredienteId: 'acucar', quantidade: 1 }, { ingredienteId: 'ovo', quantidade: 2 }] };
    const r = validarReceitas([ruim, boa], ids);
    expect(r.idsInexistentes).toEqual(['acucar', 'farinha']);
    expect(r.invalidas).toHaveLength(1);
    expect(r.prontas.map((p) => p.id)).toEqual(['omelete']);
  });

  it('recusa quantidades não inteiras, tempo inválido, ingrediente repetido e lista vazia', () => {
    const r = validarReceitas(
      [
        { ...boa, id: 'a', ingredientes: [{ ingredienteId: 'ovo', quantidade: 1.5 }] },
        { ...boa, id: 'b', tempoMin: '10' },
        { ...boa, id: 'c', ingredientes: [{ ingredienteId: 'ovo', quantidade: 1 }, { ingredienteId: 'ovo', quantidade: 1 }] },
        { ...boa, id: 'd', ingredientes: [] },
        { ...boa, id: 'e', ingredientes: [{ ingredienteId: 'ovo', quantidade: 0 }] },
      ],
      ids,
    );
    expect(r.prontas).toHaveLength(0);
    expect(r.invalidas).toHaveLength(5);
  });
});
