<script>
  import { doc, setDoc, deleteDoc } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';
  import { dados, receitaPorId, ingredientePorId } from '../lib/dados.svelte.js';
  import { gerarId } from '../lib/ingredientes.js';
  import { avisar } from '../lib/aviso.svelte.js';

  // id = 'nova' para criar.
  let { id } = $props();
  const nova = id === 'nova';
  const original = nova ? null : receitaPorId(id);

  let nome = $state(original?.nome ?? '');
  let emoji = $state(original?.emoji ?? '');
  let tempoMin = $state(original?.tempoMin ?? 20);
  let itens = $state(original ? original.ingredientes.map((i) => ({ ...i })) : []);
  let busca = $state('');
  let erro = $state('');
  let salvando = $state(false);

  const escolhidos = $derived(new Set(itens.map((i) => i.ingredienteId)));
  const disponiveis = $derived(
    dados.ingredientes.filter(
      (i) => !escolhidos.has(i.id) && i.nome.toLowerCase().includes(busca.trim().toLowerCase()),
    ),
  );

  function adicionar(ingredienteId) {
    itens.push({ ingredienteId, quantidade: 1 });
    busca = '';
  }
  function mudar(item, delta) {
    if (item.quantidade + delta < 1) itens = itens.filter((i) => i !== item);
    else item.quantidade += delta;
  }
  function mudarTempo(delta) {
    tempoMin = Math.max(0, tempoMin + delta);
  }

  async function salvar() {
    erro = '';
    if (!nome.trim() || !emoji.trim()) return (erro = 'Preencha emoji e nome.');
    if (itens.length === 0) return (erro = 'Escolha pelo menos um ingrediente.');
    const novoId = nova ? gerarId(nome) : id;
    if (!novoId) return (erro = 'Nome inválido.');
    if (nova && receitaPorId(novoId)) return (erro = 'Já existe uma receita com esse nome.');
    salvando = true;
    try {
      await setDoc(doc(db, 'receitas', novoId), {
        nome: nome.trim(),
        emoji: emoji.trim(),
        tempoMin,
        ingredientes: itens.map(({ ingredienteId, quantidade }) => ({ ingredienteId, quantidade })),
      });
      avisar(`${emoji.trim()} ${nome.trim()} salva.`);
      location.hash = `#/receita/${novoId}`;
    } catch {
      erro = 'Não deu para salvar.';
      salvando = false;
    }
  }

  async function apagar() {
    if (!confirm(`Apagar ${original.nome}? Isso não dá para desfazer.`)) return;
    await deleteDoc(doc(db, 'receitas', id));
    avisar(`${original.emoji} ${original.nome} apagada.`);
    location.hash = '#/receitas';
  }
</script>

{#if !nova && !original}
  <p>Essa receita não existe mais. <a href="#/receitas">Voltar</a></p>
{:else}
  <div class="linha-nome">
    <input class="campo-emoji" bind:value={emoji} placeholder="🍝" maxlength="8" aria-label="Emoji" />
    <input bind:value={nome} placeholder="Nome (ex.: Massa com atum)" aria-label="Nome" />
  </div>

  <div class="card tempo">
    <span>⏱ Tempo</span>
    <div class="passo">
      <button type="button" aria-label="Menos 5 minutos" onclick={() => mudarTempo(-5)}>−</button>
      <strong>{tempoMin} min</strong>
      <button type="button" aria-label="Mais 5 minutos" onclick={() => mudarTempo(5)}>+</button>
    </div>
  </div>

  <h3>Ingredientes da receita</h3>
  {#if itens.length === 0}
    <p class="dica">Toque nos ingredientes abaixo para adicionar.</p>
  {:else}
    <ul class="card escolhidos">
      {#each itens as item (item.ingredienteId)}
        {@const ing = ingredientePorId(item.ingredienteId)}
        <li>
          <span class="emoji">{ing?.emoji ?? '❓'}</span>
          <span class="nome">{ing?.nome ?? item.ingredienteId}</span>
          <div class="passo">
            <button type="button" aria-label="Menos {ing?.nome}" onclick={() => mudar(item, -1)}>{item.quantidade === 1 ? '✕' : '−'}</button>
            <strong>{item.quantidade}</strong>
            <button type="button" aria-label="Mais {ing?.nome}" onclick={() => mudar(item, 1)}>+</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <h3>Adicionar</h3>
  <input class="busca" bind:value={busca} placeholder="🔎 Buscar ingrediente" aria-label="Buscar ingrediente" />
  <div class="catalogo">
    {#each disponiveis as ing (ing.id)}
      <button type="button" class="chip" onclick={() => adicionar(ing.id)}>{ing.emoji} {ing.nome}</button>
    {:else}
      <p class="dica">Nada por aqui. <a href="#/ingrediente/novo">Criar ingrediente</a></p>
    {/each}
  </div>

  {#if erro}<p class="erro">{erro}</p>{/if}

  <div class="rodape">
    <button class="botao primario largo" onclick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar receita'}</button>
    {#if !nova}
      <button class="botao perigo largo" onclick={apagar}>Apagar receita</button>
    {/if}
  </div>
{/if}

<style>
  .linha-nome {
    display: flex;
    gap: 10px;
  }
  .campo-emoji {
    width: 64px;
    flex: none;
    text-align: center;
    font-size: 1.6rem;
    padding: 8px;
  }
  .tempo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 10px 16px;
    margin-top: 12px;
    font-weight: 600;
  }
  .passo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .passo strong {
    min-width: 2.2em;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .passo button {
    appearance: none;
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--fundo);
    color: var(--texto);
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
  }
  .passo button:last-child {
    background: var(--primaria);
    color: var(--primaria-texto);
  }
  h3 {
    margin: 22px 4px 10px;
    font-size: 1.05rem;
  }
  .dica {
    margin: 0 4px;
    color: var(--texto-suave);
  }
  .escolhidos {
    list-style: none;
    margin: 0;
    padding: 4px 12px 4px 16px;
  }
  .escolhidos li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
  }
  .escolhidos li + li {
    border-top: 1px solid var(--borda);
  }
  .escolhidos .emoji {
    font-size: 1.4rem;
  }
  .escolhidos .nome {
    flex: 1;
    font-weight: 600;
  }
  .busca {
    margin-bottom: 10px;
  }
  .catalogo {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .catalogo .chip {
    border: none;
    font: inherit;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--texto);
    cursor: pointer;
  }
  .erro {
    color: var(--vermelho);
    font-weight: 600;
  }
  .rodape {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;
  }
</style>
