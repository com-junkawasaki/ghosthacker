<script lang="ts">
  import { onMount } from 'svelte';
  import { Canvas } from '@threlte/core';
  import NodeTree from './Sidebar/NodeTree.svelte';
  import ThrelteEngine from './Graph/ThrelteEngine.svelte';
  import AssemblerEngine from './Graph/AssemblerEngine.svelte';
  import { graphStore } from '../../lib/stores/graph.svelte';

  let { 
    projectId = "251121",
    onSelect = () => {},
    selectedId = undefined,
    hideSidebar = false
  } = $props<{
    projectId?: string;
    onSelect?: (node: any, nodes: any[]) => void;
    selectedId?: string;
    hideSidebar?: boolean;
  }>();

  let engineRef: any = $state(null);
  let assemblerRef: any = $state(null);
  let currentTransform = $state({ x: 0, y: 0, k: 1 });
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  let isAssemblerMode = $derived(graphStore.currentViewpointId === 'hub:assembler');

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
      // Filter based on active viewpoint
      if (graphStore.currentViewpointId) {
        const isMeta = n.group === 'meta';
        const isRelated = n.id.startsWith(graphStore.currentViewpointId.split(':')[1]) || n.id === graphStore.currentViewpointId;
        if (!isMeta && !isRelated) return false;
      }

      if (currentTransform.k < 0.3 && n.group !== 'meta') return false;
      const coords = getScreenCoords(n);
      return coords.x > -100 && coords.x < containerWidth + 100 && 
             coords.y > -100 && coords.y < containerHeight + 100;
    })
  );
</script>

<div class="topology-view" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <main class="graph-main">
    <Canvas>
      {#if isAssemblerMode}
        <AssemblerEngine 
          bind:this={assemblerRef}
          onNodeClick={handleNodeClick}
        />
      {:else}
        <ThrelteEngine 
          bind:this={engineRef} 
          bind:currentTransform={currentTransform}
          onNodeClick={handleNodeClick} 
        />
      {/if}
    </Canvas>

    <!-- Labels Overlay (Only in topology mode) -->
    {#if !isAssemblerMode}
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
    {/if}

    <div class="controls">
      <div class="viewpoint-selector">
        <button 
          class:active={!graphStore.currentViewpointId} 
          onclick={() => graphStore.setViewpoint(null)}
        >
          Overview
        </button>
        {#each graphStore.viewpoints as vp}
          <button 
            class:active={graphStore.currentViewpointId === vp.id}
            onclick={() => graphStore.setViewpoint(vp.id)}
            title={vp.description}
          >
            {vp.label}
          </button>
        {/each}
      </div>
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
    background: var(--system-background);
    overflow: hidden;
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
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .viewpoint-selector {
    background: rgba(28, 28, 30, 0.8);
    backdrop-filter: blur(20px);
    padding: 4px;
    border-radius: 10px;
    display: flex;
    gap: 2px;
    border: 1px solid var(--tertiary-label);
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }

  .viewpoint-selector button {
    background: transparent;
    border: none;
    color: var(--secondary-label);
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .viewpoint-selector button:hover {
    color: var(--system-label);
    background: rgba(255, 255, 255, 0.05);
  }

  .viewpoint-selector button.active {
    background: #48484a;
    color: var(--system-label);
  }

  .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
  }
</style>

