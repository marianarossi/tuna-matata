// Operações do planejamento no Firestore. Recebem o db para poderem ser testadas no emulador.
//
// Finalizar e Reabrir usam transação e conferem o status da semana (rascunho/finalizada):
// se os dois tocarem ao mesmo tempo, a segunda transação vê o status já trocado e para.
import { doc, runTransaction, serverTimestamp, deleteField, FieldPath } from 'firebase/firestore';
import { planejar, receitasUsadas } from './semana.js';

/** Erro com mensagem para mostrar na tela. */
export class ErroPlanejamento extends Error {}

const refSemana = (db, id) => doc(db, 'semanas', id);
const refControle = (db) => doc(db, 'config', 'planejamento');

/** Escolhe o que vai num slot (ou null para esvaziar). Recusa se a semana já foi finalizada. */
export async function escolherRefeicao(db, semanaId, slot, valor) {
  const ref = refSemana(db, semanaId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().status === 'finalizada')
      throw new ErroPlanejamento('Essa semana já foi finalizada. Reabra para mudar.');
    if (!snap.exists()) tx.set(ref, { status: 'rascunho', refeicoes: { [slot]: valor } });
    else tx.update(ref, new FieldPath('refeicoes', slot), valor);
  });
}

/**
 * Finaliza a semana: desconta o estoque, gera a lista de compras e guarda o que foi descontado.
 * Devolve o resultado de planejar() para o resumo.
 */
export async function finalizarSemana(db, semanaId) {
  return runTransaction(db, async (tx) => {
    // O Firestore exige todas as leituras antes de qualquer gravação.
    const [snap, controle] = await Promise.all([tx.get(refSemana(db, semanaId)), tx.get(refControle(db))]);
    if (!snap.exists()) throw new ErroPlanejamento('Escolha pelo menos uma receita antes de finalizar.');
    const semana = snap.data();
    if (semana.status !== 'rascunho') throw new ErroPlanejamento('Essa semana já foi finalizada.');

    const idsReceitas = receitasUsadas(semana.refeicoes);
    if (idsReceitas.length === 0) throw new ErroPlanejamento('Escolha pelo menos uma receita antes de finalizar.');
    const receitas = new Map();
    for (const s of await Promise.all(idsReceitas.map((id) => tx.get(doc(db, 'receitas', id)))))
      if (s.exists()) receitas.set(s.id, s.data());

    const idsIngredientes = [...new Set([...receitas.values()].flatMap((r) => r.ingredientes.map((i) => i.ingredienteId)))];
    const ingredientes = new Map();
    for (const s of await Promise.all(idsIngredientes.map((id) => tx.get(doc(db, 'ingredientes', id)))))
      if (s.exists()) ingredientes.set(s.id, s.data());

    const resultado = planejar(semana.refeicoes, receitas, ingredientes);
    if (resultado.erros.length) throw new ErroPlanejamento(resultado.erros.join('\n'));

    for (const id of Object.keys(resultado.descontado))
      tx.update(doc(db, 'ingredientes', id), { estoque: resultado.estoqueFinal[id] });

    tx.update(refSemana(db, semanaId), {
      status: 'finalizada',
      finalizadaEm: serverTimestamp(),
      descontado: resultado.descontado,
      detalhe: resultado.detalhe,
      compras: Object.fromEntries(
        Object.entries(resultado.compras).map(([id, quantidade]) => [id, { quantidade, comprado: false }]),
      ),
      emailEnviadoEm: null,
    });

    // Guarda qual é a semana finalizada mais recente (só ela pode ser reaberta).
    const ultima = controle.exists() ? controle.data().ultimaFinalizada : null;
    if (!ultima || semanaId > ultima) tx.set(refControle(db), { ultimaFinalizada: semanaId }, { merge: true });

    return resultado;
  });
}

/**
 * Reabre a semana finalizada mais recente: devolve ao estoque exatamente o que ela descontou
 * (somando, para não apagar ajustes feitos à mão depois), apaga a lista e volta para rascunho.
 */
export async function reabrirSemana(db, semanaId) {
  await runTransaction(db, async (tx) => {
    const [snap, controle] = await Promise.all([tx.get(refSemana(db, semanaId)), tx.get(refControle(db))]);
    if (!snap.exists() || snap.data().status !== 'finalizada') throw new ErroPlanejamento('Essa semana não está finalizada.');
    if (!controle.exists() || controle.data().ultimaFinalizada !== semanaId)
      throw new ErroPlanejamento('Só dá para reabrir a semana finalizada mais recente.');

    const descontado = snap.data().descontado ?? {};
    const ids = Object.keys(descontado);
    const ingredientes = await Promise.all(ids.map((id) => tx.get(doc(db, 'ingredientes', id))));
    ingredientes.forEach((s, i) => {
      // Ingrediente apagado ou que virou básico não tem mais estoque para devolver.
      if (!s.exists() || s.data().basico) return;
      tx.update(s.ref, { estoque: (s.data().estoque ?? 0) + descontado[ids[i]] });
    });

    tx.update(refSemana(db, semanaId), {
      status: 'rascunho',
      finalizadaEm: deleteField(),
      descontado: deleteField(),
      detalhe: deleteField(),
      compras: deleteField(),
      emailEnviadoEm: deleteField(),
    });
    tx.set(refControle(db), { ultimaFinalizada: null }, { merge: true });
  });
}
