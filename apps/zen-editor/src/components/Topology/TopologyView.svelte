<script lang="ts">
  import { onMount } from 'svelte';
  import NodeTree from './Sidebar/NodeTree.svelte';
  import WebGPUEngine from './Graph/WebGPUEngine.svelte';
  import { graphStore } from '../../lib/stores/graph.svelte';

  let { 
    projectId = "251022",
    onSelect = () => {},
    selectedId = undefined
  } = $props<{
    projectId?: string;
    onSelect?: (node: any, nodes: any[]) => void;
    selectedId?: string;
  }>();

  let engineRef: any = $state(null);
  let currentTransform = $state({ x: 0, y: 0, k: 1 });
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  onMount(() => {
    graphStore.fetchTopology(projectId);
  });

  // Handle external selection
  $effect(() => {
    if (selectedId && selectedId !== graphStore.selectedNodeId) {
      graphStore.selectNode(selectedId);
    }
  });

  function handleNodeClick(node: any) {
    onSelect(node, [node]);
  }

  function getScreenCoords(node: any) {
    const k = currentTransform.k;
    const tx = currentTransform.x;
    const ty = currentTransform.y;
    const x = (node.x || 0) * k + tx + containerWidth / 2;
    const y = (node.y || 0) * k + ty + containerHeight / 2;
    return { x, y };
  }

  let visibleLabels = $derived(
    Array.from(graphStore.nodes.values()).filter(n => {
      if (currentTransform.k < 0.3 && n.group !== 'meta') return false;
      const coords = getScreenCoords(n);
      return coords.x > -100 && coords.x < containerWidth + 100 && 
             coords.y > -100 && coords.y < containerHeight + 100;
    })
  );
</script>

<div class="topology-view" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span>Nodes ({graphStore.nodes.size})</span>
      <button onclick={() => graphStore.fetchTopology(projectId)}>🔄</button>
    </div>
    <NodeTree onNodeClick={handleNodeClick} />
  </aside>

  <main class="graph-main">
    <WebGPUEngine 
      bind:this={engineRef} 
      bind:currentTransform={currentTransform}
      onNodeClick={handleNodeClick} 
    />

    <!-- Labels Overlay -->
    <div class="labels-overlay">
      {#each visibleLabels as n (n.id)}
        {@const coords = getScreenCoords(n)}
        <div 
          class="label-tag {n.group}"
          style="left: {coords.x}px; top: {coords.y + 12}px; font-size: {Math.max(8, 12 * currentTransform.k)}px;"
        >
          {n.label}
        </div>
      {/each}
    </div>

    <div class="controls">
      <button onclick={() => engineRef?.fitView()}>🔍</button>
    </div>

    {#if graphStore.isLoading}
      <div class="loader">Syncing world...</div>
    {/if}
  </main>
</div>

<style>
  .topology-view {
    display: flex;
    width: 100%;
    height: 100%;
    background: #05050a;
    overflow: hidden;
  }

  .sidebar {
    width: 240px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  .sidebar-header {
    padding: 0.8rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #666;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .graph-main {
    flex: 1;
    position: relative;
  }

  .labels-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
  }

  .label-tag {
    position: absolute;
    transform: translate(-50%, 0);
    background: rgba(0, 0, 0, 0.6);
    padding: 2px 6px;
    border-radius: 4px;
    color: #fff;
    white-space: nowrap;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .label-tag.content { border-color: #0071e3; color: #0071e3; }
  .label-tag.entity { border-color: #ff3b30; color: #ff3b30; }
  .label-tag.environment { border-color: #34c759; color: #34c759; }
  .label-tag.item { border-color: #ff9500; color: #ff9500; }
  .label-tag.emotion { border-color: #ff2d55; color: #ff2d55; }
  .label-tag.meta { border-color: #af52de; color: #af52de; font-weight: bold; }

  .controls {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
  }

  .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
  }
</style>

