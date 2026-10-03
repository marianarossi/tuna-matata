<script>
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth } from './lib/firebase.js';
  import { dados, comecarSincronizar, pararSincronizar } from './lib/dados.svelte.js';
  import Login from './telas/Login.svelte';
  import Abas from './componentes/Abas.svelte';
  import Aviso from './componentes/Aviso.svelte';
  import Vazio from './componentes/Vazio.svelte';
  import Estoque from './telas/Estoque.svelte';
  import Receitas from './telas/Receitas.svelte';
  import Semana from './telas/Semana.svelte';
  import Compras from './telas/Compras.svelte';
  import Ajustes from './telas/Ajustes.svelte';
  import Ingredientes from './telas/Ingredientes.svelte';
  import Ingrediente from './telas/Ingrediente.svelte';

  // undefined = ainda verificando, null = sem sessão
  let usuario = $state(undefined);
  onAuthStateChanged(auth, (u) => {
    usuario = u;
    if (u) comecarSincronizar();
    else pararSincronizar();
  });

  // Rotas simples pelo hash: #/estoque, #/ajustes, #/ingrediente/cebola-roxa ...
  // voltar = para onde o ✕/‹ do topo leva (telas internas).
  const telas = {
    estoque: { tela: Estoque, titulo: 'Estoque' },
    receitas: { tela: Receitas, titulo: 'Receitas' },
    semana: { tela: Semana, titulo: 'Semana' },
    compras: { tela: Compras, titulo: 'Compras' },
    ajustes: { tela: Ajustes, titulo: 'Ajustes', voltar: '#/estoque' },
    ingredientes: { tela: Ingredientes, titulo: 'Ingredientes', voltar: '#/ajustes' },
    ingrediente: { tela: Ingrediente, titulo: 'Ingrediente', voltar: '#/ingredientes', esperaDados: true },
  };

  function lerRota() {
    const [nome, parametro] = location.hash.replace(/^#\/?/, '').split('/');
    return telas[nome] ? { nome, parametro: decodeURIComponent(parametro ?? '') } : { nome: 'estoque', parametro: '' };
  }
  let rota = $state(lerRota());
  window.addEventListener('hashchange', () => {
    rota = lerRota();
    window.scrollTo(0, 0);
  });

  const atual = $derived(telas[rota.nome]);
</script>

{#if usuario === undefined}
  <div class="carregando">🐟</div>
{:else if usuario === null}
  <Login />
{:else}
  <header class="topo">
    <h1>{atual.titulo}</h1>
    {#if atual.voltar}
      <a class="botao-icone" href={atual.voltar} aria-label="Voltar">✕</a>
    {:else}
      <a class="botao-icone" href="#/ajustes" aria-label="Ajustes">⚙️</a>
    {/if}
  </header>
  <main class="conteudo">
    {#if atual.esperaDados && !dados.carregado}
      <Vazio emoji="🐟" titulo="Carregando…" />
    {:else}
      {#key rota.nome + '/' + rota.parametro}
        <atual.tela id={rota.parametro} />
      {/key}
    {/if}
  </main>
  <Aviso />
  <Abas rota={rota.nome} />
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
