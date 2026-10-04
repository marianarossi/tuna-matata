<script>
  import { dados } from '../lib/dados.svelte.js';
  import Vazio from '../componentes/Vazio.svelte';
</script>

<a class="botao primario largo novo" href="#/ingrediente/novo">＋ Novo ingrediente</a>

{#if dados.carregado && dados.ingredientes.length === 0}
  <Vazio emoji="🧂" titulo="Nenhum ingrediente ainda" />
{:else}
  <ul class="card lista">
    {#each dados.ingredientes as ing (ing.id)}
      <li>
        <a href="#/ingrediente/{ing.id}">
          <span class="emoji">{ing.emoji}</span>
          <span class="nome">{ing.nome}</span>
          {#if ing.basico}<span class="selo">básico</span>{/if}
          <span class="unidade">{ing.unidade}</span>
          <span class="seta">›</span>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .novo {
    display: block;
    text-align: center;
    text-decoration: none;
    margin-bottom: 16px;
  }
  .lista {
    list-style: none;
    margin: 0;
    padding: 0 0 0 16px;
  }
  li + li a {
    border-top: 1px solid var(--borda);
  }
  a:not(.botao) {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px 12px 0;
    color: var(--texto);
    text-decoration: none;
  }
  .emoji {
    font-size: 1.4rem;
    width: 1.8rem;
    text-align: center;
  }
  .nome {
    flex: 1;
    font-weight: 600;
  }
  .selo {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--fundo);
    color: var(--texto-suave);
  }
  .unidade {
    color: var(--texto-suave);
    font-size: 0.9rem;
  }
  .seta {
    color: var(--texto-suave);
    font-size: 1.3rem;
  }
</style>
