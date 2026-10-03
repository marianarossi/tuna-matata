<script>
  import { signOut } from 'firebase/auth';
  import { doc, getDocFromServer } from 'firebase/firestore';
  import { auth, db } from '../lib/firebase.js';

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

<button class="botao perigo largo" onclick={sair}>Sair deste celular</button>

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
  .rodape {
    text-align: center;
    color: var(--texto-suave);
    margin-top: 32px;
  }
</style>
