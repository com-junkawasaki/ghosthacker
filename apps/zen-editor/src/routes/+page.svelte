<script lang="ts">
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/TopologyWebGPU.svelte';
  import Storyboard from '../components/Storyboard.svelte';
  import HistoryPanel from '../components/HistoryPanel.svelte';
  import { getClient } from '../lib/api';

  let selectedNode = $state<any>(null);
  let rightPaneMode = $state<"storyboard" | "editor">("storyboard");
  let projectId = $state("251022"); // Default project
  let isSidebarOpen = $state(false);
  let isChatOpen = $state(false);
  let isHistoryOpen = $state(false);
  let currentFilePath = $state("");
  let currentFileContent = $state("");
  let projectTitle = $state("GhostHacker Zen Editor");
  let activeView = $state<"graph" | "storyboard" | "dual">("dual");
  let leftPaneWidth = $state(40); // Initial width for graph
  let isGraphCollapsed = $state(false);
  let isStoryboardCollapsed = $state(false);

  let storyboardRef: any = $state(null);
  let topologyRef: any = $state(null);

  function handleCheckout(state: any, type: string) {
    if (type === 'storyboard') {
      storyboardRef?.setScenes(state);
    } else if (type === 'graph') {
      topologyRef?.setPositions(state);
    }
  }

  function handleNodeSelect(node: any) {
    selectedNode = node;
    const type = node.type || "";
    
    if (type === 'gh:Manuscript' || type === 'gh:Block' || node.id?.startsWith('manuscript:') || node.id?.startsWith('block:')) {
      rightPaneMode = "editor";
      currentFilePath = node.label || node.id || "Untitled.md";
      currentFileContent = node.content || "";
    } else {
      rightPaneMode = "storyboard";
    }
    
    if (isStoryboardCollapsed) {
      isStoryboardCollapsed = false;
    }
  }

  async function handleEditorSave(content: string) {
    try {
      const client = await getClient();
      if (!client || !selectedNode) return;

      await client.commitHistory({
        projectId: "251022",
        type: "node_edit",
        stateJson: JSON.stringify({
          nodeId: selectedNode.id,
          content: content
        }),
        message: `Edit node: ${selectedNode.label}`,
        branchName: "main"
      });
      
      // Update local node state if needed
      selectedNode.content = content;
      alert("Changes saved to history!");
    } catch (err) {
      console.error("Failed to save editor content:", err);
    }
  }

  function toggleSidebar() { isSidebarOpen = !isSidebarOpen; }
  function toggleChat() { isChatOpen = !isChatOpen; }
  function setView(view: "graph" | "storyboard" | "dual") { activeView = view; }

  let isResizing = $state(false);
  function startResize() { isResizing = true; }
  function stopResize() { isResizing = false; }
  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    const width = (e.clientX / window.innerWidth) * 100;
    if (width > 20 && width < 80) {
      leftPaneWidth = width;
    }
  }
</script>

