<script lang="ts">
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/Topology.svelte';
  import { onMount } from 'svelte';
  import { client } from '../lib/api';
  import { open } from '@tauri-apps/plugin-dialog';

  // Svelte 5 Runes
  let viewMode = $state('topology'); // Start in topology mode
  let metadata = $state({ title: "Ghost Hacker", description: "", episodes: [] });
  let selectedNode = $state(null);
  let isEditorOpen = $state(false);

  onMount(async () => {
    try {
      const resp = await client.getProjectMetadata({ projectId: "251022" });
      metadata = resp;
    } catch (err) {
      console.error("Failed to load project metadata:", err);
    }
  });

  async function handleImportFile() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }]
      });
      if (selected) {
        // In a real app, you'd send this path to the backend to copy/import
        alert(`Selected file for node import: ${selected}\n(Backend logic to map this to graph node pending)`);
      }
    } catch (err) {
      console.error("File dialog failed:", err);
    }
  }

  function handleNodeSelect(node) {
    selectedNode = node;
    // If it's a manuscript node (mapped to a file), we can open the editor
    if (node.filePath || node.type === 'manuscript') {
      isEditorOpen = true;
    }
  }

  function closeEditor() {
    isEditorOpen = false;
  }
</script>

<div class="app-layout">
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1 class="app-title">{metadata.title}</h1>
      <p class="app-desc">Graph-based Story Engine</p>
    </div>
    
    <div class="nav-group">
      <button class:active={viewMode === 'topology'} onclick={() => viewMode = 'topology'}>
        <span class="icon">⬢</span> Graph Topology
      </button>
      <button onclick={handleImportFile}>
        <span class="icon">📥</span> Import Node (File)
      </button>
    </div>

    <div class="selection-detail">
      {#if selectedNode}
        <div class="detail-card">
          <h3>Selected Node</h3>
          <p class="node-label">{selectedNode.label}</p>
          <p class="node-type">{selectedNode.type}</p>
          {#if selectedNode.filePath || selectedNode.type === 'manuscript'}
            <button class="action-btn" onclick={() => isEditorOpen = true}>Edit Content</button>
          {/if}
        </div>
      {:else}
        <p class="hint">Select a node in the graph to view details or edit.</p>
      {/if}
    </div>

    <div class="sidebar-footer">
      <span class="status-dot online"></span> 2065 Tokyo Connectivity
    </div>
  </nav>

  <main class="content">
    <div class="topology-wrapper" class:dimmed={isEditorOpen}>
      <header class="view-header">
        <h1>Topology Mode</h1>
        <p>Interactive graph of world entities and narrative nodes.</p>
      </header>
      <div class="topology-canvas">
        <Topology onSelect={handleNodeSelect} />
      </div>
    </div>

    {#if isEditorOpen && selectedNode}
      <div class="editor-overlay">
        <button class="close-overlay" onclick={closeEditor}>✕ Close Zen Mode</button>
        <div class="editor-container-inner">
          <Editor bind:filePath={selectedNode.filePath} />
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
    width: 280px; 
    background: #f5f5f7; 
    border-right: 1px solid #d2d2d7; 
    display: flex; 
    flex-direction: column; 
    padding: 1.5rem;
    z-index: 20;
  }

  .sidebar-header { margin-bottom: 2rem; }
  .app-title { font-weight: 700; font-size: 1.1rem; margin: 0; }
  .app-desc { font-size: 0.75rem; color: #86868b; margin: 0.2rem 0 0 0; }

  .nav-group { margin-bottom: 2rem; }
  .sidebar button { 
    width: 100%;
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
  .sidebar button.active { background: #0071e3; color: white; }

  .selection-detail { flex: 1; margin-top: 1rem; }
  .detail-card { 
    background: white; 
    padding: 1rem; 
    border-radius: 12px; 
    border: 1px solid #d2d2d7;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .detail-card h3 { font-size: 0.7rem; text-transform: uppercase; color: #86868b; margin: 0 0 0.5rem 0; }
  .node-label { font-weight: 600; font-size: 1rem; margin: 0; }
  .node-type { font-size: 0.75rem; color: #0071e3; margin: 0.2rem 0 1rem 0; }
  .action-btn { 
    width: 100%; 
    background: #0071e3 !important; 
    color: white !important; 
    font-weight: 600; 
    justify-content: center;
  }
  .hint { font-size: 0.8rem; color: #86868b; line-height: 1.5; }

  .sidebar-footer { padding-top: 1rem; font-size: 0.75rem; color: #86868b; display: flex; align-items: center; gap: 0.5rem; }
  .status-dot.online { width: 6px; height: 6px; background: #34c759; border-radius: 50%; }

  .content { flex: 1; height: 100%; overflow: hidden; background: #fff; position: relative; }

  .topology-wrapper { height: 100%; display: flex; flex-direction: column; padding: 3rem; box-sizing: border-box; transition: filter 0.3s; }
  .topology-wrapper.dimmed { filter: blur(10px) grayscale(0.5); pointer-events: none; }

  .view-header h1 { font-size: 2rem; font-weight: 700; margin: 0; }
  .view-header p { color: #86868b; font-size: 1.1rem; margin-top: 0.5rem; }
  .topology-canvas { flex: 1; margin-top: 2rem; border: 1px solid #f5f5f7; border-radius: 16px; overflow: hidden; background: #fafafa; }

  .editor-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    z-index: 100;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }

  .close-overlay {
    position: absolute;
    top: 2rem; right: 2rem;
    background: #1d1d1f;
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    z-index: 110;
  }

  .editor-container-inner { flex: 1; overflow: hidden; }
</style>
