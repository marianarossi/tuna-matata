// Regras puras do planejamento semanal (sem Firebase).

export const DIAS = [
  { id: 'seg', nome: 'Segunda', curto: 'Seg' },
  { id: 'ter', nome: 'Terça', curto: 'Ter' },
  { id: 'qua', nome: 'Quarta', curto: 'Qua' },
  { id: 'qui', nome: 'Quinta', curto: 'Qui' },
  { id: 'sex', nome: 'Sexta', curto: 'Sex' },
];

export const REFEICOES = [
  { id: 'almoco', nome: 'Almoço', emoji: '☀️' },
  { id: 'janta', nome: 'Janta', emoji: '🌙' },
];

/** Os 10 slots em ordem cronológica: seg-almoco, seg-janta, ter-almoco ... sex-janta. */
export const SLOTS = DIAS.flatMap((d) => REFEICOES.map((r) => `${d.id}-${r.id}`));

const dois = (n) => String(n).padStart(2, '0');

/** Date -> "AAAA-MM-DD" no horário local. */
export function paraId(data) {
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

function deId(id) {
  const [a, m, d] = id.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Segunda-feira da semana que a aba Semana abre por padrão:
 * sábado e domingo abrem a semana seguinte; de segunda a sexta, a semana atual.
 */
export function segundaPadrao(hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diaDaSemana = d.getDay(); // 0 = domingo ... 6 = sábado
  const delta = diaDaSemana === 6 ? 2 : diaDaSemana === 0 ? 1 : 1 - diaDaSemana;
  d.setDate(d.getDate() + delta);
  return paraId(d);
}

/** Anda n semanas a partir de uma segunda ("2026-10-05", -1) -> "2026-09-28". */
export function somarSemanas(id, n) {
  const d = deId(id);
  d.setDate(d.getDate() + 7 * n);
  return paraId(d);
}

/** "DD/MM" de um dia da semana (0 = segunda). */
export function dataCurta(id, diasDepois = 0) {
  const d = deId(id);
  d.setDate(d.getDate() + diasDepois);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
}

/** "seg-almoco" -> "Seg almoço" */
export function nomeDoSlot(slot) {
  const [dia, refeicao] = slot.split('-');
  return `${DIAS.find((d) => d.id === dia)?.curto} ${REFEICOES.find((r) => r.id === refeicao)?.nome.toLowerCase()}`;
}

const pegar = (colecao, id) => (colecao instanceof Map ? colecao.get(id) : colecao?.[id]);

/** Ids das receitas usadas nos slots (sem repetir). */
export function receitasUsadas(refeicoes) {
  return [...new Set(SLOTS.map((s) => refeicoes?.[s]).filter((r) => r?.tipo === 'receita').map((r) => r.receitaId))];
}

/**
 * O coração do "Finalizar planejamento".
 * Percorre as refeições em ordem cronológica e, para cada ingrediente não básico,
 * desconta do estoque o que houver (nunca abaixo de zero); o que faltar vai para a lista
 * de compras, somado por ingrediente. Sobras, comer fora e vazio não consomem nada.
 *
 * @param refeicoes    { 'seg-almoco': { tipo: 'receita', receitaId } | { tipo: 'sobras' } | { tipo: 'fora' } | null }
 * @param receitas     Map/objeto id -> receita
 * @param ingredientes Map/objeto id -> ingrediente (com estoque atual)
 * @returns { estoqueFinal, descontado, compras, detalhe, erros }
 *   estoqueFinal só traz os ingredientes que a semana usa.
 */
export function planejar(refeicoes, receitas, ingredientes) {
  const estoque = {};
  const descontado = {};
  const compras = {};
  const detalhe = [];
  const erros = [];

  for (const slot of SLOTS) {
    const refeicao = refeicoes?.[slot];
    if (refeicao?.tipo !== 'receita') continue;
    const receita = pegar(receitas, refeicao.receitaId);
    if (!receita) {
      erros.push(`${nomeDoSlot(slot)}: a receita foi apagada. Escolha outra.`);
      continue;
    }
    const linha = { slot, receitaId: refeicao.receitaId, nome: receita.nome, emoji: receita.emoji, descontado: {}, falta: {} };

    for (const { ingredienteId: id, quantidade } of receita.ingredientes) {
      const ingrediente = pegar(ingredientes, id);
      if (!ingrediente) {
        erros.push(`${receita.nome} usa "${id}", que não existe mais no catálogo.`);
        continue;
      }
      if (ingrediente.basico) continue;
      if (!(id in estoque)) estoque[id] = ingrediente.estoque ?? 0;

      const usa = Math.min(estoque[id], quantidade);
      const falta = quantidade - usa;
      estoque[id] -= usa;
      if (usa > 0) {
        descontado[id] = (descontado[id] ?? 0) + usa;
        linha.descontado[id] = (linha.descontado[id] ?? 0) + usa;
      }
      if (falta > 0) {
        compras[id] = (compras[id] ?? 0) + falta;
        linha.falta[id] = (linha.falta[id] ?? 0) + falta;
      }
    }
    detalhe.push(linha);
  }

  return { estoqueFinal: estoque, descontado, compras, detalhe, erros: [...new Set(erros)] };
}
