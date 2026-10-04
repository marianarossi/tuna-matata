<script>
  import { doc, writeBatch } from 'firebase/firestore';
  import { db } from '../lib/firebase.js';
  import { dados } from '../lib/dados.svelte.js';
  import { lerJsonDeReceitas, validarReceitas } from '../lib/receitas.js';
  import { avisar } from '../lib/aviso.svelte.js';

  let texto = $state('');
  let erro = $state('');
  let resultado = $state(null);
  let importando = $state(false);

  function conferir() {
    erro = '';
    resultado = null;
    try {
      const lista = lerJsonDeReceitas(texto);
      resultado = validarReceitas(
        lista,
        dados.ingredientes.map((i) => i.id),
        dados.receitas.map((r) => r.id),
      );
    } catch (e) {
      erro = e.message;
    }
  }

  async function importar() {
    importando = true;
    try {
      // Um lote do Firestore aceita até 500 gravações.
      for (let i = 0; i < resultado.prontas.length; i += 400) {
        const lote = writeBatch(db);
        for (const { id, dados: receita } of resultado.prontas.slice(i, i + 400)) lote.set(doc(db, 'receitas', id), receita);
        await lote.commit();
      }
      avisar(`📥 ${resultado.prontas.length} receitas importadas.`);
      location.hash = '#/receitas';
    } catch {
      erro = 'Não deu para importar. Tenta de novo.';
      importando = false;
    }
  }

  // Texto para colar em outro chat de IA e pedir receitas no formato certo.
  const instrucoes = $derived(
    `Crie receitas simples em JSON, exatamente neste formato:
{
  "receitas": [
    { "id": "massa-com-atum", "nome": "Massa com atum", "emoji": "🍝", "tempoMin": 20,
      "ingredientes": [ { "ingredienteId": "atum", "quantidade": 1 }, { "ingredienteId": "massa", "quantidade": 1 } ] }
  ]
}
Regras: quantidades são números inteiros (na unidade indicada). "id" minúsculo, sem acento, com hífens.
Use SOMENTE estes ingredienteId (id: nome, unidade):
${dados.ingredientes.map((i) => `${i.id}: ${i.nome}, ${i.unidade}${i.basico ? ' (básico)' : ''}`).join('\n')}`,
  );

  async function copiarInstrucoes() {
    try {
      await navigator.clipboard.writeText(instrucoes);
      avisar('📋 Instruções copiadas. Cole no outro chat.');
    } catch {
      avisar('Não deu para copiar.');
    }
  }
</script>

<p class="explica">
  Cole aqui um JSON de receitas no formato do seed. Receitas com id que já existe são puladas, e eu aviso se algum
  ingrediente não existir.
</p>

<button class="botao largo" onclick={copiarInstrucoes}>📋 Copiar instruções para outro chat de IA</button>

<textarea
  bind:value={texto}
  rows="10"
  placeholder={'{ "receitas": [ … ] }'}
  spellcheck="false"
  autocapitalize="off"
  autocomplete="off"
  oninput={() => (resultado = null)}
></textarea>

<button class="botao primario largo" onclick={conferir} disabled={!texto.trim()}>Conferir</button>

{#if erro}<p class="erro">{erro}</p>{/if}

{#if resultado}
  <div class="card resultado">
    <p>✅ <strong>{resultado.prontas.length}</strong> prontas para importar</p>
    {#if resultado.prontas.length}
      <ul>{#each resultado.prontas as r (r.id)}<li>{r.dados.emoji} {r.dados.nome}</li>{/each}</ul>
    {/if}

    {#if resultado.puladas.length}
      <p>⏭️ <strong>{resultado.puladas.length}</strong> já existem (puladas)</p>
      <ul>{#each resultado.puladas as r}<li>{r.nome || r.id} <code>{r.id}</code></li>{/each}</ul>
    {/if}

    {#if resultado.idsInexistentes.length}
      <p>⚠️ Ingredientes que <strong>não existem</strong> no catálogo:</p>
      <div class="ids">
        {#each resultado.idsInexistentes as id}<span class="chip vermelho">{id}</span>{/each}
      </div>
      <p class="dica">Crie esses ingredientes em ⚙️ → Ingredientes (com o mesmo id) ou corrija o JSON.</p>
    {/if}

    {#if resultado.invalidas.length}
      <p>❌ <strong>{resultado.invalidas.length}</strong> com problema (não entram)</p>
      <ul>
        {#each resultado.invalidas as r}<li><strong>{r.nome}</strong>: {r.erros.join('; ')}</li>{/each}
      </ul>
    {/if}
  </div>

  {#if resultado.prontas.length}
    <button class="botao primario largo" onclick={importar} disabled={importando}>
      {importando ? 'Importando…' : `Importar ${resultado.prontas.length} ${resultado.prontas.length === 1 ? 'receita' : 'receitas'}`}
    </button>
  {/if}
{/if}

<style>
  .explica {
    margin: 0 4px 12px;
    color: var(--texto-suave);
  }
  textarea {
    margin: 12px 0;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 14px;
    resize: vertical;
  }
  .erro {
    color: var(--vermelho);
    font-weight: 600;
  }
  .resultado {
    margin: 16px 0;
    padding: 6px 16px;
  }
  .resultado ul {
    margin: 0 0 8px;
    padding-left: 20px;
  }
  .resultado li {
    margin: 2px 0;
  }
  .ids {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .dica {
    font-size: 0.85rem;
    color: var(--texto-suave);
  }
  code {
    font-size: 0.8rem;
    color: var(--texto-suave);
  }
</style>
