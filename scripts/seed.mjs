// Carrega seed/seed.json no Firestore.
// Roda pelo GitHub Actions (workflow "Carregar seed") ou no computador com
// GOOGLE_APPLICATION_CREDENTIALS apontando para a chave da conta de serviço.
//
// Regras:
// - Ingrediente que já existe tem nome/emoji/unidade/basico atualizados,
//   mas o estoque NUNCA é sobrescrito. Ingrediente novo entra com o estoque do arquivo.
// - Receita que já existe é pulada (pode ter sido editada no app). Receita nova entra.
// - Nada é apagado.

import { readFile } from 'node:fs/promises';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validarIngredientes, planejarSeed } from '../src/lib/ingredientes.js';
import { validarReceitas } from '../src/lib/receitas.js';

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
const receitasExistentes = (await db.collection('receitas').listDocuments()).map((d) => d.id);

// Receitas podem usar ingredientes do arquivo ou que já estão no app.
const idsIngredientes = new Set([...existentes, ...seed.ingredientes.map((i) => i.id)]);
const receitas = validarReceitas(seed.receitas ?? [], idsIngredientes, receitasExistentes);
if (receitas.invalidas.length) {
  console.error('❌ Receitas com problemas, nada foi gravado:');
  for (const r of receitas.invalidas) console.error(`- ${r.nome}: ${r.erros.join('; ')}`);
  process.exit(1);
}
const plano = planejarSeed(seed.ingredientes, existentes);

const gravacoes = [];
for (const { id, novo, dados } of plano) {
  const ref = db.collection('ingredientes').doc(id);
  if (novo) gravacoes.push((lote) => lote.set(ref, dados));
  // Virou básico: o estoque deixa de existir. Senão o estoque fica intocado.
  else gravacoes.push((lote) => lote.set(ref, dados.basico ? { ...dados, estoque: FieldValue.delete() } : dados, { merge: true }));
}
for (const { id, dados } of receitas.prontas) gravacoes.push((lote) => lote.set(db.collection('receitas').doc(id), dados));

// Um lote do Firestore aceita até 500 gravações.
for (let i = 0; i < gravacoes.length; i += 400) {
  const lote = db.batch();
  gravacoes.slice(i, i + 400).forEach((gravar) => gravar(lote));
  await lote.commit();
}

const novos = plano.filter((p) => p.novo).map((p) => p.id);
const atualizados = plano.filter((p) => !p.novo).map((p) => p.id);
console.log(`✅ Ingredientes: ${novos.length} novos, ${atualizados.length} atualizados (estoque mantido).`);
if (novos.length) console.log('   Novos: ' + novos.join(', '));
console.log(`✅ Receitas: ${receitas.prontas.length} novas, ${receitas.puladas.length} já existiam (não mexi).`);
