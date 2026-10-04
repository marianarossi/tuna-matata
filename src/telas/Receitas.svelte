<script>
  import { dados, mapaDeIngredientes } from '../lib/dados.svelte.js';
  import { ordenarPorCobertura, textoCobertura } from '../lib/receitas.js';
  import Vazio from '../componentes/Vazio.svelte';

  const ordenadas = $derived(ordenarPorCobertura(dados.receitas, mapaDeIngredientes()));
  const prontas = $derived(ordenadas.filter((r) => r.completa));
  const quase = $derived(ordenadas.filter((r) => !r.completa));
</script>

<div class="acoes">
  <a class="botao primario" href="#/editar-receita/nova">＋ Nova</a>
  <a class="botao" href="#/importar">📥 Importar</a>
</div>

{#snippet cartao(r)}
  <a class="card receita" href="#/receita/{r.receita.id}">
    <span class="emoji">{r.receita.emoji}</span>
    <span class="meio">
      <span class="nome">{r.receita.nome}</span>
      <span class="tempo">⏱ {r.receita.tempoMin} min</span>
    </span>
    <span class="selo" class:ok={r.completa} class:falta1={r.faltando === 1}>{textoCobertura(r.faltando)}</span>
  </a>
{/snippet}

{#if !dados.receitasCarregadas}
  <Vazio emoji="📖" titulo="Abrindo o livro de receitas…" />
{:else if dados.receitas.length === 0}
  <Vazio emoji="📖" titulo="Nenhuma receita ainda">O atum está esperando uma chance de brilhar.</Vazio>
{:else}
  <h2>✅ Dá pra fazer agora</h2>
  {#if prontas.length}
    <div class="lista">
      {#each prontas as r (r.receita.id)}{@render cartao(r)}{/each}
    </div>
  {:else}
    <p class="nada">Nada fecha com o estoque de hoje. Hora de ir ao mercado 🐟</p>
  {/if}

  {#if quase.length}
    <h2>🛒 Falta pouco</h2>
    <div class="lista">
      {#each quase as r (r.receita.id)}{@render cartao(r)}{/each}
    </div>
  {/if}
{/if}

<style>
  .acoes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 8px;
  }
  .acoes .botao {
    text-align: center;
    text-decoration: none;
  }
  h2 {
    margin: 20px 4px 10px;
    font-size: 1.05rem;
    font-weight: 800;
  }
  .nada {
    margin: 0 4px;
    color: var(--texto-suave);
  }
  .lista {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .receita {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    color: var(--texto);
    text-decoration: none;
  }
  .emoji {
    font-size: 2rem;
  }
  .meio {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .nome {
    font-weight: 700;
  }
  .tempo {
    font-size: 0.85rem;
    color: var(--texto-suave);
  }
  .selo {
    flex: none;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--vermelho-fundo);
    color: var(--vermelho);
  }
  .selo.falta1 {
    background: var(--amarelo-fundo);
    color: var(--amarelo);
  }
  .selo.ok {
    background: var(--verde-fundo);
    color: var(--verde);
  }
</style>
