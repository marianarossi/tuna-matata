// Aviso rápido no rodapé (toast), ex.: "O outro já tirou a última lata".
export const aviso = $state({ texto: '' });

let timer;
export function avisar(texto) {
  aviso.texto = texto;
  clearTimeout(timer);
  timer = setTimeout(() => (aviso.texto = ''), 3000);
}
