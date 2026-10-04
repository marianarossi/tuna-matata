<script>
  import { dados, receitaPorId, mapaDeIngredientes } from '../lib/dados.svelte.js';
  import { cobertura, textoCobertura } from '../lib/receitas.js';
  import ChipIngrediente from '../componentes/ChipIngrediente.svelte';
  import Vazio from '../componentes/Vazio.svelte';

  let { id } = $props();
  const receita = $derived(receitaPorId(id));
  const c = $derived(receita ? cobertura(receita, mapaDeIngredientes()) : null);
</script>

{#if !receita}
  <Vazio emoji="🫥" titulo="Essa receita não existe mais"><a href="#/receitas">Voltar</a></Vazio>
{:else}
  <div class="card cabeca">
    <div class="emoji">{receita.emoji}</div>
    <h2>{receita.nome}</h2>
    <p class="tempo">⏱ {receita.tempoMin} min</p>
    <span class="selo" class:ok={c.completa}>{textoCobertura(c.faltando)}</span>
  </div>

  <h3>Ingredientes</h3>
  <div class="chips">
    {#each c.itens as item (item.ingredienteId)}
      <ChipIngrediente {...item} cor={item.cobre ? 'verde' : 'vermelho'} />
    {/each}
  </div>
  <p class="legenda">Verde: o estoque cobre. Vermelho: falta.</p>

  <a class="botao largo editar" href="#/editar-receita/{receita.id}">✏️ Editar receita</a>
{/if}

<style>
  .cabeca {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    text-align: center;
  }
  .emoji {
    font-size: 3.5rem;
    line-height: 1;
  }
  h2 {
    margin: 10px 0 2px;
    font-size: 1.4rem;
    font-weight: 800;
  }
  .tempo {
    margin: 0 0 10px;
    color: var(--texto-suave);
  }
  .selo {
    font-size: 0.85rem;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--vermelho-fundo);
    color: var(--vermelho);
  }
  .selo.ok {
    background: var(--verde-fundo);
    color: var(--verde);
  }
  h3 {
    margin: 22px 4px 10px;
    font-size: 1.05rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .legenda {
    margin: 10px 4px 0;
    font-size: 0.82rem;
    color: var(--texto-suave);
  }
  .editar {
    display: block;
    margin-top: 24px;
    text-align: center;
    text-decoration: none;
  }
</style>
