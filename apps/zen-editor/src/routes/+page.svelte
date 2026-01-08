<script lang="ts">
  import Editor from '$components/Editor.svelte';
  import Topology from '$components/Topology.svelte';
  let viewMode = 'zen'; // 'zen' or 'topology'
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
      <div class="topology-view">
        <header class="view-header">
          <h1>Graph Topology</h1>
          <p>Structural relationships from the narrative arc.</p>
        </header>
        <div class="topology-canvas">
          <Topology />
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #ffffff;
    color: #1d1d1f;
  }

  .app-layout {
    display: flex;
    height: 100vh;
  }

  .sidebar {
    width: 240px;
    background: #f5f5f7;
    border-right: 1px solid #d2d2d7;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  .sidebar-header {
    margin-bottom: 2rem;
  }

  .app-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: #1d1d1f;
    letter-spacing: 0.02em;
  }

  .nav-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
  }

  .sidebar button {
    background: transparent;
    border: none;
    color: #1d1d1f;
    text-align: left;
    padding: 0.6rem 0.8rem;
    cursor: pointer;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    transition: background 0.2s;
  }

  .sidebar button .icon {
    font-size: 1.1rem;
    opacity: 0.6;
  }

  .sidebar button:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .sidebar button.active {
    background: #0071e3;
    color: white;
  }

  .sidebar button.active .icon {
    opacity: 1;
  }

  .sidebar-footer {
    margin-top: auto;
    font-size: 0.75rem;
    color: #86868b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot.online {
    width: 6px;
    height: 6px;
    background: #34c759;
    border-radius: 50%;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    background: #fff;
  }

  .topology-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 4rem;
  }

  .view-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .view-header p {
    color: #86868b;
    font-size: 1.1rem;
    margin-top: 0.5rem;
  }

  .topology-canvas {
    flex: 1;
    margin-top: 2rem;
    border: 1px solid #f5f5f7;
    border-radius: 16px;
    overflow: hidden;
  }
</style>

