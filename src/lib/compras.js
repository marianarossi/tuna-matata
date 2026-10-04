// Lista de compras, texto do e-mail e backup: funções puras.
import { dataCurta, paraId } from './semana.js';
import { quantidadeComUnidade } from './texto.js';

/** A semana finalizada mais recente, que é a que a aba Compras mostra. Ou null. */
export function semanaDaLista(semanas) {
  const ids = Object.keys(semanas ?? {})
    .filter((id) => semanas[id]?.status === 'finalizada')
    .sort();
  return ids.length ? { id: ids.at(-1), ...semanas[ids.at(-1)] } : null;
}

/** Itens da lista com nome, emoji e unidade do catálogo, em ordem alfabética. */
export function itensDaLista(compras, porId) {
  return Object.entries(compras ?? {})
    .map(([id, item]) => {
      const ing = porId.get(id);
      return {
        id,
        nome: ing?.nome ?? id,
        emoji: ing?.emoji ?? '❓',
        unidade: ing?.unidade,
        quantidade: item.quantidade,
        comprado: Boolean(item.comprado),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** "🐟 Tuna Matata – Lista de compras da semana de 05/10" */
export function assuntoDaLista(semanaId) {
  return `🐟 Tuna Matata – Lista de compras da semana de ${dataCurta(semanaId)}`;
}

/** Texto simples da lista: o título e uma linha por item. É o corpo do e-mail e o que "Copiar lista" copia. */
export function textoDaLista(semanaId, itens) {
  const linhas = itens.length
    ? itens.map((i) => `${i.emoji} ${i.nome}: ${quantidadeComUnidade(i.quantidade, i.unidade)}`)
    : ['Hakuna matata, não falta nada 🐟'];
  return [assuntoDaLista(semanaId), '', ...linhas].join('\n');
}

/** O mesmo texto em HTML, para o e-mail não juntar as linhas (o modelo do EmailJS usa {{{mensagem_html}}}). */
export function htmlDaLista(texto) {
  const escapar = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return texto.replace(/[&<>"]/g, (c) => escapar[c]).replace(/\n/g, '<br>');
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Limpa os e-mails dos Ajustes. Devolve { emails, erro }. Campos vazios são ignorados. */
export function validarEmails(lista) {
  const emails = lista.map((e) => (e ?? '').trim()).filter(Boolean);
  const invalido = emails.find((e) => !EMAIL_VALIDO.test(e));
  if (invalido) return { emails, erro: `"${invalido}" não parece um e-mail.` };
  return { emails, erro: null };
}

/** Datas do Firestore (Timestamp) viram texto ISO; o resto passa igual. */
function paraJson(valor) {
  if (typeof valor?.toDate === 'function') return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(paraJson);
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, paraJson(v)]));
  return valor;
}

/**
 * Monta o backup a partir das coleções ({ nome: [{ id, ...dados }] }).
 * "ingredientes" e "receitas" ficam no mesmo formato do seed/seed.json.
 */
export function montarBackup(colecoes, agora = new Date()) {
  const backup = { app: 'tuna-matata', versao: 1, exportadoEm: agora.toISOString() };
  for (const [nome, docs] of Object.entries(colecoes))
    backup[nome] = paraJson([...docs].sort((a, b) => a.id.localeCompare(b.id)));
  return backup;
}

export function nomeDoBackup(agora = new Date()) {
  return `tuna-matata-backup-${paraId(agora)}.json`;
}
