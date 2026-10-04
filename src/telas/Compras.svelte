<script>
  import { doc, updateDoc, FieldPath } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';
  import { dados, mapaDeIngredientes } from '../lib/dados.svelte.js';
  import { semanaDaLista, itensDaLista, textoDaLista } from '../lib/compras.js';
  import { enviarLista, ErroEmail } from '../lib/email.js';
  import { dataCurta } from '../lib/semana.js';
  import { quantidadeComUnidade } from '../lib/texto.js';
  import { avisar } from '../lib/aviso.svelte.js';
  import Vazio from '../componentes/Vazio.svelte';

  // Mostra a lista da semana finalizada mais recente.
  const semana = $derived(semanaDaLista(dados.semanas));
  const itens = $derived(semana ? itensDaLista(semana.compras, mapaDeIngredientes()) : []);
  const noCarrinho = $derived(itens.filter((i) => i.comprado).length);
  const enviadoEm = $derived(semana?.emailEnviadoEm?.toDate?.());
  let enviando = $state(false);

  // O checkbox é só visual: não mexe no estoque. Funciona sem internet e sincroniza depois.
  function marcar(item) {
    updateDoc(doc(db, 'semanas', semana.id), new FieldPath('compras', item.id, 'comprado'), !item.comprado).catch(() =>
      avisar('Não deu para marcar. Tenta de novo.'),
    );
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoDaLista(semana.id, itens));
      avisar('📋 Lista copiada!');
    } catch {
      avisar('Não deu para copiar.');
    }
  }

  async function enviar() {
    enviando = true;
    try {
      await enviarLista(db, semana.id, semana.compras, mapaDeIngredientes(), dados.emails);
      avisar('📧 Lista enviada por e-mail!');
    } catch (e) {
      avisar(e instanceof ErroEmail ? e.message : 'O e-mail não foi enviado. Precisa de internet.', 5000);
    }
    enviando = false;
  }

  const hora = (data) =>
    data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');
</script>

{#if !semana}
  <Vazio emoji="🛒" titulo="Hakuna matata, não falta nada 🐟">
    Quando finalizarem a semana, a lista de compras aparece aqui.
    <a class="link" href="#/semana">Planejar a semana ›</a>
  </Vazio>
{:else}
  <section class="card resumo">
    <div>
      <strong>Semana de {dataCurta(semana.id)} a {dataCurta(semana.id, 4)}</strong>
      <p class="email">
        {#if enviadoEm}📧 Enviada por e-mail em {hora(enviadoEm)}{:else}📧 E-mail ainda não enviado{/if}
      </p>
    </div>
    {#if itens.length}<span class="contador" class:tudo={noCarrinho === itens.length}>{noCarrinho}/{itens.length}</span>{/if}
  </section>

  {#if itens.length}
    <ul class="lista">
      {#each itens as item (item.id)}
        <li>
          <button class="item" class:comprado={item.comprado} onclick={() => marcar(item)} aria-pressed={item.comprado}>
            <span class="caixa">{item.comprado ? '✓' : ''}</span>
            <span class="emoji">{item.emoji}</span>
            <span class="nome">{item.nome}</span>
            <span class="qtd">{quantidadeComUnidade(item.quantidade, item.unidade)}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if noCarrinho === itens.length}<p class="parabens">Tudo no carrinho! 🎉</p>{/if}
  {:else}
    <Vazio emoji="🛒" titulo="Hakuna matata, não falta nada 🐟">Tem tudo em casa para essa semana.</Vazio>
  {/if}

  <div class="acoes">
    {#if itens.length}<button class="botao" onclick={copiar}>📋 Copiar lista</button>{/if}
    <button class="botao" onclick={enviar} disabled={enviando}>
      {enviando ? 'Enviando…' : enviadoEm ? '📧 Reenviar e-mail' : '📧 Enviar e-mail'}
    </button>
  </div>
  <a class="link" href="#/semana/{semana.id}">Ver o planejamento da semana ›</a>
{/if}

<style>
  .resumo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
  }
  .email {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: var(--texto-suave);
  }
  .contador {
    flex: none;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--fundo);
    color: var(--texto-suave);
  }
  .contador.tudo {
    background: var(--verde-fundo);
    color: var(--verde);
  }
  .lista {
    list-style: none;
    margin: 16px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .item {
    appearance: none;
    border: none;
    font: inherit;
    color: var(--texto);
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 999px;
    background: var(--card);
    box-shadow: var(--sombra);
    text-align: left;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .caixa {
    flex: none;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--borda);
    font-weight: 800;
    font-size: 0.9rem;
  }
  .emoji {
    font-size: 1.4rem;
  }
  .nome {
    flex: 1;
    font-weight: 700;
  }
  .qtd {
    font-weight: 700;
    color: var(--texto-suave);
  }
  .comprado {
    opacity: 0.55;
    box-shadow: none;
  }
  .comprado .nome {
    text-decoration: line-through;
  }
  .comprado .caixa {
    border-color: var(--verde);
    background: var(--verde);
    color: #fff;
  }
  .parabens {
    text-align: center;
    font-weight: 700;
    color: var(--verde);
  }
  .acoes {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
  }
  .link {
    display: block;
    margin-top: 16px;
    text-align: center;
    font-weight: 600;
    color: var(--primaria);
    text-decoration: none;
  }
</style>
