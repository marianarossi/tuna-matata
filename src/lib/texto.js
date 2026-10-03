// Pequenos ajudantes de texto.

/** "lata" + 2 -> "latas". Unidades terminadas em consoante (kg, g) ficam iguais. */
export function plural(palavra, quantidade) {
  if (quantidade === 1) return palavra;
  return /[aeiouãõáéíóú]$/i.test(palavra) ? palavra + 's' : palavra;
}

/** Texto curto da quantidade: "2 latas", "6" (a unidade "unidade" fica implícita). */
export function quantidadeComUnidade(quantidade, unidade) {
  if (!unidade || unidade === 'unidade') return String(quantidade);
  return `${quantidade} ${plural(unidade, quantidade)}`;
}
