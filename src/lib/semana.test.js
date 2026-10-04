import { describe, it, expect } from 'vitest';
import { SLOTS, segundaPadrao, somarSemanas, dataCurta, nomeDoSlot, planejar, receitasUsadas } from './semana.js';

describe('datas', () => {
  it('10 slots em ordem cronológica', () => {
    expect(SLOTS).toHaveLength(10);
    expect(SLOTS.slice(0, 3)).toEqual(['seg-almoco', 'seg-janta', 'ter-almoco']);
    expect(SLOTS.at(-1)).toBe('sex-janta');
  });

  it('sábado e domingo abrem a próxima semana; seg a sex, a atual', () => {
    // 2026-10-05 é segunda-feira
    expect(segundaPadrao(new Date(2026, 9, 3))).toBe('2026-10-05'); // sábado
    expect(segundaPadrao(new Date(2026, 9, 4))).toBe('2026-10-05'); // domingo
    expect(segundaPadrao(new Date(2026, 9, 5))).toBe('2026-10-05'); // segunda
    expect(segundaPadrao(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-05'); // sexta à noite
    expect(segundaPadrao(new Date(2026, 9, 10))).toBe('2026-10-12'); // sábado seguinte
  });

  it('virada de mês e de ano', () => {
    expect(segundaPadrao(new Date(2026, 11, 31))).toBe('2026-12-28'); // quinta
    expect(segundaPadrao(new Date(2027, 0, 2))).toBe('2027-01-04'); // sábado
    expect(somarSemanas('2026-12-28', 1)).toBe('2027-01-04');
    expect(somarSemanas('2026-10-05', -1)).toBe('2026-09-28');
    expect(dataCurta('2026-09-28', 4)).toBe('02/10');
  });

  it('nome do slot', () => {
    expect(nomeDoSlot('qui-janta')).toBe('Qui janta');
  });
});

describe('planejar', () => {
  const ingredientes = {
    atum: { nome: 'Atum', estoque: 1 },
    pimentao: { nome: 'Pimentão', estoque: 2 },
    massa: { nome: 'Massa', estoque: 1 },
    ovo: { nome: 'Ovo', estoque: 0 },
    sal: { nome: 'Sal', basico: true },
  };
  const receitas = {
    'massa-com-atum': {
      nome: 'Massa com atum',
      emoji: '🍝',
      ingredientes: [
        { ingredienteId: 'atum', quantidade: 1 },
        { ingredienteId: 'pimentao', quantidade: 1 },
        { ingredienteId: 'massa', quantidade: 1 },
        { ingredienteId: 'sal', quantidade: 1 },
      ],
    },
    omelete: { nome: 'Omelete', emoji: '🍳', ingredientes: [{ ingredienteId: 'ovo', quantidade: 3 }] },
  };
  const receita = (receitaId) => ({ tipo: 'receita', receitaId });

  it('exemplo da especificação: massa com atum na segunda e na quinta, 1 atum em estoque', () => {
    const r = planejar({ 'seg-almoco': receita('massa-com-atum'), 'qui-janta': receita('massa-com-atum') }, receitas, ingredientes);
    expect(r.erros).toEqual([]);
    expect(r.descontado).toEqual({ atum: 1, pimentao: 2, massa: 1 });
    expect(r.compras).toEqual({ atum: 1, massa: 1 });
    expect(r.estoqueFinal).toEqual({ atum: 0, pimentao: 0, massa: 0 });
    // O atum de segunda sai do estoque; o de quinta vai para a lista.
    expect(r.detalhe[0]).toMatchObject({ slot: 'seg-almoco', descontado: { atum: 1, pimentao: 1, massa: 1 }, falta: {} });
    expect(r.detalhe[1]).toMatchObject({ slot: 'qui-janta', descontado: { pimentao: 1 }, falta: { atum: 1, massa: 1 } });
  });

  it('segue a ordem cronológica, não a ordem das chaves', () => {
    const r = planejar({ 'sex-janta': receita('massa-com-atum'), 'seg-almoco': receita('massa-com-atum') }, receitas, ingredientes);
    expect(r.detalhe.map((d) => d.slot)).toEqual(['seg-almoco', 'sex-janta']);
    expect(r.detalhe[0].falta).toEqual({});
  });

  it('sobras, comer fora e vazio não consomem; básicos ficam fora', () => {
    const r = planejar(
      { 'seg-almoco': { tipo: 'sobras' }, 'seg-janta': { tipo: 'fora' }, 'ter-almoco': null, 'ter-janta': receita('massa-com-atum') },
      receitas,
      ingredientes,
    );
    expect(r.detalhe).toHaveLength(1);
    expect(r.descontado).not.toHaveProperty('sal');
    expect(r.compras).not.toHaveProperty('sal');
  });

  it('estoque nunca fica negativo: tudo que falta vai para compras', () => {
    const r = planejar({ 'seg-almoco': receita('omelete'), 'seg-janta': receita('omelete') }, receitas, ingredientes);
    expect(r.estoqueFinal.ovo).toBe(0);
    expect(r.descontado).toEqual({});
    expect(r.compras).toEqual({ ovo: 6 });
  });

  it('semana vazia não faz nada', () => {
    expect(planejar({}, receitas, ingredientes)).toMatchObject({ descontado: {}, compras: {}, detalhe: [], erros: [] });
  });

  it('receita apagada ou ingrediente fora do catálogo vira erro', () => {
    const r = planejar(
      { 'seg-almoco': receita('sumiu'), 'ter-almoco': receita('omelete') },
      receitas,
      { ...ingredientes, ovo: undefined },
    );
    expect(r.erros).toHaveLength(2);
    expect(r.erros[0]).toContain('Seg almoço');
    expect(r.erros[1]).toContain('"ovo"');
  });

  it('aceita Map e não altera os dados de entrada', () => {
    const mapa = new Map(Object.entries(ingredientes));
    planejar({ 'seg-almoco': receita('massa-com-atum') }, new Map(Object.entries(receitas)), mapa);
    expect(mapa.get('atum').estoque).toBe(1);
  });

  it('receitasUsadas', () => {
    expect(receitasUsadas({ 'seg-almoco': receita('a'), 'ter-janta': receita('a'), 'qua-almoco': { tipo: 'sobras' }, 'qui-almoco': receita('b') })).toEqual(['a', 'b']);
  });
});
