// Carrega seed/seed.json no Firestore.
// Roda pelo GitHub Actions (workflow "Carregar seed") ou no computador com
// GOOGLE_APPLICATION_CREDENTIALS apontando para a chave da conta de serviço.
//
// Regra: ingrediente que já existe tem nome/emoji/unidade/basico atualizados,
// mas o estoque NUNCA é sobrescrito. Ingrediente novo entra com o estoque do arquivo.
// Nada é apagado.

import { readFile } from 'node:fs/promises';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validarIngredientes, planejarSeed } from '../src/lib/ingredientes.js';

const arquivo = new URL('../seed/seed.json', import.meta.url);
const seed = JSON.parse(await readFile(arquivo, 'utf8'));

const erros = validarIngredientes(seed.ingredientes);
if (erros.length) {
  console.error('❌ O seed tem problemas, nada foi gravado:\n- ' + erros.join('\n- '));
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: 'tuna-matata' });
const db = getFirestore();

const existentes = (await db.collection('ingredientes').listDocuments()).map((d) => d.id);
const plano = planejarSeed(seed.ingredientes, existentes);

const lote = db.batch();
for (const { id, novo, dados } of plano) {
  const ref = db.collection('ingredientes').doc(id);
  if (novo) lote.set(ref, dados);
  // Virou básico: o estoque deixa de existir. Senão o estoque fica intocado.
  else lote.set(ref, dados.basico ? { ...dados, estoque: FieldValue.delete() } : dados, { merge: true });
}
await lote.commit();

const novos = plano.filter((p) => p.novo).map((p) => p.id);
const atualizados = plano.filter((p) => !p.novo).map((p) => p.id);
console.log(`✅ Ingredientes: ${novos.length} novos, ${atualizados.length} atualizados (estoque mantido).`);
if (novos.length) console.log('   Novos: ' + novos.join(', '));
