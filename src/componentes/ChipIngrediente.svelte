<script>
  import { quantidadeComUnidade } from '../lib/texto.js';

  // cor: 'verde' (estoque cobre), 'vermelho' (não cobre) ou '' (neutro)
  let { ingrediente, ingredienteId, quantidade, cor = '' } = $props();
</script>

<span class="chip {cor}">
  <span>{ingrediente?.emoji ?? '❓'}</span>
  <span>{ingrediente?.nome ?? ingredienteId}</span>
  <strong>{quantidadeComUnidade(quantidade, ingrediente?.unidade)}</strong>
</span>

<style>
  strong {
    font-variant-numeric: tabular-nums;
  }
</style>
