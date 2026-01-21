<script lang="ts">
  import { graphStore } from '../lib/stores/graph.svelte';
  import FileExplorer from './FileExplorer.svelte';
  import NodeTree from './Topology/Sidebar/NodeTree.svelte';

  let { projectId, onNodeSelect, onFileSelect } = $props<{
    projectId: string;
    onNodeSelect: (node: any) => void;
    onFileSelect: (path: string) => void;
  }>();

  let sidebarMode = $state<'graph' | 'files' | 'storyboard'>('graph');
</script>

<aside class="nav-sidebar">
  <div class="sidebar-header">
    <div class="segmented-control">
      <button class:active={sidebarMode === 'graph'} onclick={() => sidebarMode = 'graph'}>
        Graph
      </button>
      <button class:active={sidebarMode === 'files'} onclick={() => sidebarMode = 'files'}>
        Files
      </button>
      <button class:active={sidebarMode === 'storyboard'} onclick={() => sidebarMode = 'storyboard'}>
        Story
      </button>
    </div>
  </div>

  <div class="sidebar-content">
    {#if sidebarMode === 'graph'}
      <div class="section">
        <div class="section-header">World Topology</div>
        <NodeTree onNodeClick={onNodeSelect} />
      </div>
    {:else if sidebarMode === 'files'}
      <div class="section">
        <div class="section-header">Manuscripts & Assets</div>
        <FileExplorer {projectId} onSelectFile={onFileSelect} />
      </div>
    {:else if sidebarMode === 'storyboard'}
      <div class="section">
        <div class="section-header">Scene Hierarchy</div>
        <!-- This would eventually be a more specialized scene list -->
        <NodeTree onNodeClick={onNodeSelect} />
      </div>
    {/if}
  </div>

  <div class="sidebar-footer">
    <div class="status-indicator">
      <span class="dot" class:online={!graphStore.isLoading}></span>
      <span>{graphStore.isLoading ? 'Syncing...' : 'Connected'}</span>
    </div>
  </div>
</aside>

<style>
  .nav-sidebar {
    width: var(--sidebar-width);
    height: 100%;
    background-color: var(--secondary-background);
    border-right: 1px solid var(--tertiary-label);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 12px;
    border-bottom: 1px solid var(--tertiary-label);
  }

  .segmented-control {
    display: flex;
    background: var(--tertiary-background);
    padding: 2px;
    border-radius: 8px;
  }

  .segmented-control button {
    flex: 1;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 4px 0;
    border-radius: 6px;
    color: var(--secondary-label);
  }

  .segmented-control button.active {
    background: #48484a;
    color: var(--system-label);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
  }

  .section {
    margin-bottom: 16px;
  }

  .section-header {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--secondary-label);
    padding: 16px 12px 8px;
    letter-spacing: 0.05em;
  }

  .sidebar-footer {
    padding: 12px;
    border-top: 1px solid var(--tertiary-label);
    background: rgba(0,0,0,0.1);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.7rem;
    color: var(--secondary-label);
  }

  .dot {
    width: 6px;
    height: 6px;
    background: var(--accent-orange);
    border-radius: 50%;
  }

  .dot.online {
    background: var(--accent-green);
    box-shadow: 0 0 4px var(--accent-green);
  }
</style>
