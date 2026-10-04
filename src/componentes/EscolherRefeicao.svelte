<script>
  // Folha que sobe de baixo para escolher o que vai num slot.
  import { dados, mapaDeIngredientes } from '../lib/dados.svelte.js';
  import { ordenarPorCobertura, textoCobertura } from '../lib/receitas.js';

  let { titulo, atual, onescolher, onfechar } = $props();

  const ordenadas = $derived(ordenarPorCobertura(dados.receitas, mapaDeIngredientes()));
  let busca = $state('');
  const filtradas = $derived(
    ordenadas.filter((r) => r.receita.nome.toLowerCase().includes(busca.trim().toLowerCase())),
  );
</script>

<div class="fundo" onclick={onfechar} role="presentation"></div>
<div class="folha" role="dialog" aria-label={titulo}>
  <div class="alca"></div>
  <div class="topo">
    <h2>{titulo}</h2>
    <button class="botao-icone" onclick={onfechar} aria-label="Fechar">✕</button>
  </div>

  <div class="especiais">
    <button class="chip" class:ativo={atual?.tipo === 'sobras'} onclick={() => onescolher({ tipo: 'sobras' })}>🍲 Sobras</button>
    <button class="chip" class:ativo={atual?.tipo === 'fora'} onclick={() => onescolher({ tipo: 'fora' })}>🍽️ Comer fora</button>
    {#if atual}
      <button class="chip" onclick={() => onescolher(null)}>🗑️ Deixar vazio</button>
    {/if}
  </div>

  {#if dados.receitas.length > 6}
    <input class="busca" bind:value={busca} placeholder="🔎 Buscar receita" aria-label="Buscar receita" />
  {/if}

  <p class="rotulo">✅ Dá pra fazer agora primeiro</p>
  <div class="lista">
    {#each filtradas as r (r.receita.id)}
      <button
        class="opcao"
        class:ativo={atual?.tipo === 'receita' && atual.receitaId === r.receita.id}
        onclick={() => onescolher({ tipo: 'receita', receitaId: r.receita.id })}
      >
        <span class="emoji">{r.receita.emoji}</span>
        <span class="nome">{r.receita.nome}</span>
        <span class="selo" class:ok={r.completa} class:falta1={r.faltando === 1}>{textoCobertura(r.faltando)}</span>
      </button>
    {:else}
      <p class="vazio">Nenhuma receita. Crie na aba Receitas.</p>
    {/each}
  </div>
</div>

<style>
  .fundo {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgba(0, 0, 0, 0.35);
    animation: aparecer 0.15s ease-out;
  }
  .folha {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 31;
    max-height: 85dvh;
    overflow-y: auto;
    padding: 8px 16px calc(env(safe-area-inset-bottom) + 20px);
    background: var(--fundo);
    border-radius: 22px 22px 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
    animation: subir 0.22s ease-out;
    overscroll-behavior: contain;
  }
  @keyframes subir {
    from { transform: translateY(40%); opacity: 0.5; }
  }
  @keyframes aparecer {
    from { opacity: 0; }
  }
  .alca {
    width: 40px;
    height: 5px;
    border-radius: 3px;
    background: var(--borda);
    margin: 0 auto 8px;
  }
  .topo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
  }
  .topo .botao-icone {
    border: none;
    cursor: pointer;
  }
  .especiais {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .especiais .chip,
  .opcao {
    border: none;
    font: inherit;
    color: var(--texto);
    cursor: pointer;
  }
  .especiais .chip {
    padding: 10px 14px;
    font-weight: 700;
  }
  .ativo {
    outline: 2.5px solid var(--primaria);
  }
  .busca {
    margin-top: 14px;
  }
  .rotulo {
    margin: 18px 4px 8px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--texto-suave);
  }
  .lista {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .opcao {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 16px;
    background: var(--card);
    box-shadow: var(--sombra);
    text-align: left;
  }
  .opcao .emoji {
    font-size: 1.6rem;
  }
  .opcao .nome {
    flex: 1;
    font-weight: 700;
  }
  .selo {
    flex: none;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 9px;
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
  .vazio {
    color: var(--texto-suave);
  }
</style>
