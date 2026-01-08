<script lang="ts">
  import Editor from '../components/Editor.svelte';
  let viewMode = 'zen';
</script>

<div class="app-layout">
  <nav class="sidebar">
    <div class="sidebar-header">
      <span class="app-title">Ghost Hacker</span>
    </div>
    <div class="nav-group">
      <button class:active={viewMode === 'zen'} on:click={() => viewMode = 'zen'}>
        <span class="icon">✎</span> Zen Editor
      </button>
      <button class:active={viewMode === 'topology'} on:click={() => viewMode = 'topology'}>
        <span class="icon">⬢</span> Topology
      </button>
    </div>
    <div class="sidebar-footer">
      <span class="status-dot online"></span> 2065 Tokyo Connectivity
    </div>
  </nav>

  <main class="content">
    {#if viewMode === 'zen'}
      <Editor />
    {:else}
      <div class="topology-view" style="padding: 4rem;">
        <h1>Graph Topology</h1>
        <p>Topology Active (Simulated)</p>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    background: #ffffff;
    color: #1d1d1f;
  }
  .app-layout { display: flex; height: 100vh; }
  .sidebar { width: 240px; background: #f5f5f7; border-right: 1px solid #d2d2d7; display: flex; flex-direction: column; padding: 1.5rem; }
  .sidebar-header { margin-bottom: 2rem; }
  .app-title { font-weight: 600; font-size: 0.9rem; }
  .nav-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
  .sidebar button { background: transparent; border: none; text-align: left; padding: 0.6rem 0.8rem; cursor: pointer; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; }
  .sidebar button.active { background: #0071e3; color: white; }
  .sidebar-footer { margin-top: auto; font-size: 0.75rem; color: #86868b; display: flex; align-items: center; gap: 0.5rem; }
  .status-dot.online { width: 6px; height: 6px; background: #34c759; border-radius: 50%; }
  .content { flex: 1; overflow-y: auto; background: #fff; }
</style>
