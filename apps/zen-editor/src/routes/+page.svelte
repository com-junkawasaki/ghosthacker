<script lang="ts">
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/Topology.svelte';
  import { onMount } from 'svelte';
  import { client } from '../lib/api';

  // Svelte 5 Runes
  let viewMode = $state('zen');
  let metadata = $state({ title: "Loading...", description: "", episodes: [] });
  let selectedFilePath = $state("");

  onMount(async () => {
    try {
      const resp = await client.getProjectMetadata({ projectId: "251022" });
      metadata = resp;
    } catch (err) {
      console.error("Failed to load project metadata:", err);
    }
  });

  function selectFile(path: string) {
    // Path in manifest is relative to 251022/wattpad/
    selectedFilePath = "251022/wattpad/" + path;
    viewMode = 'zen';
  }
</script>

<div class="app-layout">
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1 class="app-title">{metadata.title}</h1>
      <p class="app-desc">{metadata.description}</p>
    </div>
    
    <div class="nav-group">
      <button class:active={viewMode === 'zen'} onclick={() => viewMode = 'zen'}>
        <span class="icon">✎</span> Zen Editor
      </button>
      <button class:active={viewMode === 'topology'} onclick={() => viewMode = 'topology'}>
        <span class="icon">⬢</span> Topology
      </button>
    </div>

    <div class="project-files">
      <h3>Manuscripts</h3>
      {#each metadata.episodes as ep}
        <div class="episode-group">
          <span class="episode-id">{ep.id}</span>
          <span class="episode-title">{ep.title}</span>
          <ul>
            {#each ep.files as file}
              <li>
                <button 
                  class="file-link" 
                  class:selected={selectedFilePath === "251022/wattpad/" + file}
                  onclick={() => selectFile(file)}
                >
                  {file.split('/').pop()}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

    <div class="sidebar-footer">
      <span class="status-dot online"></span> 2065 Tokyo Connectivity
    </div>
  </nav>

  <main class="content">
    {#if viewMode === 'zen'}
      <Editor bind:filePath={selectedFilePath} />
    {:else}
      <div class="topology-view">
        <header class="view-header">
          <h1>Graph Topology</h1>
          <p>Structural relationships from the 251022 story graph.</p>
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
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    background: #ffffff;
    color: #1d1d1f;
    -webkit-font-smoothing: antialiased;
  }
  .app-layout { display: flex; height: 100vh; overflow: hidden; }
  
  .sidebar { 
    width: 260px; 
    background: #f5f5f7; 
    border-right: 1px solid #d2d2d7; 
    display: flex; 
    flex-direction: column; 
    padding: 1.5rem;
    overflow-y: auto;
  }

  .sidebar-header { margin-bottom: 2rem; }
  .app-title { font-weight: 700; font-size: 1.1rem; margin: 0; }
  .app-desc { font-size: 0.75rem; color: #86868b; margin: 0.2rem 0 0 0; line-height: 1.4; }

  .nav-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 2rem; }
  .sidebar button { 
    background: transparent; 
    border: none; 
    text-align: left; 
    padding: 0.6rem 0.8rem; 
    cursor: pointer; 
    border-radius: 8px; 
    font-size: 0.9rem; 
    display: flex; 
    align-items: center; 
    gap: 0.6rem; 
    color: #1d1d1f;
    transition: all 0.2s;
  }
  .sidebar button:hover { background: #e8e8ed; }
  .sidebar button.active { background: #0071e3; color: white; }

  .project-files h3 { 
    font-size: 0.7rem; 
    text-transform: uppercase; 
    color: #86868b; 
    letter-spacing: 0.05em; 
    margin-bottom: 1rem;
  }

  .episode-group { margin-bottom: 1.5rem; }
  .episode-id { font-size: 0.7rem; font-weight: 700; color: #0071e3; display: block; }
  .episode-title { font-size: 0.85rem; font-weight: 600; color: #1d1d1f; display: block; margin-bottom: 0.4rem; }
  
  .episode-group ul { list-style: none; padding: 0; margin: 0; }
  .file-link { 
    width: 100%;
    font-size: 0.8rem !important; 
    padding: 0.4rem 0.6rem !important;
    color: #424245 !important;
  }
  .file-link.selected { color: #0071e3 !important; font-weight: 600; }

  .sidebar-footer { margin-top: auto; padding-top: 1rem; font-size: 0.75rem; color: #86868b; display: flex; align-items: center; gap: 0.5rem; }
  .status-dot.online { width: 6px; height: 6px; background: #34c759; border-radius: 50%; }

  .content { flex: 1; height: 100%; overflow: hidden; background: #fff; position: relative; }

  .topology-view { height: 100%; display: flex; flex-direction: column; padding: 3rem; box-sizing: border-box; }
  .view-header h1 { font-size: 2rem; font-weight: 700; margin: 0; letter-spacing: -0.02em; }
  .view-header p { color: #86868b; font-size: 1.1rem; margin-top: 0.5rem; }
  .topology-canvas { flex: 1; margin-top: 2rem; border: 1px solid #f5f5f7; border-radius: 16px; overflow: hidden; background: #fafafa; }
</style>
