// Testa firestore.rules no emulador: npm run test:regras (precisa de Java).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

const UID = 'm3MXk6CYKpbwbGQLj7MHX6sIpPA3';
let ambiente;

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'tuna-matata-teste',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => ambiente.cleanup());
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'ingredientes/atum'), { nome: 'Atum', emoji: '🐟', unidade: 'lata', basico: false, estoque: 1 }),
  );
});

const nos = () => ambiente.authenticatedContext(UID).firestore();

describe('acesso', () => {
  it('estranho sem login não lê nem grava', async () => {
    const db = ambiente.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'ingredientes/atum')));
    await assertFails(setDoc(doc(db, 'receitas/x'), { nome: 'x' }));
  });

  it('outra conta logada não lê', async () => {
    const db = ambiente.authenticatedContext('outra-pessoa').firestore();
    await assertFails(getDoc(doc(db, 'ingredientes/atum')));
  });

  it('a nossa conta lê e grava', async () => {
    await assertSucceeds(getDoc(doc(nos(), 'ingredientes/atum')));
    await assertSucceeds(setDoc(doc(nos(), 'receitas/x'), { nome: 'x' }));
  });
});

describe('estoque', () => {
  it('increment(-1) até zero passa, abaixo de zero é recusado', async () => {
    const ref = doc(nos(), 'ingredientes/atum');
    await assertSucceeds(updateDoc(ref, { estoque: increment(-1) }));
    await assertFails(updateDoc(ref, { estoque: increment(-1) }));
  });

  it('estoque não inteiro é recusado', async () => {
    await assertFails(updateDoc(doc(nos(), 'ingredientes/atum'), { estoque: 1.5 }));
  });

  it('ingrediente básico sem estoque é aceito', async () => {
    await assertSucceeds(setDoc(doc(nos(), 'ingredientes/sal'), { nome: 'Sal', emoji: '🧂', unidade: 'pacote', basico: true }));
  });
});
