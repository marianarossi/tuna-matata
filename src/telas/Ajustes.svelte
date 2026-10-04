<script>
  import { signOut } from 'firebase/auth';
  import { doc, getDocFromServer, setDoc } from 'firebase/firestore';
  import { auth, db } from '../lib/firebase.js';
  import { dados } from '../lib/dados.svelte.js';
  import { validarEmails, montarBackup, nomeDoBackup } from '../lib/compras.js';
  import { emailConfigurado } from '../lib/email.js';
  import { avisar } from '../lib/aviso.svelte.js';

  // Confere se o banco responde e se as regras deixam a nossa conta ler.
  let banco = $state('verificando');
  getDocFromServer(doc(db, 'config', 'app'))
    .then(() => (banco = 'ok'))
    .catch((e) => (banco = e.code === 'permission-denied' ? 'sem-permissao' : 'offline'));

  const textoBanco = {
    verificando: '⏳ Verificando…',
    ok: '✅ Conectado',
    'sem-permissao': '⛔ Sem permissão (confira o UID nas regras)',
    offline: '📡 Sem conexão agora',
  };

  // Os dois e-mails que recebem a lista de compras (config/app).
  let emails = $state(['', '']);
  let editado = $state(false);
  let salvando = $state(false);
  // Preenche com o que está no banco (que pode chegar depois de abrir a tela), sem atropelar o que está sendo digitado.
  $effect(() => {
    const salvos = dados.emails;
    if (!editado) emails = [salvos[0] ?? '', salvos[1] ?? ''];
  });
  const mudou = $derived(validarEmails(emails).emails.join() !== dados.emails.join());

  async function salvarEmails() {
    const { emails: limpos, erro } = validarEmails(emails);
    if (erro) return avisar(erro);
    salvando = true;
    try {
      await setDoc(doc(db, 'config', 'app'), { emails: limpos }, { merge: true });
      emails = [limpos[0] ?? '', limpos[1] ?? ''];
      editado = false;
      avisar('📧 E-mails salvos.');
    } catch {
      avisar('Não deu para salvar. Precisa de internet.');
    }
    salvando = false;
  }

  // Backup: tudo do banco num JSON, a partir dos dados já sincronizados (sem esperar a rede,
  // porque o iPhone só abre o menu de compartilhar logo depois do toque).
  const tudoCarregado = $derived(dados.carregado && dados.receitasCarregadas && dados.semanasCarregadas);

  function baixar(arquivo) {
    const url = URL.createObjectURL(arquivo);
    Object.assign(document.createElement('a'), { href: url, download: arquivo.name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportarBackup() {
    const backup = montarBackup({
      ingredientes: dados.ingredientes,
      receitas: dados.receitas,
      semanas: Object.values(dados.semanas),
      config: [
        { id: 'app', emails: dados.emails },
        { id: 'planejamento', ultimaFinalizada: dados.ultimaFinalizada },
      ],
    });
    const arquivo = new File([JSON.stringify(backup, null, 2)], nomeDoBackup(), { type: 'application/json' });
    // No iPhone abre o menu de compartilhar ("Salvar em Arquivos"); no computador, baixa.
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [arquivo] })) {
      navigator.share({ files: [arquivo] }).catch((e) => {
        if (e.name !== 'AbortError') baixar(arquivo);
      });
    } else {
      baixar(arquivo);
    }
  }

  async function sair() {
    if (confirm('Sair deste celular? Vai pedir a senha de novo.')) await signOut(auth);
  }
</script>

<section class="card">
  <div class="linha">
    <span>🔐 Sessão</span>
    <strong>Entrou</strong>
  </div>
  <div class="linha">
    <span>☁️ Banco</span>
    <strong>{textoBanco[banco]}</strong>
  </div>
</section>

<a class="card atalho" href="#/ingredientes">
  <span>🧂 Ingredientes</span>
  <span class="seta">›</span>
</a>

<h2>📧 E-mails da lista de compras</h2>
<section class="card emails" oninput={() => (editado = true)}>
  <input type="email" bind:value={emails[0]} placeholder="primeiro@email.com" aria-label="Primeiro e-mail" autocomplete="off" />
  <input type="email" bind:value={emails[1]} placeholder="segundo@email.com" aria-label="Segundo e-mail" autocomplete="off" />
  {#if !emailConfigurado()}
    <p class="aviso-email">⚠️ O envio ainda não foi configurado no EmailJS (passo 8 de docs/configuracao.md).</p>
  {/if}
  <button class="botao primario largo" onclick={salvarEmails} disabled={salvando || !mudou}>Salvar e-mails</button>
</section>

<h2>💾 Backup</h2>
<p class="explica">Baixa um arquivo com ingredientes, estoque, receitas e todas as semanas. O plano grátis não faz backup sozinho.</p>
<button class="botao largo" onclick={exportarBackup} disabled={!tudoCarregado}>
  {tudoCarregado ? '💾 Exportar backup' : 'Carregando…'}
</button>

<button class="botao perigo largo sair" onclick={sair}>Sair deste celular</button>

<p class="rodape">🐟 Tuna Matata</p>

<style>
  .card {
    padding: 4px 16px;
    margin-bottom: 20px;
  }
  .linha {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 0;
  }
  .linha + .linha {
    border-top: 1px solid var(--borda);
  }
  .linha strong {
    text-align: right;
  }
  .atalho {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    margin-bottom: 20px;
    color: var(--texto);
    text-decoration: none;
    font-weight: 600;
  }
  .seta {
    color: var(--texto-suave);
    font-size: 1.3rem;
  }
  h2 {
    margin: 0 4px 10px;
    font-size: 1rem;
  }
  .emails {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }
  .emails input {
    background: var(--fundo);
  }
  .aviso-email {
    margin: 0;
    font-size: 0.85rem;
    color: var(--amarelo);
  }
  .explica {
    margin: 0 4px 12px;
    color: var(--texto-suave);
    font-size: 0.9rem;
  }
  .sair {
    margin-top: 28px;
  }
  .rodape {
    text-align: center;
    color: var(--texto-suave);
    margin-top: 32px;
  }
</style>
