<script>
  import { doc, updateDoc, increment } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';
  import { dados } from '../lib/dados.svelte.js';
  import { avisar } from '../lib/aviso.svelte.js';
  import { plural } from '../lib/texto.js';
  import Vazio from '../componentes/Vazio.svelte';

  // Básicos (sal, azeite...) não têm estoque.
  const itens = $derived(dados.ingredientes.filter((i) => !i.basico));
  const acabaram = $derived(itens.filter((i) => (i.estoque ?? 0) === 0).length);

  // increment() é atômico: se os dois mexerem ao mesmo tempo, as duas mudanças contam.
  // As regras do Firestore recusam estoque negativo, então um −1 "atrasado" é rejeitado.
  async function ajustar(ing, delta) {
    if (delta < 0 && (ing.estoque ?? 0) <= 0) return;
    try {
      await updateDoc(doc(db, 'ingredientes', ing.id), { estoque: increment(delta) });
    } catch (e) {
      avisar(
        e.code === 'permission-denied'
          ? `${ing.emoji} ${ing.nome} já tinha acabado.`
          : 'Não deu para salvar. Tenta de novo.',
      );
    }
  }
</script>

{#if !dados.carregado}
  <Vazio emoji="🐟" titulo="Contando as latas…" />
{:else if itens.length === 0}
  <Vazio emoji="🥫" titulo="Despensa vazia, nem um atum à vista">
    Rode o seed ou <a href="#/ingredientes">adicione ingredientes</a>.
  </Vazio>
{:else}
  <p class="resumo">
    {itens.length} ingredientes{#if acabaram}{' · '}<span class="acabou">{acabaram} {acabaram === 1 ? 'acabou' : 'acabaram'}</span>{/if}
  </p>
  <div class="grade">
    {#each itens as ing (ing.id)}
      {@const qtd = ing.estoque ?? 0}
      <div class="card item" class:zerado={qtd === 0}>
        <div class="emoji">{ing.emoji}</div>
        <div class="nome">{ing.nome}</div>
        <div class="qtd">
          {qtd}
          {#if ing.unidade !== 'unidade'}<small>{plural(ing.unidade, qtd)}</small>{/if}
        </div>
        <div class="botoes">
          <button aria-label="Tirar um" disabled={qtd === 0} onclick={() => ajustar(ing, -1)}>−</button>
          <button aria-label="Pôr um" onclick={() => ajustar(ing, 1)}>+</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .resumo {
    margin: 0 4px 12px;
    color: var(--texto-suave);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .acabou {
    color: var(--vermelho);
  }
  .grade {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 10px;
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px 8px;
    text-align: center;
    transition: opacity 0.2s;
  }
  .item.zerado {
    opacity: 0.55;
  }
  .emoji {
    font-size: 1.9rem;
    line-height: 1;
  }
  .nome {
    margin-top: 4px;
    font-weight: 700;
    font-size: 0.85rem;
    line-height: 1.2;
    min-height: 2.4em;
    display: flex;
    align-items: center;
  }
  .qtd {
    font-size: 1.5rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .qtd small {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--texto-suave);
    margin-left: 1px;
  }
  .botoes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    width: 100%;
    margin-top: 8px;
  }
  .botoes button {
    appearance: none;
    border: none;
    height: 40px;
    border-radius: 10px;
    background: var(--fundo);
    color: var(--texto);
    font-size: 1.35rem;
    font-weight: 700;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }
  .botoes button:last-child {
    background: var(--primaria);
    color: var(--primaria-texto);
  }
  .botoes button:active {
    transform: scale(0.94);
  }
  .botoes button:disabled {
    opacity: 0.35;
  }
</style>
