<script>
  let { rota } = $props();

  const abas = [
    { id: 'estoque', emoji: '🥫', nome: 'Estoque' },
    { id: 'receitas', emoji: '📖', nome: 'Receitas' },
    { id: 'semana', emoji: '📅', nome: 'Semana' },
    { id: 'compras', emoji: '🛒', nome: 'Compras' },
  ];
</script>

<nav>
  {#each abas as aba (aba.id)}
    <a href="#/{aba.id}" class:ativa={rota === aba.id} aria-current={rota === aba.id ? 'page' : undefined}>
      <span class="emoji">{aba.emoji}</span>
      <span class="nome">{aba.nome}</span>
    </a>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 6px 8px calc(env(safe-area-inset-bottom) + 6px);
    background: var(--fundo-translucido);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--borda);
  }
  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 0;
    border-radius: 14px;
    color: var(--texto-suave);
    text-decoration: none;
    font-size: 0.72rem;
    font-weight: 600;
  }
  .emoji {
    font-size: 1.5rem;
    filter: grayscale(0.8);
    opacity: 0.7;
    transition: transform 0.15s;
  }
  a.ativa {
    color: var(--primaria);
  }
  a.ativa .emoji {
    filter: none;
    opacity: 1;
    transform: scale(1.12);
  }
</style>
