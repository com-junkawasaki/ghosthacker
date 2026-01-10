<script lang="ts">
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/TopologyWebGPU.svelte';
  import Storyboard from '../components/Storyboard.svelte';
  import { onMount } from 'svelte';
  import { client } from '../lib/api';

  let selectedNode = $state<any>(null);
  let isSidebarOpen = $state(false);
  let isChatOpen = $state(false);
  let isEditorOpen = $state(false);
  let currentFilePath = $state("");
  let projectTitle = $state("GhostHacker Zen Editor");
  let activeView = $state<"graph" | "storyboard">("graph");

  onMount(() => {
    (async () => {
        try {
          if (client) {
            const resp = await client.getProjectMetadata({ projectId: "251022" });
            projectTitle = resp?.title || "GhostHacker Zen Editor";
          }
        } catch (err) {
          console.error("Failed to fetch metadata:", err);
        }
    })();
  });

  function handleNodeSelect(node: any, nodes: any[]) {
    selectedNode = node;
    isSidebarOpen = true;
  }
</script>

<div class="app-layout">
  <header class="main-header">
    <div class="header-left">
      <button class="menu-trigger">☰</button>
      <h1 class="project-title">{projectTitle}</h1>
    </div>
    
    <div class="view-switcher">
      <button 
        class:active={activeView === "graph"} 
        onclick={() => activeView = "graph"}
      >
        Graph View
      </button>
      <button 
        class:active={activeView === "storyboard"} 
        onclick={() => activeView = "storyboard"}
      >
        Storyboard View
      </button>
    </div>
  </header>

  <div class="main-content" class:dim={isChatOpen || isEditorOpen}>
      {#if activeView === "graph"}
        {@const topologyProps = { onSelect: handleNodeSelect, selectedId: selectedNode?.id } as any}
        <Topology {...topologyProps} />
      {:else}
        <Storyboard />
      {/if}
  </div>
  
  {#if isSidebarOpen && selectedNode}
    <div class="sidebar">
      <header class="sidebar-header">
          <h2>{selectedNode.label}</h2>
          <span class="node-type-tag">{selectedNode.group || selectedNode.type}</span>
      </header>
      
      <div class="sidebar-actions">
          <button class="action-btn primary" onclick={() => isChatOpen = true}>
            Chat with Node
          </button>
          
          <button class="action-btn secondary" onclick={() => isEditorOpen = true}>
            Open in Zen Editor
          </button>
      </div>

      <div class="sidebar-footer">
          <button class="close-btn" onclick={() => isSidebarOpen = false}>Close</button>
      </div>
    </div>
  {/if}

  {#if isChatOpen}
    <div class="chat-overlay">
      <div class="chat-panel">
        <div class="chat-header">
          <h3>Chatting with {selectedNode?.label}</h3>
          <button onclick={() => isChatOpen = false}>✕</button>
        </div>
        <div class="message-list">
          <div class="message">
            <span class="speaker">{selectedNode?.label}</span>
            <div class="msg-bubble">How can I help you today?</div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if isEditorOpen}
    <div class="editor-overlay">
        <div class="editor-container">
            <header class="editor-header">
                <button class="back-btn" onclick={() => isEditorOpen = false}>← Back to Graph</button>
                <div class="editor-status">Zen Mode</div>
            </header>
            <Editor bind:filePath={currentFilePath} />
        </div>
    </div>
  {/if}
</div>

<style>
  :global(body) { margin: 0; padding: 0; background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow: hidden; }
  .app-layout { width: 100vw; height: 100vh; background: #000; position: relative; display: flex; flex-direction: column; overflow: hidden; }
  .main-header { height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 10; }
  .header-left { display: flex; align-items: center; gap: 1.5rem; }
  .menu-trigger { background: transparent; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
  .project-title { font-size: 1rem; font-weight: 500; color: rgba(255,255,255,0.9); }
  
  .view-switcher {
    display: flex;
    background: rgba(255, 255, 255, 0.05);
    padding: 4px;
    border-radius: 12px;
    gap: 4px;
  }

  .view-switcher button {
    background: transparent;
    border: none;
    color: #86868b;
    padding: 6px 16px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .view-switcher button.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .main-content { flex: 1; position: relative; transition: opacity 0.4s; }
  .main-content.dim { opacity: 0.2; }

  .sidebar { position: absolute; top: 0; right: 0; width: 360px; height: 100%; background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(30px); color: #fff; padding: 2rem; z-index: 150; border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; }
  .sidebar-header { margin-bottom: 2.5rem; }
  .node-type-tag { font-size: 0.7rem; text-transform: uppercase; color: #0071e3; font-weight: 700; background: rgba(0, 113, 227, 0.1); padding: 0.2rem 0.6rem; border-radius: 4px; }
  
  .action-btn { width: 100%; padding: 1rem; border-radius: 12px; border: none; font-size: 0.9rem; cursor: pointer; margin-bottom: 1rem; }
  .action-btn.primary { background: #0071e3; color: white; }
  .action-btn.secondary { background: rgba(255,255,255,0.1); color: white; }
  
  .close-btn { width: 100%; padding: 0.8rem; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 10px; cursor: pointer; }

  .chat-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 400; }
  .chat-panel { background: #fff; color: #000; border-radius: 20px; width: 540px; height: 700px; display: flex; flex-direction: column; overflow: hidden; }
  .chat-header { padding: 1rem 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
  .message-list { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .message { display: flex; flex-direction: column; }
  .speaker { font-size: 0.7rem; font-weight: bold; color: #666; margin-bottom: 0.2rem; }
  .msg-bubble { background: #f0f0f0; padding: 0.8rem 1rem; border-radius: 12px; max-width: 80%; }

  .editor-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #fff; z-index: 300; display: flex; flex-direction: column; }
  .editor-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
  .editor-header { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; border-bottom: 1px solid #f5f5f7; background: #fff; }
  .back-btn { background: transparent; border: none; color: #0071e3; font-weight: 500; cursor: pointer; }
  .editor-status { font-size: 0.75rem; color: #86868b; font-weight: 600; text-transform: uppercase; }
</style>
