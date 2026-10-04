// Regras puras sobre receitas (sem Firebase): cobertura pelo estoque e validação de importação.
import { gerarId, ID_VALIDO, ehInteiroNaoNegativo } from './ingredientes.js';

/**
 * Quanto o estoque atual cobre uma receita.
 * Básicos (sal, azeite...) contam sempre como cobertos.
 * Ingrediente que não existe mais no catálogo conta como faltando.
 *
 * @param receita { ingredientes: [{ ingredienteId, quantidade }] }
 * @param porId   Map ou objeto id -> ingrediente
 * @returns { itens: [{ ingredienteId, quantidade, tem, cobre, ingrediente }], faltando, total, completa }
 */
export function cobertura(receita, porId) {
  const pegar = (id) => (porId instanceof Map ? porId.get(id) : porId[id]);
  const itens = receita.ingredientes.map(({ ingredienteId, quantidade }) => {
    const ingrediente = pegar(ingredienteId);
    const tem = ingrediente ? (ingrediente.basico ? Infinity : ingrediente.estoque ?? 0) : 0;
    return { ingredienteId, quantidade, ingrediente, tem, cobre: tem >= quantidade };
  });
  const faltando = itens.filter((i) => !i.cobre).length;
  return { itens, faltando, total: itens.length, completa: faltando === 0 };
}

/**
 * Ordena para o "Dá pra fazer agora": 100% primeiro, depois falta 1 item, 2 itens...
 * Empate: menos unidades faltando, depois nome.
 */
export function ordenarPorCobertura(receitas, porId) {
  return receitas
    .map((receita) => {
      const c = cobertura(receita, porId);
      const unidadesFaltando = c.itens.reduce((soma, i) => soma + Math.max(0, i.quantidade - i.tem), 0);
      return { receita, ...c, unidadesFaltando };
    })
    .sort(
      (a, b) =>
        a.faltando - b.faltando ||
        a.unidadesFaltando - b.unidadesFaltando ||
        a.receita.nome.localeCompare(b.receita.nome, 'pt-BR'),
    );
}

/** "Falta 1 item", "Faltam 3 itens", "Dá pra fazer" */
export function textoCobertura(faltando) {
  if (faltando === 0) return 'Dá pra fazer';
  return faltando === 1 ? 'Falta 1 item' : `Faltam ${faltando} itens`;
}

/** Aceita { "receitas": [...] } (formato do seed) ou só a lista. */
export function lerJsonDeReceitas(texto) {
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error('Isso não é um JSON válido. Confira vírgulas e aspas.');
  }
  const lista = Array.isArray(json) ? json : json?.receitas;
  if (!Array.isArray(lista)) throw new Error('Não achei a lista "receitas" no JSON.');
  return lista;
}

/**
 * Confere receitas para importar (ou carregar pelo seed).
 * - id: opcional; se faltar, vem do nome ("Massa com atum" -> "massa-com-atum").
 * - id que já existe é pulado (nunca sobrescreve).
 * - ingredienteId que não existe no catálogo: a receita não entra e o id é avisado.
 *
 * @returns { prontas: [{ id, dados }], puladas: [{ id, nome }], invalidas: [{ nome, erros }], idsInexistentes: [id] }
 */
export function validarReceitas(lista, idsIngredientes, idsReceitasExistentes = []) {
  const ingredientesOk = new Set(idsIngredientes);
  const existentes = new Set(idsReceitasExistentes);
  const vistos = new Set();
  const prontas = [];
  const puladas = [];
  const invalidas = [];
  const inexistentes = new Set();

  lista.forEach((r, i) => {
    const nome = typeof r?.nome === 'string' ? r.nome.trim() : '';
    const rotulo = nome || `receita ${i + 1}`;
    const erros = [];
    if (!r || typeof r !== 'object') return invalidas.push({ nome: rotulo, erros: ['não é um objeto'] });

    const id = typeof r.id === 'string' && r.id ? r.id : gerarId(nome);
    if (!nome) erros.push('falta o nome');
    if (!ID_VALIDO.test(id)) erros.push(`id inválido "${id}"`);
    if (typeof r.emoji !== 'string' || !r.emoji.trim()) erros.push('falta o emoji');
    if (!ehInteiroNaoNegativo(r.tempoMin)) erros.push('tempoMin precisa ser inteiro (minutos)');

    const ingredientes = [];
    if (!Array.isArray(r.ingredientes) || r.ingredientes.length === 0) {
      erros.push('precisa de pelo menos um ingrediente');
    } else {
      const usados = new Set();
      for (const item of r.ingredientes) {
        const ingId = item?.ingredienteId;
        if (typeof ingId !== 'string' || !ingId) {
          erros.push('ingrediente sem ingredienteId');
          continue;
        }
        if (!ingredientesOk.has(ingId)) {
          inexistentes.add(ingId);
          erros.push(`ingrediente "${ingId}" não existe`);
        }
        if (!Number.isInteger(item.quantidade) || item.quantidade < 1)
          erros.push(`quantidade de "${ingId}" precisa ser inteiro ≥ 1`);
        if (usados.has(ingId)) erros.push(`"${ingId}" aparece duas vezes`);
        usados.add(ingId);
        ingredientes.push({ ingredienteId: ingId, quantidade: item.quantidade });
      }
    }

    if (erros.length) return invalidas.push({ nome: rotulo, erros });
    if (existentes.has(id) || vistos.has(id)) return puladas.push({ id, nome });
    vistos.add(id);
    prontas.push({ id, dados: { nome, emoji: r.emoji.trim(), tempoMin: r.tempoMin, ingredientes } });
  });

  return { prontas, puladas, invalidas, idsInexistentes: [...inexistentes].sort() };
}
