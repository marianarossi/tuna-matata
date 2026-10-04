<script>
  import { db } from '../lib/firebase.js';
  import { dados, receitaPorId, ingredientePorId } from '../lib/dados.svelte.js';
  import { DIAS, REFEICOES, segundaPadrao, somarSemanas, dataCurta, nomeDoSlot, paraId } from '../lib/semana.js';
  import { escolherRefeicao, finalizarSemana, reabrirSemana, ErroPlanejamento } from '../lib/planejamento.js';
  import { avisar } from '../lib/aviso.svelte.js';
  import EscolherRefeicao from '../componentes/EscolherRefeicao.svelte';
  import ChipIngrediente from '../componentes/ChipIngrediente.svelte';

  // id = segunda-feira da semana (AAAA-MM-DD); sem id, abre a semana padrão.
  let { id } = $props();
  const padrao = segundaPadrao();
  const semanaId = /^\d{4}-\d{2}-\d{2}$/.test(id ?? '') ? id : padrao;

  const semana = $derived(dados.semanas[semanaId] ?? { status: 'rascunho', refeicoes: {} });
  const finalizada = $derived(semana.status === 'finalizada');
  const podeReabrir = $derived(finalizada && dados.ultimaFinalizada === semanaId);
  const totalReceitas = $derived(Object.values(semana.refeicoes ?? {}).filter((r) => r?.tipo === 'receita').length);
  const hoje = paraId(new Date());
  const somarDia = (i) => {
    const [a, m, d] = semanaId.split('-').map(Number);
    return paraId(new Date(a, m - 1, d + i));
  };

  let slotAberto = $state(null);
  let ocupado = $state(false);

  function mensagemDeErro(e) {
    if (e instanceof ErroPlanejamento) return e.message;
    if (e?.code === 'unavailable' || e?.code === 'failed-precondition') return 'Precisa de internet para isso.';
    return 'Não deu certo. Tenta de novo.';
  }

  async function escolher(valor) {
    const slot = slotAberto;
    slotAberto = null;
    try {
      await escolherRefeicao(db, semanaId, slot, valor);
    } catch (e) {
      avisar(mensagemDeErro(e));
    }
  }

  async function finalizar() {
    if (!confirm('Finalizar a semana? O estoque vai ser descontado e a lista de compras, gerada.')) return;
    ocupado = true;
    try {
      await finalizarSemana(db, semanaId);
      avisar('✅ Semana finalizada!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert(mensagemDeErro(e));
    }
    ocupado = false;
  }

  async function reabrir() {
    if (!confirm('Reabrir a semana? O que foi descontado volta para o estoque e a lista de compras é apagada.')) return;
    ocupado = true;
    try {
      await reabrirSemana(db, semanaId);
      avisar('↩️ Semana reaberta. O estoque foi devolvido.');
    } catch (e) {
      alert(mensagemDeErro(e));
    }
    ocupado = false;
  }

  function descrever(refeicao) {
    if (!refeicao) return null;
    if (refeicao.tipo === 'sobras') return { emoji: '🍲', nome: 'Sobras' };
    if (refeicao.tipo === 'fora') return { emoji: '🍽️', nome: 'Comer fora' };
    const receita = receitaPorId(refeicao.receitaId);
    return receita ? { emoji: receita.emoji, nome: receita.nome } : { emoji: '❓', nome: 'Receita apagada', erro: true };
  }

  // Na semana finalizada, marca as refeições que dependem da lista de compras.
  const precisaComprar = $derived(
    new Set((semana.detalhe ?? []).filter((d) => Object.keys(d.falta ?? {}).length).map((d) => d.slot)),
  );
  const descontados = $derived(Object.entries(semana.descontado ?? {}));
  const compras = $derived(Object.entries(semana.compras ?? {}));
</script>

<nav class="navegar">
  <a class="botao-icone" href="#/semana/{somarSemanas(semanaId, -1)}" aria-label="Semana anterior">‹</a>
  <div class="titulo">
    <strong>{dataCurta(semanaId)} a {dataCurta(semanaId, 4)}</strong>
    {#if finalizada}<span class="estado ok">✅ Finalizada</span>{:else}<span class="estado">✏️ Rascunho</span>{/if}
  </div>
  <a class="botao-icone" href="#/semana/{somarSemanas(semanaId, 1)}" aria-label="Próxima semana">›</a>
</nav>
{#if semanaId !== padrao}
  <a class="voltar-padrao" href="#/semana/{padrao}">Ir para a semana de {dataCurta(padrao)}</a>
{/if}

{#if finalizada}
  <section class="card resumo">
    <h3>📦 Saiu do estoque</h3>
    {#if descontados.length}
      <div class="chips">
        {#each descontados as [ingId, qtd] (ingId)}
          <ChipIngrediente ingredienteId={ingId} ingrediente={ingredientePorId(ingId)} quantidade={qtd} />
        {/each}
      </div>
    {:else}
      <p class="suave">Nada. O estoque estava vazio para essas receitas.</p>
    {/if}

    <h3>🛒 Lista de compras</h3>
    {#if compras.length}
      <div class="chips">
        {#each compras as [ingId, item] (ingId)}
          <ChipIngrediente ingredienteId={ingId} ingrediente={ingredientePorId(ingId)} quantidade={item.quantidade} />
        {/each}
      </div>
    {:else}
      <p class="suave">Hakuna matata, não falta nada 🐟</p>
    {/if}

    {#if podeReabrir}
      <button class="botao largo reabrir" onclick={reabrir} disabled={ocupado}>↩️ Reabrir planejamento</button>
    {/if}
  </section>
{/if}

<div class="dias">
  {#each DIAS as dia, i (dia.id)}
    <section class="card dia" class:hoje={hoje === somarDia(i)}>
      <h3>{dia.nome} <span>{dataCurta(semanaId, i)}</span></h3>
      <div class="slots">
        {#each REFEICOES as refeicao (refeicao.id)}
          {@const slot = `${dia.id}-${refeicao.id}`}
          {@const info = descrever(semana.refeicoes?.[slot])}
          <button
            class="slot"
            class:vazio={!info}
            class:erro={info?.erro}
            disabled={finalizada}
            onclick={() => (slotAberto = slot)}
            aria-label="{nomeDoSlot(slot)}: {info?.nome ?? 'vazio'}"
          >
            <span class="refeicao">{refeicao.emoji} {refeicao.nome}</span>
            {#if info}
              <span class="prato"><span class="emoji">{info.emoji}</span> {info.nome}</span>
              {#if precisaComprar.has(slot)}<span class="compra">🛒 depende de compra</span>{/if}
            {:else}
              <span class="prato vazio" class:fechado={finalizada}>{finalizada ? '—' : '＋ Escolher'}</span>
            {/if}
          </button>
        {/each}
      </div>
    </section>
  {/each}
</div>

{#if !finalizada}
  <button class="botao primario largo finalizar" onclick={finalizar} disabled={ocupado || totalReceitas === 0}>
    {ocupado ? 'Finalizando…' : totalReceitas ? `Finalizar planejamento (${totalReceitas} ${totalReceitas === 1 ? 'receita' : 'receitas'})` : 'Escolha as receitas da semana'}
  </button>
{/if}

{#if slotAberto}
  <EscolherRefeicao
    titulo={nomeDoSlot(slotAberto)}
    atual={semana.refeicoes?.[slotAberto]}
    onescolher={escolher}
    onfechar={() => (slotAberto = null)}
  />
{/if}

<style>
  .navegar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .navegar .botao-icone {
    font-size: 1.6rem;
    font-weight: 700;
  }
  .titulo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .titulo strong {
    font-size: 1.1rem;
  }
  .estado {
    font-size: 0.78rem;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--card);
    color: var(--texto-suave);
  }
  .estado.ok {
    background: var(--verde-fundo);
    color: var(--verde);
  }
  .voltar-padrao {
    display: block;
    margin-top: 8px;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--primaria);
  }
  .resumo {
    margin-top: 16px;
    padding: 4px 16px 16px;
  }
  .resumo h3 {
    margin: 14px 0 8px;
    font-size: 1rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .suave {
    margin: 0;
    color: var(--texto-suave);
  }
  .reabrir {
    margin-top: 18px;
    box-shadow: none;
    background: var(--fundo);
  }
  .dias {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }
  .dia {
    padding: 12px;
  }
  .dia.hoje {
    outline: 2px solid var(--primaria);
  }
  .dia h3 {
    margin: 0 4px 10px;
    font-size: 1rem;
  }
  .dia h3 span {
    color: var(--texto-suave);
    font-weight: 600;
    margin-left: 4px;
  }
  .slots {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .slot {
    appearance: none;
    border: none;
    font: inherit;
    color: var(--texto);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 76px;
    padding: 10px;
    border-radius: 14px;
    background: var(--fundo);
    cursor: pointer;
  }
  .slot:disabled {
    cursor: default;
    opacity: 1;
  }
  .slot.vazio {
    background: transparent;
    border: 2px dashed var(--borda);
  }
  .slot.erro {
    background: var(--vermelho-fundo);
  }
  .refeicao {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--texto-suave);
  }
  .prato {
    font-weight: 700;
    font-size: 0.92rem;
    line-height: 1.25;
  }
  .prato.vazio {
    color: var(--primaria);
  }
  .prato.fechado {
    color: var(--texto-suave);
  }
  .prato .emoji {
    font-size: 1.1rem;
  }
  .compra {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--amarelo);
  }
  .finalizar {
    margin-top: 18px;
  }
</style>
