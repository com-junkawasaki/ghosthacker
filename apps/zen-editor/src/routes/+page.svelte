<script lang="ts">
  import Editor from '$components/Editor.svelte';
  import Topology from '$components/Topology.svelte';
  let viewMode = 'zen'; // 'zen' or 'topology'
</script>

<div class="app-layout">
  <nav class="sidebar">
    <button class:active={viewMode === 'zen'} on:click={() => viewMode = 'zen'}>
      Zen Mode
    </button>
    <button class:active={viewMode === 'topology'} on:click={() => viewMode = 'topology'}>
      Topology
    </button>
  </nav>

  <main class="content">
    {#if viewMode === 'zen'}
      <Editor />
    {:else}
      <div class="topology-view">
        <h2>Graph Topology Visualization</h2>
        <Topology />
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .app-layout {
    display: flex;
    height: 100vh;
  }

  .sidebar {
    width: 200px;
    background: #1a1a1a;
    color: white;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
  }

  .sidebar button {
    background: transparent;
    border: none;
    color: #888;
    text-align: left;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .sidebar button.active {
    background: #333;
    color: white;
  }

  .content {
    flex: 1;
    overflow-y: auto;
  }

  .topology-view {
    padding: 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>

