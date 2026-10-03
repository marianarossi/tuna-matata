<script>
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth } from './lib/firebase.js';
  import Login from './telas/Login.svelte';
  import Abas from './componentes/Abas.svelte';
  import Estoque from './telas/Estoque.svelte';
  import Receitas from './telas/Receitas.svelte';
  import Semana from './telas/Semana.svelte';
  import Compras from './telas/Compras.svelte';
  import Ajustes from './telas/Ajustes.svelte';

  // undefined = ainda verificando, null = sem sessão
  let usuario = $state(undefined);
  onAuthStateChanged(auth, (u) => (usuario = u));

  // Rotas simples pelo hash: #/estoque, #/receitas, #/semana, #/compras, #/ajustes
  const telas = { estoque: Estoque, receitas: Receitas, semana: Semana, compras: Compras, ajustes: Ajustes };
  const titulos = { estoque: 'Estoque', receitas: 'Receitas', semana: 'Semana', compras: 'Compras', ajustes: 'Ajustes' };

  function lerRota() {
    const nome = location.hash.replace(/^#\/?/, '').split('/')[0];
    return telas[nome] ? nome : 'estoque';
  }
  let rota = $state(lerRota());
  window.addEventListener('hashchange', () => (rota = lerRota()));

  const Tela = $derived(telas[rota]);
</script>

{#if usuario === undefined}
  <div class="carregando">🐟</div>
{:else if usuario === null}
  <Login />
{:else}
  <header class="topo">
    <h1>{titulos[rota]}</h1>
    {#if rota === 'ajustes'}
      <a class="botao-icone" href="#/estoque" aria-label="Voltar">✕</a>
    {:else}
      <a class="botao-icone" href="#/ajustes" aria-label="Ajustes">⚙️</a>
    {/if}
  </header>
  <main class="conteudo">
    <Tela />
  </main>
  <Abas {rota} />
{/if}

<style>
  .carregando {
    display: grid;
    place-items: center;
    height: 100dvh;
    font-size: 4rem;
    animation: nadar 1.2s ease-in-out infinite alternate;
  }
  @keyframes nadar {
    from { transform: translateX(-12px); }
    to { transform: translateX(12px); }
  }
  .topo {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top) + 12px) 20px 10px;
    background: var(--fundo-translucido);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  h1 {
    margin: 0;
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .conteudo {
    padding: 8px 16px calc(env(safe-area-inset-bottom) + 96px);
  }
</style>