<div class="app-container" role="presentation" onmousemove={handleMouseMove} onmouseup={stopResize}>
  <header class="top-bar">
    <div class="left-section">
      <button class="menu-btn" onclick={toggleSidebar}>☰</button>
      <h1>{projectTitle}</h1>
    </div>
    
    <div class="center-section">
      <div class="view-switcher">
        <button class:active={activeView === "graph"} onclick={() => setView("graph")}>Graph</button>
        <button class:active={activeView === "dual"} onclick={() => setView("dual")}>Dual</button>
        <button class:active={activeView === "storyboard"} onclick={() => setView("storyboard")}>Storyboard</button>
      </div>
    </div>

    <div class="right-section">
      <button class="icon-btn" onclick={() => isHistoryOpen = !isHistoryOpen} class:active={isHistoryOpen}>📜</button>
      <button class="icon-btn" onclick={toggleChat}>💬</button>
      <button class="icon-btn">⚙️</button>
    </div>
  </header>

  <main class="main-layout">
    <div class="main-content" class:dim={isChatOpen} class:dual-view={activeView === "dual"}>
      {#if (activeView === "graph" || activeView === "dual") && !isGraphCollapsed}
        <div class="pane graph-pane" style={activeView === "dual" ? `width: ${leftPaneWidth}%` : "width: 100%"}>
          <div class="pane-header">
            <span>Graph Explorer</span>
            {#if activeView === "dual"}
              <button class="collapse-btn" onclick={() => isGraphCollapsed = true}>◀</button>
            {/if}
          </div>
          <Topology 
            bind:this={topologyRef} 
            {projectId}
            onSelect={handleNodeSelect} 
            selectedId={selectedNode?.id} 
          />
        </div>
      {:else if activeView === "dual" && isGraphCollapsed}
        <div 
          role="button"
          tabindex="0"
          class="collapsed-pane" 
          onclick={() => isGraphCollapsed = false}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (isGraphCollapsed = false)}
        >
          <span>Graph</span>
        </div>
      {/if}

      {#if activeView === "dual"}
        <div 
          role="separator" 
          tabindex="0"
          aria-orientation="vertical"
          aria-valuenow={leftPaneWidth}
          aria-valuemin={10}
          aria-valuemax={90}
          class="resize-handle" 
          onmousedown={startResize}
          onkeydown={(e) => {
            if (e.key === 'ArrowLeft') leftPaneWidth = Math.max(10, leftPaneWidth - 1);
            if (e.key === 'ArrowRight') leftPaneWidth = Math.min(90, leftPaneWidth + 1);
          }}
        ></div>
      {/if}

      {#if (activeView === "storyboard" || activeView === "dual") && !isStoryboardCollapsed}
        <div class="pane right-pane" style={activeView === "dual" ? `width: ${activeView === "dual" && isGraphCollapsed ? 100 : 100 - leftPaneWidth}%` : "width: 100%"}>
          <div class="pane-header">
            {#if activeView === "dual"}
              <button class="collapse-btn" onclick={() => isStoryboardCollapsed = true}>▶</button>
            {/if}
            <span>{rightPaneMode === 'storyboard' ? 'Storyboard Editor' : 'Text Editor'}</span>
          </div>
          
          {#if rightPaneMode === 'editor'}
            <div class="pane-content">
              <Editor 
                filePath={currentFilePath} 
                initialContent={currentFileContent}
                onSave={handleEditorSave}
              />
            </div>
          {:else}
            <Storyboard bind:this={storyboardRef} {projectId} />
          {/if}
        </div>
      {:else if activeView === "dual" && isStoryboardCollapsed}
        <div 
          role="button"
          tabindex="0"
          class="collapsed-pane right" 
          onclick={() => isStoryboardCollapsed = false}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (isStoryboardCollapsed = false)}
        >
          <span>{rightPaneMode === 'storyboard' ? 'Storyboard' : 'Editor'}</span>
        </div>
      {/if}
    </div>

    {#if isHistoryOpen}
      <aside class="history-drawer">
        <HistoryPanel onCheckout={handleCheckout} />
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

  .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 0 1rem; height: 60px; background: #000; border-bottom: 1px solid rgba(255, 255, 255, 0.1); z-index: 100; }

  .left-section { display: flex; align-items: center; gap: 1rem; min-width: 250px; }
  .right-section { display: flex; align-items: center; gap: 1rem; min-width: 100px; justify-content: flex-end; }
  h1 { font-size: 1rem; font-weight: 600; margin: 0; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .center-section { flex: 1; display: flex; justify-content: center; }
  .view-switcher { display: flex; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 2px; border: 1px solid rgba(255, 255, 255, 0.1); }
  .view-switcher button { background: transparent; border: none; color: #888; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
  .view-switcher button.active { background: rgba(255, 255, 255, 0.1); color: white; }

  .main-layout { flex: 1; position: relative; overflow: hidden; }
  .main-content { width: 100%; height: 100%; transition: filter 0.3s; display: flex; }
  .main-content.dim { filter: blur(10px) brightness(0.5); }

  .pane { height: 100%; overflow: hidden; position: relative; display: flex; flex-direction: column; }
  .pane-content { flex: 1; overflow: hidden; position: relative; }
  .pane-header {
    height: 30px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.8rem;
    font-size: 0.7rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .collapse-btn {
    background: transparent;
    border: none;
    color: #444;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 2px 6px;
    transition: color 0.2s;
  }
  .collapse-btn:hover { color: #0071e3; }

  .collapsed-pane {
    width: 30px;
    height: 100%;
    background: rgba(20, 20, 25, 0.9);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
  .collapsed-pane span {
    transform: rotate(-90deg);
    white-space: nowrap;
    font-size: 0.7rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .collapsed-pane.right { border-right: none; border-left: 1px solid rgba(255, 255, 255, 0.1); }

  .resize-handle {
    width: 6px;
    height: 100%;
    cursor: col-resize;
    background: rgba(255, 255, 255, 0.1);
    transition: background 0.2s;
    z-index: 50;
  }
  .resize-handle:hover { background: #0071e3; }

  .editor-drawer { position: absolute; right: 0; top: 0; width: 60%; height: 100%; background: #111; border-left: 1px solid #333; display: flex; flex-direction: column; z-index: 200; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
  .history-drawer { position: absolute; right: 0; top: 0; width: 300px; height: 100%; background: #111; border-left: 1px solid #333; display: flex; flex-direction: column; z-index: 205; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
  .chat-sidebar { position: absolute; right: 0; top: 0; width: 350px; height: 100%; background: #16161a; border-left: 1px solid #333; display: flex; flex-direction: column; z-index: 201; }

  .drawer-header, .sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #333; font-size: 0.9rem; font-weight: 500; }
  .drawer-body, .chat-container { flex: 1; overflow: hidden; }

  button { background: transparent; border: none; color: white; cursor: pointer; font-size: 1.2rem; }
  .icon-btn { font-size: 1.2rem; opacity: 0.6; transition: all 0.2s; }
  .icon-btn:hover { opacity: 1; transform: scale(1.1); }
  .icon-btn.active { opacity: 1; color: #0071e3; }
  .menu-btn { font-size: 1.4rem; color: #0071e3; }
  
  .chat-placeholder { padding: 2rem; color: #666; text-align: center; font-style: italic; }
</style>
