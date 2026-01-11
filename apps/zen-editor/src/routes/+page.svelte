<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/TopologyWebGPU.svelte';
  import Storyboard from '../components/Storyboard.svelte';
  import { getClient } from '../lib/api';

  let selectedNode = $state<any>(null);
  let isSidebarOpen = $state(false);
  let isChatOpen = $state(false);
  let isEditorOpen = $state(false);
  let currentFilePath = $state("");
  let projectTitle = $state("GhostHacker Zen Editor");
  let activeView = $state<"graph" | "storyboard">("graph");

  onMount(async () => {
    try {
      const client = await getClient();
      if (client) {
        const resp = await client.getProjectMetadata({ projectId: "251022" });
        projectTitle = resp?.title || "GhostHacker Zen Editor";
      }
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    }
  });

  function handleNodeSelect(node: any) {
    selectedNode = node;
    isEditorOpen = true;
    currentFilePath = node.path || "";
  }

  function toggleSidebar() { isSidebarOpen = !isSidebarOpen; }
  function toggleChat() { isChatOpen = !isChatOpen; }
  function setView(view: "graph" | "storyboard") { activeView = view; }
</script>

<div class="app-container">
  <header class="top-bar">
    <div class="left-section">
      <button class="menu-btn" onclick={toggleSidebar}>☰</button>
      <h1>{projectTitle}</h1>
    </div>
    
    <div class="center-section">
      <div class="view-switcher">
        <button class:active={activeView === "graph"} onclick={() => setView("graph")}>Graph View</button>
        <button class:active={activeView === "storyboard"} onclick={() => setView("storyboard")}>Storyboard View</button>
      </div>
    </div>

    <div class="right-section">
      <button class="icon-btn" onclick={toggleChat}>💬</button>
      <button class="icon-btn">⚙️</button>
    </div>
  </header>

  <main class="main-layout">
    <div class="main-content" class:dim={isChatOpen || isEditorOpen}>
      {#if activeView === "graph"}
        <Topology onSelect={handleNodeSelect} selectedId={selectedNode?.id} />
      {:else}
        <Storyboard />
      {/if}
    </div>

    {#if isEditorOpen}
      <aside class="editor-drawer">
        <div class="drawer-header">
          <span>{currentFilePath || 'Editor'}</span>
          <button onclick={() => isEditorOpen = false}>×</button>
        </div>
        <div class="drawer-body">
          <Editor filePath={currentFilePath} />
        </div>
      </aside>
    {/if}

    {#if isChatOpen}
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <span>Ghost AI Assistant</span>
          <button onclick={toggleChat}>×</button>
        </div>
        <div class="chat-container">
          <!-- Chat component would go here -->
          <div class="chat-placeholder">How can I help you with the story?</div>
        </div>
      </aside>
    {/if}
  </main>
</div>

<style>
  :global(body) { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow: hidden; background: #05050a; }
  
  .app-container { display: flex; flex-direction: column; height: 100vh; color: white; }

  .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 0 1rem; height: 50px; background: rgba(20, 20, 25, 0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.1); z-index: 100; }

  .left-section, .right-section { display: flex; align-items: center; gap: 1rem; }
  h1 { font-size: 1.1rem; font-weight: 500; margin: 0; letter-spacing: -0.02em; }

  .view-switcher { display: flex; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 2px; }
  .view-switcher button { background: transparent; border: none; color: #888; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
  .view-switcher button.active { background: rgba(255, 255, 255, 0.1); color: white; }

  .main-layout { flex: 1; position: relative; overflow: hidden; }
  .main-content { width: 100%; height: 100%; transition: filter 0.3s; }
  .main-content.dim { filter: blur(10px) brightness(0.5); }

  .editor-drawer { position: absolute; right: 0; top: 0; width: 60%; height: 100%; background: #111; border-left: 1px solid #333; display: flex; flex-direction: column; z-index: 200; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
  .chat-sidebar { position: absolute; right: 0; top: 0; width: 350px; height: 100%; background: #16161a; border-left: 1px solid #333; display: flex; flex-direction: column; z-index: 201; }

  .drawer-header, .sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #333; font-size: 0.9rem; font-weight: 500; }
  .drawer-body, .chat-container { flex: 1; overflow: hidden; }

  button { background: transparent; border: none; color: white; cursor: pointer; font-size: 1.2rem; }
  .menu-btn { font-size: 1.4rem; color: #0071e3; }
  
  .chat-placeholder { padding: 2rem; color: #666; text-align: center; font-style: italic; }
</style>
