<script>
  import { signInWithEmailAndPassword } from 'firebase/auth';
  import { auth } from '../lib/firebase.js';
  import { EMAIL_DA_CONTA } from '../config.js';

  let senha = $state('');
  let erro = $state('');
  let entrando = $state(false);

  const mensagens = {
    'auth/invalid-credential': 'Senha errada. Tenta de novo 🐟',
    'auth/wrong-password': 'Senha errada. Tenta de novo 🐟',
    'auth/too-many-requests': 'Muitas tentativas. Respira e tenta daqui a pouco.',
    'auth/network-request-failed': 'Sem internet. Precisa de sinal só desta vez.',
  };

  async function entrar(evento) {
    evento.preventDefault();
    if (!senha) return;
    entrando = true;
    erro = '';
    try {
      await signInWithEmailAndPassword(auth, EMAIL_DA_CONTA, senha);
    } catch (e) {
      erro = mensagens[e.code] ?? 'Não deu para entrar. Tenta de novo.';
      entrando = false;
    }
  }
</script>

<div class="login">
  <img src="/icone.svg" alt="" width="112" height="112" />
  <h1>Tuna Matata</h1>
  <p class="subtitulo">Hakuna matata, a janta tá planejada.</p>

  <form onsubmit={entrar}>
    <input
      type="password"
      placeholder="Senha"
      autocomplete="current-password"
      bind:value={senha}
      disabled={entrando}
    />
    <button class="botao primario" type="submit" disabled={entrando || !senha}>
      {entrando ? 'Entrando…' : 'Entrar'}
    </button>
    {#if erro}<p class="erro">{erro}</p>{/if}
  </form>
</div>

<style>
  .login {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
  }
  img {
    border-radius: 26px;
    box-shadow: var(--sombra);
  }
  h1 {
    margin: 20px 0 4px;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .subtitulo {
    margin: 0 0 32px;
    color: var(--texto-suave);
  }
  form {
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  input {
    text-align: center;
  }
  .erro {
    margin: 4px 0 0;
    color: var(--vermelho);
    font-weight: 600;
  }
</style>
