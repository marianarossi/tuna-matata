import { describe, it, expect } from 'vitest';
import { semanaDaLista, itensDaLista, assuntoDaLista, textoDaLista, htmlDaLista, validarEmails, montarBackup, nomeDoBackup } from './compras.js';
import { validarIngredientes } from './ingredientes.js';
import { validarReceitas } from './receitas.js';

const porId = new Map([
  ['atum', { nome: 'Atum', emoji: '🐟', unidade: 'lata' }],
  ['tomate', { nome: 'Tomate', emoji: '🍅', unidade: 'unidade' }],
  ['leite-de-coco', { nome: 'Leite de coco', emoji: '🥥', unidade: 'lata' }],
]);

describe('semanaDaLista', () => {
  it('pega a finalizada mais recente e ignora rascunhos', () => {
    const semanas = {
      '2026-09-28': { status: 'finalizada' },
      '2026-10-05': { status: 'finalizada', compras: {} },
      '2026-10-12': { status: 'rascunho' },
    };
    expect(semanaDaLista(semanas)).toEqual({ id: '2026-10-05', status: 'finalizada', compras: {} });
  });
  it('sem semana finalizada devolve null', () => {
    expect(semanaDaLista({ '2026-10-05': { status: 'rascunho' } })).toBeNull();
    expect(semanaDaLista({})).toBeNull();
  });
});

describe('itensDaLista e textoDaLista', () => {
  const compras = {
    tomate: { quantidade: 2, comprado: true },
    atum: { quantidade: 1, comprado: false },
    'leite-de-coco': { quantidade: 2 },
    sumiu: { quantidade: 1 },
  };
  const itens = itensDaLista(compras, porId);

  it('ordena por nome e usa o catálogo', () => {
    expect(itens.map((i) => i.id)).toEqual(['atum', 'leite-de-coco', 'sumiu', 'tomate']);
    expect(itens[3]).toMatchObject({ nome: 'Tomate', comprado: true, quantidade: 2 });
    expect(itens[1].comprado).toBe(false);
    expect(itens[2]).toMatchObject({ nome: 'sumiu', emoji: '❓' });
  });

  it('monta o texto do e-mail como na especificação', () => {
    expect(assuntoDaLista('2026-10-05')).toBe('🐟 Tuna Matata – Lista de compras da semana de 05/10');
    expect(textoDaLista('2026-10-05', itens)).toBe(
      [
        '🐟 Tuna Matata – Lista de compras da semana de 05/10',
        '',
        '🐟 Atum: 1 lata',
        '🥥 Leite de coco: 2 latas',
        '❓ sumiu: 1',
        '🍅 Tomate: 2',
      ].join('\n'),
    );
  });

  it('lista vazia', () => {
    expect(textoDaLista('2026-10-05', [])).toBe(
      '🐟 Tuna Matata – Lista de compras da semana de 05/10\n\nHakuna matata, não falta nada 🐟',
    );
  });
});

describe('htmlDaLista', () => {
  it('troca quebra de linha por <br> e escapa o resto', () => {
    expect(htmlDaLista('Título\n\n🧀 Queijo <ralado> & cia: 1')).toBe('Título<br><br>🧀 Queijo &lt;ralado&gt; &amp; cia: 1');
  });
});

describe('validarEmails', () => {
  it('ignora campos vazios e tira espaços', () => {
    expect(validarEmails([' a@b.com ', ''])).toEqual({ emails: ['a@b.com'], erro: null });
  });
  it('recusa e-mail estranho', () => {
    expect(validarEmails(['a@b.com', 'fulano']).erro).toBe('"fulano" não parece um e-mail.');
  });
});

describe('montarBackup', () => {
  const quando = new Date('2026-10-04T10:00:00Z');
  const timestamp = { toDate: () => quando };
  const backup = montarBackup(
    {
      ingredientes: [
        { id: 'tomate', nome: 'Tomate', emoji: '🍅', unidade: 'unidade', basico: false, estoque: 4 },
        { id: 'sal', nome: 'Sal', emoji: '🧂', unidade: 'pacote', basico: true },
      ],
      receitas: [{ id: 'salada', nome: 'Salada', emoji: '🥗', tempoMin: 5, ingredientes: [{ ingredienteId: 'tomate', quantidade: 2 }] }],
      semanas: [{ id: '2026-10-05', status: 'finalizada', finalizadaEm: timestamp, detalhe: [{ slot: 'seg-almoco' }] }],
    },
    quando,
  );

  it('guarda tudo, com datas em texto', () => {
    expect(backup).toMatchObject({ app: 'tuna-matata', versao: 1, exportadoEm: '2026-10-04T10:00:00.000Z' });
    expect(backup.ingredientes.map((i) => i.id)).toEqual(['sal', 'tomate']);
    expect(backup.ingredientes[1].estoque).toBe(4);
    expect(backup.semanas[0].finalizadaEm).toBe('2026-10-04T10:00:00.000Z');
    expect(backup.semanas[0].detalhe).toEqual([{ slot: 'seg-almoco' }]);
  });

  it('ingredientes e receitas servem como seed', () => {
    expect(validarIngredientes(backup.ingredientes)).toEqual([]);
    const r = validarReceitas(backup.receitas, new Set(['tomate', 'sal']), []);
    expect(r.prontas.map((p) => p.id)).toEqual(['salada']);
    expect(r.invalidas).toEqual([]);
  });

  it('nome do arquivo com a data', () => {
    expect(nomeDoBackup(new Date(2026, 9, 4))).toBe('tuna-matata-backup-2026-10-04.json');
  });
});
