<script lang="ts">
  import { onMount } from 'svelte';
  import NavigationSidebar from '../components/NavigationSidebar.svelte';
  import InspectorSidebar from '../components/InspectorSidebar.svelte';
  import Topology from '../components/Topology/TopologyView.svelte';
  import Storyboard from '../components/Storyboard.svelte';
  import Editor from '../components/Editor.svelte';
  import MangaView from '../components/Manga/MangaView.svelte';
  import AssemblerControls from '../components/AssemblerControls.svelte';
  import HistoryPanel from '../components/HistoryPanel.svelte';
  import TranslationViewer from '../components/TranslationViewer.svelte';
  
  import { graphStore } from '../lib/stores/graph.svelte';

  let projectId = $state("251121");
  let selectedNode = $state<any>(null);
  let activeMainView = $state<"topology" | "editor" | "dual">("dual");
  
  // Layout states
  let navWidth = $state(260);
  let inspectorWidth = $state(320);
  let splitRatio = $state(50); // For Dual mode
  let isNavOpen = $state(true);
  let isInspectorOpen = $state(true);
  
  let resizingMode = $state<"nav" | "inspector" | "split" | null>(null);
  
  // Right pane sub-mode
  let editorMode = $state<"storyboard" | "text" | "manga" | "assembler" | "translation">("storyboard");
  
  let isHistoryOpen = $state(false);
  let isChatOpen = $state(false);
  
  let currentFilePath = $state("");
  let currentFileContent = $state("");

  let topologyRef: any = $state(null);
  let storyboardRef: any = $state(null);

  async function handleNodeSelect(node: any) {
    if (!node) {
      selectedNode = null;
      return;
    }
    selectedNode = node;
    const { id, type, viewType } = node;

    console.log("[Page] Selected:", { id, type, viewType });

    // Switch editor mode based on selection
    if (viewType === 'editor' || type === 'gh:Manuscript' || id.startsWith('manuscript:') || group === 'entity' || group === 'content' || type === 'gh:Document') {
      editorMode = "text";
      currentFilePath = node.label || id;
      
      // If it's a character or something with structured data, show its JSON or content
      if (group === 'entity') {
        currentFileContent = node.content || JSON.stringify(node, null, 2);
      } else if (type === 'gh:Manuscript' || id.startsWith('manuscript:')) {
        await graphStore.fetchBlocks(id);
        const manuscript = graphStore.nodes.get(id);
        currentFileContent = manuscript?.children
          ?.map(cid => graphStore.nodes.get(cid)?.content || "")
          .join("\n\n") || node.content || "";
      } else {
        currentFileContent = node.content || "";
      }
    } else if (viewType === 'storyboard' || type === 'gh:Storyboard' || id.startsWith('storyboard:')) {
      editorMode = "storyboard";
    } else if (viewType === 'translation' || id === 'hub:translation') {
      editorMode = "translation";
    } else if (id === 'hub:manga') {
      editorMode = "manga";
    } else if (id === 'hub:assembler') {
      editorMode = "assembler";
    }

    // Auto-switch to dual or editor if something is selected and we are in topology only
    if (activeMainView === 'topology') {
      activeMainView = 'dual';
    }
  }

  async function handleFileSelect(path: string) {
    currentFilePath = path;
    currentFileContent = await graphStore.openFile(path);
    editorMode = "text";
    if (activeMainView === 'topology') activeMainView = 'dual';
  }

  async function handleEditorSave(content: string) {
    if (selectedNode) {
      if (selectedNode.type === 'gh:Manuscript' || selectedNode.id.startsWith('manuscript:')) {
        await graphStore.saveManuscript(selectedNode.id, content);
      } else {
        // General node save
        await graphStore.updateNodeContent(selectedNode.id, content);
      }
    } else if (currentFilePath) {
      await graphStore.saveFile(currentFilePath, content);
    }
  }

  function handleRefreshTopology() {
    graphStore.fetchTopology(projectId);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!resizingMode) return;
    
    if (resizingMode === "nav") {
      navWidth = Math.max(150, Math.min(400, e.clientX));
    } else if (resizingMode === "inspector") {
      inspectorWidth = Math.max(200, Math.min(500, window.innerWidth - e.clientX));
    } else if (resizingMode === "split") {
      const workspaceRect = document.querySelector('.main-content')?.getBoundingClientRect();
      if (workspaceRect) {
        const relativeX = e.clientX - workspaceRect.left;
        splitRatio = Math.max(10, Math.min(90, (relativeX / workspaceRect.width) * 100));
      }
    }
  }

  function stopResizing() {
    resizingMode = null;
  }

  onMount(() => {
    handleRefreshTopology();
  });
