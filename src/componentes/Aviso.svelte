<script>
  import { aviso } from '../lib/aviso.svelte.js';
</script>

{#if aviso.texto}
  <div class="aviso" role="status">{aviso.texto}</div>
{/if}

<style>
  .aviso {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: calc(env(safe-area-inset-bottom) + 84px);
    z-index: 20;
    padding: 12px 16px;
    border-radius: 14px;
    background: var(--texto);
    color: var(--fundo);
    font-weight: 600;
    text-align: center;
    box-shadow: var(--sombra);
    animation: subir 0.2s ease-out;
  }
  @keyframes subir {
    from { transform: translateY(12px); opacity: 0; }
  }
</style>
