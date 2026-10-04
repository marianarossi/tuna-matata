<script>
  import { doc, setDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';
  import { dados, ingredientePorId } from '../lib/dados.svelte.js';
  import { gerarId } from '../lib/ingredientes.js';
  import { avisar } from '../lib/aviso.svelte.js';

  // id = 'novo' para criar.
  let { id } = $props();
  const novo = id === 'novo';
  const original = novo ? null : ingredientePorId(id);

  let nome = $state(original?.nome ?? '');
  let emoji = $state(original?.emoji ?? '');
  let unidade = $state(original?.unidade ?? 'unidade');
  let basico = $state(original?.basico ?? false);
  let erro = $state('');
  let salvando = $state(false);

  const sugestoesUnidade = ['unidade', 'pacote', 'lata', 'caixa', 'garrafa', 'pote', 'kg'];

  async function salvar(evento) {
    evento.preventDefault();
    erro = '';
    if (!nome.trim() || !emoji.trim() || !unidade.trim()) {
      erro = 'Preencha emoji, nome e unidade.';
      return;
    }
    const campos = { nome: nome.trim(), emoji: emoji.trim(), unidade: unidade.trim(), basico };
    salvando = true;
    try {
      if (novo) {
        const novoId = gerarId(campos.nome);
        if (!novoId) throw new Error('Nome inválido.');
        if (ingredientePorId(novoId)) throw new Error('Já existe um ingrediente com esse nome.');
        await setDoc(doc(db, 'ingredientes', novoId), basico ? campos : { ...campos, estoque: 0 });
      } else {
        // Virou básico: some o estoque. Deixou de ser básico: começa com 0.
        // Nos outros casos o estoque não é tocado (só os botões + e − mexem nele).
        let extra = {};
        if (basico) extra = { estoque: deleteField() };
        else if (original.estoque === undefined) extra = { estoque: 0 };
        await updateDoc(doc(db, 'ingredientes', id), { ...campos, ...extra });
      }
      avisar(`${campos.emoji} ${campos.nome} salvo.`);
      location.hash = '#/ingredientes';
    } catch (e) {
      erro = e.message?.startsWith('Já existe') || e.message === 'Nome inválido.' ? e.message : 'Não deu para salvar.';
      salvando = false;
    }
  }

  async function apagar() {
    if (!confirm(`Apagar ${original.nome}? Isso não dá para desfazer.`)) return;
    await deleteDoc(doc(db, 'ingredientes', id));
    avisar(`${original.emoji} ${original.nome} apagado.`);
    location.hash = '#/ingredientes';
  }
</script>

{#if !novo && dados.carregado && !original}
  <p>Esse ingrediente não existe mais. <a href="#/ingredientes">Voltar</a></p>
{:else}
  <form onsubmit={salvar}>
    <div class="linha-nome">
      <input class="campo-emoji" bind:value={emoji} placeholder="🐟" maxlength="8" aria-label="Emoji" />
      <input bind:value={nome} placeholder="Nome (ex.: Cebola roxa)" aria-label="Nome" />
    </div>
    {#if novo && nome.trim()}
      <p class="dica">id: <code>{gerarId(nome) || '—'}</code> (é o que as receitas usam)</p>
    {:else if !novo}
      <p class="dica">id: <code>{id}</code></p>
    {/if}

    <label class="rotulo" for="unidade">Unidade</label>
    <input id="unidade" bind:value={unidade} />
    <div class="chips">
      {#each sugestoesUnidade as u}
        <button type="button" class="chip" class:ativo={unidade === u} onclick={() => (unidade = u)}>{u}</button>
      {/each}
    </div>

    <label class="card interruptor">
      <span>
        <strong>Básico da despensa</strong>
        <small>Sal, azeite, alho… aparece nas receitas, mas sem estoque e fora da lista de compras.</small>
      </span>
      <input type="checkbox" bind:checked={basico} />
    </label>

    {#if erro}<p class="erro">{erro}</p>{/if}

    <button class="botao primario largo" type="submit" disabled={salvando}>
      {salvando ? 'Salvando…' : 'Salvar'}
    </button>
    {#if !novo}
      <button class="botao perigo largo apagar" type="button" onclick={apagar}>Apagar ingrediente</button>
    {/if}
  </form>
{/if}

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
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
  .dica {
    margin: -4px 4px 4px;
    font-size: 0.85rem;
    color: var(--texto-suave);
  }
  .rotulo {
    margin: 8px 4px 0;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--texto-suave);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chips .chip {
    border: none;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--texto);
    cursor: pointer;
  }
  .chips .chip.ativo {
    background: var(--primaria);
    color: var(--primaria-texto);
  }
  .interruptor {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    margin: 10px 0;
  }
  .interruptor span {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .interruptor small {
    color: var(--texto-suave);
  }
  .interruptor input {
    width: 26px;
    height: 26px;
    flex: none;
    accent-color: var(--primaria);
  }
  .erro {
    margin: 0;
    color: var(--vermelho);
    font-weight: 600;
  }
  .apagar {
    margin-top: 8px;
  }
</style>