</script>

<div class="zen-app" onmousemove={handleMouseMove} onmouseup={stopResizing}>
  <!-- Toolbar -->
  <header class="toolbar">
    <div class="toolbar-left">
      <button class="tool-btn sidebar-toggle" class:active={isNavOpen} onclick={() => isNavOpen = !isNavOpen} title="Toggle Sidebar">
        􀏛
      </button>
      <div class="divider"></div>
      <div class="project-info">
        <span class="project-name">GhostHacker</span>
        <span class="project-id">{projectId}</span>
      </div>
    </div>

    <div class="toolbar-center">
      <div class="segmented-control main-view-switch">
        <button class:active={activeMainView === 'topology'} onclick={() => activeMainView = 'topology'}>
          Topology
        </button>
        <button class:active={activeMainView === 'dual'} onclick={() => activeMainView = 'dual'}>
          Dual
        </button>
        <button class:active={activeMainView === 'editor'} onclick={() => activeMainView = 'editor'}>
          Editor
        </button>
      </div>
    </div>

    <div class="toolbar-right">
      <button class="tool-btn" class:active={isHistoryOpen} onclick={() => isHistoryOpen = !isHistoryOpen} title="History">
        􀐲
      </button>
      <button class="tool-btn" class:active={isChatOpen} onclick={() => isChatOpen = !isChatOpen} title="Ghost AI">
        􀌤
      </button>
      <div class="divider"></div>
      <button class="tool-btn inspector-toggle" class:active={isInspectorOpen} onclick={() => isInspectorOpen = !isInspectorOpen} title="Toggle Inspector">
        􀏝
      </button>
    </div>
  </header>

  <div class="workspace">
    <!-- Navigation Sidebar -->
    {#if isNavOpen}
      <div class="sidebar-wrapper" style="width: {navWidth}px">
        <NavigationSidebar 
          {projectId} 
          onNodeSelect={handleNodeSelect} 
          onFileSelect={handleFileSelect} 
        />
        <div class="resizer" onmousedown={() => resizingMode = "nav"}></div>
      </div>
    {/if}

    <!-- Main Content Area -->
    <main class="main-content">
      <div class="content-wrapper" class:split={activeMainView === 'dual'}>
        {#if activeMainView === 'topology' || activeMainView === 'dual'}
          <section class="canvas-section" style={activeMainView === 'dual' ? `width: ${splitRatio}%` : 'width: 100%'}>
            <Topology 
              bind:this={topologyRef} 
              {projectId}
              hideSidebar={true}
              onSelect={handleNodeSelect}
              selectedId={selectedNode?.id}
            />
          </section>
          {#if activeMainView === 'dual'}
            <div class="resizer split-resizer" onmousedown={() => resizingMode = "split"}></div>
          {/if}
        {/if}

        {#if activeMainView === 'editor' || activeMainView === 'dual'}
          <section class="editor-section" style={activeMainView === 'dual' ? `width: ${100 - splitRatio}%` : 'width: 100%'}>
            <div class="editor-container">
              {#if editorMode === 'storyboard'}
                <Storyboard bind:this={storyboardRef} {projectId} />
              {:else if editorMode === 'text'}
                <Editor 
                  filePath={currentFilePath} 
                  initialContent={currentFileContent}
                  onSave={handleEditorSave}
                />
              {:else if editorMode === 'manga'}
                <MangaView {projectId} />
              {:else if editorMode === 'assembler'}
                <div class="assembler-view">
                  <AssemblerControls />
                  <div class="placeholder">3D Assembler View is integrated in Topology</div>
                </div>
              {:else if editorMode === 'translation'}
                <TranslationViewer 
                  manuscriptId={selectedNode?.id} 
                  {projectId} 
                />
              {/if}
            </div>
          </section>
        {/if}
      </div>
    </main>

    <!-- Inspector Sidebar -->
    {#if isInspectorOpen}
      <div class="sidebar-wrapper right" style="width: {inspectorWidth}px">
        <div class="resizer" onmousedown={() => resizingMode = "inspector"}></div>
        <InspectorSidebar 
          {selectedNode} 
          {projectId} 
          onRefreshTopology={handleRefreshTopology} 
        />
      </div>
    {/if}
  </div>

  <!-- Overlays -->
  {#if isHistoryOpen}
    <div class="drawer history-drawer">
      <div class="drawer-header">
        <h3>Version History</h3>
        <button onclick={() => isHistoryOpen = false}>􀆄</button>
      </div>
      <HistoryPanel onCheckout={() => {}} />
    </div>
  {/if}
</div>

<style>
  .zen-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--system-background);
  }

  .toolbar {
    height: var(--toolbar-height);
    background-color: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--tertiary-label);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 100;
  }

  .toolbar-left { display: flex; align-items: center; gap: 12px; min-width: 200px; }
  .app-icon { font-size: 1.5rem; color: var(--accent-blue); }
  .project-info { display: flex; flex-direction: column; }
  .project-name { font-size: 0.85rem; font-weight: 700; }
  .project-id { font-size: 0.65rem; color: var(--secondary-label); }

  .toolbar-center { flex: 1; display: flex; justify-content: center; }
  
  .segmented-control {
    display: flex;
    background: var(--secondary-background);
    padding: 2px;
    border-radius: 8px;
    border: 1px solid var(--tertiary-label);
  }

  .segmented-control button {
    padding: 4px 16px;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 6px;
    color: var(--secondary-label);
  }

  .segmented-control button.active {
    background: #3a3a3c;
    color: var(--system-label);
    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  .toolbar-right { display: flex; align-items: center; gap: 8px; min-width: 200px; justify-content: flex-end; }
  .tool-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    border-radius: 6px;
    color: var(--secondary-label);
  }
  .tool-btn:hover { background: var(--tertiary-background); color: var(--system-label); }
  .tool-btn.active { color: var(--accent-blue); background: rgba(0, 122, 255, 0.1); }

  .toolbar .divider { width: 1px; height: 20px; background: var(--tertiary-label); margin: 0 4px; }

  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  .sidebar-wrapper {
    display: flex;
    height: 100%;
    position: relative;
    flex-shrink: 0;
  }

  .sidebar-wrapper.right {
    flex-direction: row;
  }

  .resizer {
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    transition: background 0.2s;
    z-index: 10;
  }

  .resizer:hover, .resizer:active {
    background: var(--accent-blue);
  }

  .sidebar-wrapper .resizer {
    position: absolute;
    right: -2px;
    top: 0;
  }

  .sidebar-wrapper.right .resizer {
    left: -2px;
    right: auto;
  }

  .split-resizer {
    position: relative;
    margin: 0 -2px;
    background: var(--tertiary-label);
    opacity: 0.3;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .content-wrapper {
    display: flex;
    height: 100%;
    width: 100%;
  }

  .canvas-section, .editor-section {
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .split .canvas-section {
    border-right: 1px solid var(--tertiary-label);
  }

  .editor-container {
    width: 100%;
    height: 100%;
    background: var(--system-background);
  }

  .assembler-view {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .placeholder {
    color: var(--secondary-label);
    font-size: 0.9rem;
    font-style: italic;
  }

  /* Drawer styles */
  .drawer {
    position: absolute;
    top: var(--toolbar-height);
    right: 0;
    bottom: 0;
    width: 320px;
    background: var(--secondary-background);
    border-left: 1px solid var(--tertiary-label);
    z-index: 90;
    display: flex;
    flex-direction: column;
    box-shadow: -5px 0 20px rgba(0,0,0,0.5);
  }

  .drawer-header {
    padding: 16px;
    border-bottom: 1px solid var(--tertiary-label);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .drawer-header h3 { font-size: 0.9rem; margin: 0; }
</style>
