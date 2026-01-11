<script lang="ts">
  import { page } from '$app/stores';
  
  let { error: errorProp, status: statusProp } = $props<{
    error?: Error;
    status?: number;
  }>();
  
  // Fallback if props are not available - use derived to react to prop changes
  let error = $derived(errorProp || new Error('Unknown error occurred'));
  let status = $derived(statusProp || 500);
</script>

<div class="error-container">
  <h1>{status}</h1>
  <h2>Internal Error</h2>
  {#if error}
    <p class="error-message">{error.message}</p>
  {/if}
  <p class="hint">Please check if the backend server is running on port 8080.</p>
  <button onclick={() => window.location.reload()}>Retry</button>
</div>

<style>
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: #fff;
    color: #000;
  }
  
  h1 {
    font-size: 4rem;
    font-weight: bold;
    margin: 0;
  }
  
  h2 {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0.5rem 0;
  }
  
  .error-message {
    color: #666;
    margin: 1rem 0;
  }
  
  .hint {
    color: #999;
    font-size: 0.9rem;
    margin: 1rem 0;
  }
  
  button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #0071e3;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
</style>

