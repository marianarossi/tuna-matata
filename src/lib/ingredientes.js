// Regras puras sobre ingredientes (sem Firebase), usadas pelo app e pelo seed.

/** "Cebola roxa" -> "cebola-roxa" */
export function gerarId(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const ID_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function ehInteiroNaoNegativo(n) {
  return Number.isInteger(n) && n >= 0;
}

/** Ordena pelo nome em português (acentos no lugar certo). */
export function ordenarPorNome(lista) {
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Confere uma lista de ingredientes do seed.
 * Devolve uma lista de erros em português (vazia = tudo certo).
 */
export function validarIngredientes(lista) {
  if (!Array.isArray(lista)) return ['"ingredientes" precisa ser uma lista.'];
  const erros = [];
  const vistos = new Set();
  lista.forEach((ing, i) => {
    const onde = `ingrediente ${i + 1}${ing?.id ? ` (${ing.id})` : ''}`;
    if (!ing || typeof ing !== 'object') return erros.push(`${onde}: não é um objeto.`);
    if (typeof ing.id !== 'string' || !ID_VALIDO.test(ing.id))
      erros.push(`${onde}: id precisa ser minúsculo, sem acento, com hífens (ex.: cebola-roxa).`);
    else if (vistos.has(ing.id)) erros.push(`${onde}: id repetido.`);
    else vistos.add(ing.id);
    if (typeof ing.nome !== 'string' || !ing.nome.trim()) erros.push(`${onde}: falta o nome.`);
    if (typeof ing.emoji !== 'string' || !ing.emoji.trim()) erros.push(`${onde}: falta o emoji.`);
    if (typeof ing.unidade !== 'string' || !ing.unidade.trim()) erros.push(`${onde}: falta a unidade.`);
    if (ing.basico !== undefined && typeof ing.basico !== 'boolean')
      erros.push(`${onde}: basico precisa ser true ou false.`);
    if (ing.estoque !== undefined && !ehInteiroNaoNegativo(ing.estoque))
      erros.push(`${onde}: estoque precisa ser um número inteiro ≥ 0.`);
  });
  return erros;
}

/**
 * Decide o que gravar para cada ingrediente do seed.
 * Ingrediente que já existe: atualiza nome/emoji/unidade/basico e NUNCA mexe no estoque.
 * Ingrediente novo: entra com o estoque do arquivo (ou 0). Básicos não têm estoque.
 */
export function planejarSeed(lista, idsExistentes) {
  const existentes = new Set(idsExistentes);
  return lista.map((ing) => {
    const dados = {
      nome: ing.nome.trim(),
      emoji: ing.emoji.trim(),
      unidade: ing.unidade.trim(),
      basico: ing.basico === true,
    };
    if (existentes.has(ing.id)) return { id: ing.id, novo: false, dados };
    if (!dados.basico) dados.estoque = ing.estoque ?? 0;
    return { id: ing.id, novo: true, dados };
  });
}
