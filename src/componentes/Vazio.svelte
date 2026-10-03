<script>
  // Estado vazio com um toque de humor.
  let { emoji = '🐟', titulo, children } = $props();
</script>

<div class="vazio">
  <div class="emoji">{emoji}</div>
  <p class="titulo">{titulo}</p>
  {#if children}<div class="extra">{@render children()}</div>{/if}
</div>

<style>
  .vazio {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 56px 24px;
    color: var(--texto-suave);
  }
  .emoji {
    font-size: 3.5rem;
    margin-bottom: 12px;
  }
  .titulo {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--texto);
  }
  .extra {
    margin-top: 6px;
    font-size: 0.95rem;
  }
</style>
