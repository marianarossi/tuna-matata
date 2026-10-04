// Finalizar e Reabrir no emulador, com as regras de verdade: npm run test:regras
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { escolherRefeicao, finalizarSemana, reabrirSemana } from '../src/lib/planejamento.js';

const UID = 'm3MXk6CYKpbwbGQLj7MHX6sIpPA3';
const SEMANA = '2026-10-05';
let ambiente;

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'tuna-matata-planejamento',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => ambiente.cleanup());

beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'ingredientes/atum'), { nome: 'Atum', emoji: '🐟', unidade: 'lata', basico: false, estoque: 1 });
    await setDoc(doc(db, 'ingredientes/massa'), { nome: 'Massa', emoji: '🍝', unidade: 'pacote', basico: false, estoque: 2 });
    await setDoc(doc(db, 'ingredientes/sal'), { nome: 'Sal', emoji: '🧂', unidade: 'pacote', basico: true });
    await setDoc(doc(db, 'receitas/massa-com-atum'), {
      nome: 'Massa com atum',
      emoji: '🍝',
      tempoMin: 20,
      ingredientes: [
        { ingredienteId: 'atum', quantidade: 1 },
        { ingredienteId: 'massa', quantidade: 1 },
        { ingredienteId: 'sal', quantidade: 1 },
      ],
    });
  });
});

const nos = () => ambiente.authenticatedContext(UID).firestore();
const estoque = async (db, id) => (await getDoc(doc(db, 'ingredientes', id))).data().estoque;
const receita = { tipo: 'receita', receitaId: 'massa-com-atum' };

async function planejarSegundaEQuinta(db) {
  await escolherRefeicao(db, SEMANA, 'seg-almoco', receita);
  await escolherRefeicao(db, SEMANA, 'qui-janta', receita);
  await escolherRefeicao(db, SEMANA, 'ter-almoco', { tipo: 'sobras' });
}

describe('finalizar', () => {
  it('desconta o estoque e gera a lista (exemplo da especificação)', async () => {
    const db = nos();
    await planejarSegundaEQuinta(db);
    await finalizarSemana(db, SEMANA);
    expect(await estoque(db, 'atum')).toBe(0);
    expect(await estoque(db, 'massa')).toBe(0);
    const semana = (await getDoc(doc(db, 'semanas', SEMANA))).data();
    expect(semana.status).toBe('finalizada');
    expect(semana.descontado).toEqual({ atum: 1, massa: 2 });
    expect(semana.compras).toEqual({ atum: { quantidade: 1, comprado: false } });
    expect((await getDoc(doc(db, 'config/planejamento'))).data().ultimaFinalizada).toBe(SEMANA);
  });

  it('nunca aplica duas vezes, mesmo com os dois tocando ao mesmo tempo', async () => {
    const db1 = nos();
    const db2 = ambiente.authenticatedContext(UID).firestore();
    await planejarSegundaEQuinta(db1);
    const resultados = await Promise.allSettled([finalizarSemana(db1, SEMANA), finalizarSemana(db2, SEMANA)]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.find((r) => r.status === 'rejected').reason.message).toContain('já foi finalizada');
    expect(await estoque(db1, 'atum')).toBe(0);
    expect(await estoque(db1, 'massa')).toBe(0);
  });

  it('não deixa editar uma semana finalizada', async () => {
    const db = nos();
    await planejarSegundaEQuinta(db);
    await finalizarSemana(db, SEMANA);
    await expect(escolherRefeicao(db, SEMANA, 'sex-janta', receita)).rejects.toThrow('já foi finalizada');
  });

  it('semana sem receita não finaliza', async () => {
    const db = nos();
    await escolherRefeicao(db, SEMANA, 'seg-almoco', { tipo: 'fora' });
    await expect(finalizarSemana(db, SEMANA)).rejects.toThrow('pelo menos uma receita');
  });
});

describe('reabrir', () => {
  it('devolve exatamente o que foi descontado, somando aos ajustes manuais', async () => {
    const db = nos();
    await planejarSegundaEQuinta(db);
    await finalizarSemana(db, SEMANA);
    // Alguém comprou 3 latas de atum depois de finalizar.
    await updateDoc(doc(db, 'ingredientes/atum'), { estoque: increment(3) });
    await reabrirSemana(db, SEMANA);
    expect(await estoque(db, 'atum')).toBe(4); // 0 + 3 comprados + 1 devolvido
    expect(await estoque(db, 'massa')).toBe(2);
    const semana = (await getDoc(doc(db, 'semanas', SEMANA))).data();
    expect(semana.status).toBe('rascunho');
    expect(semana).not.toHaveProperty('compras');
    expect(semana).not.toHaveProperty('descontado');
    expect(semana.refeicoes['seg-almoco']).toEqual(receita);
  });

  it('nunca devolve duas vezes, mesmo com os dois tocando ao mesmo tempo', async () => {
    const db1 = nos();
    const db2 = ambiente.authenticatedContext(UID).firestore();
    await planejarSegundaEQuinta(db1);
    await finalizarSemana(db1, SEMANA);
    const resultados = await Promise.allSettled([reabrirSemana(db1, SEMANA), reabrirSemana(db2, SEMANA)]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await estoque(db1, 'atum')).toBe(1);
    expect(await estoque(db1, 'massa')).toBe(2);
  });

  it('finalizar, reabrir e finalizar de novo não desconta em dobro', async () => {
    const db = nos();
    await planejarSegundaEQuinta(db);
    await finalizarSemana(db, SEMANA);
    await reabrirSemana(db, SEMANA);
    await finalizarSemana(db, SEMANA);
    expect(await estoque(db, 'atum')).toBe(0);
    expect(await estoque(db, 'massa')).toBe(0);
  });

  it('só a semana finalizada mais recente pode ser reaberta', async () => {
    const db = nos();
    await escolherRefeicao(db, SEMANA, 'seg-almoco', receita);
    await finalizarSemana(db, SEMANA);
    await updateDoc(doc(db, 'ingredientes/atum'), { estoque: increment(5) });
    await escolherRefeicao(db, '2026-10-12', 'seg-almoco', receita);
    await finalizarSemana(db, '2026-10-12');
    await expect(reabrirSemana(db, SEMANA)).rejects.toThrow('mais recente');
    await reabrirSemana(db, '2026-10-12');
  });
});
