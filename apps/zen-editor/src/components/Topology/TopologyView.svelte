<script lang="ts">
  import { onMount } from 'svelte';
  import { Canvas } from '@threlte/core';
  import NodeTree from './Sidebar/NodeTree.svelte';
  import ThrelteEngine, { getNodeColor } from './Graph/ThrelteEngine.svelte';
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

  let draggingNodeId = $state<string | null>(null);
  let resizingNodeId = $state<string | null>(null);
  let dragStartPos = { x: 0, y: 0 };
  let nodeStartPos = { x: 0, y: 0 };
  let nodeStartScale = 1;

  function handleCardPointerDown(e: PointerEvent, node: any) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const isResize = target.closest('.resize-handle');
    
    if (isResize) {
      resizingNodeId = node.id;
      nodeStartScale = node.scale || 1;
    } else {
      draggingNodeId = node.id;
      nodeStartPos = { x: node.x || 0, y: node.y || 0 };
      graphStore.updateNodeLayout(node.id, { fixed: true });
    }
    
    dragStartPos = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function handleCardPointerMove(e: PointerEvent) {
    if (draggingNodeId) {
      const dx = (e.clientX - dragStartPos.x) / currentTransform.k;
      const dy = (e.clientY - dragStartPos.y) / currentTransform.k;
      graphStore.updateNodeLayout(draggingNodeId, {
        x: nodeStartPos.x + dx,
        y: nodeStartPos.y + dy
      });
    } else if (resizingNodeId) {
      const delta = (e.clientX - dragStartPos.x + (e.clientY - dragStartPos.y)) / 200;
      const node = graphStore.nodes.get(resizingNodeId);
      if (node) {
        graphStore.updateNodeLayout(resizingNodeId, {
          scale: Math.max(0.5, Math.min(3, nodeStartScale + delta))
        });
      }
    }
  }

  function handleCardPointerUp(e: PointerEvent) {
    draggingNodeId = null;
    resizingNodeId = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function toggleNodeFix(node: any) {
    graphStore.updateNodeLayout(node.id, { fixed: !node.fixed });
  }

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
        // In presentation mode, show all nodes that are part of the presentation layout
        if (graphStore.currentViewpointId === 'hub:presentation') {
          return true;
        }
        const isMeta = n.group === 'meta';
        const isRelated = n.id.startsWith(graphStore.currentViewpointId.split(':')[1]) || n.id === graphStore.currentViewpointId;
        if (!isMeta && !isRelated) return false;
      }

      const coords = getScreenCoords(n);
      return coords.x > -200 && coords.x < containerWidth + 200 && 
             coords.y > -200 && coords.y < containerHeight + 200;
    })
  );
</script>

<div class="topology-view" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <div 
    class="canvas-overlay"
    onpointermove={handleCardPointerMove}
    onpointerup={handleCardPointerUp}
  >
    <div class="node-card-container">
      {#each visibleLabels as n (n.id)}
        {@const coords = getScreenCoords(n)}
        {#if n.group !== 'meta' && currentTransform.k > 0.5}
          <div 
            class="node-card"
            class:fixed={n.fixed}
            style="left: {coords.x}px; top: {coords.y}px; transform: translate(-50%, -50%) scale({(n.scale || 1) * currentTransform.k}); --accent: {getNodeColor(n.group)}"
            onpointerdown={(e) => handleCardPointerDown(e, n)}
          >
            <div class="card-controls">
              <button class="card-btn" onclick={() => toggleNodeFix(n)}>
                {n.fixed ? '📌' : '📍'}
              </button>
            </div>
            
            {#if n.imagePath}
              <div class="card-image">
                <img src={n.imagePath.replace('/static/', '/')} alt={n.label} />
              </div>
            {/if}
            
            <div class="card-info">
              <div class="group">{n.group}</div>
              <div class="name">{n.label}</div>
              {#if n.content}
                <p class="desc">{n.content}</p>
              {/if}
            </div>
            
            <div class="resize-handle"></div>
          </div>
        {:else}
          <div 
            class="label-tag {n.group}"
            style="left: {coords.x}px; top: {coords.y + 12}px; font-size: {Math.max(8, 12 * currentTransform.k)}px;"
          >
            {n.label}
          </div>
        {/if}
      {/each}
    </div>
  </div>

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
        <!-- Labels are now handled in the interactive canvas-overlay for better performance and interaction -->
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
    background: #fff;
    overflow: hidden;
    position: relative;
  }

  .canvas-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }

  .node-card-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
  }

  .node-card {
    position: absolute;
    background: #fff;
    padding: 12px;
    border: 1px solid #ddd;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    pointer-events: auto;
    user-select: none;
    transform-origin: center center;
    border-radius: 8px;
    min-width: 180px;
    max-width: 240px;
    transition: transform 0.1s ease-out, box-shadow 0.2s ease;
  }

  .node-card.fixed {
    border-color: var(--accent);
    border-width: 3px;
    box-shadow: 0 0 0 4px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.1);
  }

  .node-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    z-index: 100;
  }

  .card-image {
    width: 100%;
    height: 120px;
    background: #f5f5f7;
    margin-bottom: 8px;
    border-radius: 4px;
    overflow: hidden;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-info .name {
    font-weight: 700;
    font-size: 0.9rem;
    margin-bottom: 2px;
  }

  .card-info .group {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }

  .card-info .desc {
    font-size: 0.75rem;
    color: #666;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-controls {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .node-card:hover .card-controls {
    opacity: 1;
  }

  .card-btn {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: rgba(255,255,255,0.9);
    border: 1px solid #ddd;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #666;
  }

  .card-btn:hover {
    background: #fff;
    color: #000;
    border-color: #999;
  }

  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, #ccc 50%);
    border-radius: 0 0 8px 0;
    opacity: 0;
  }

  .node-card:hover .resize-handle {
    opacity: 1;
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
    background: rgba(255, 255, 255, 0.8);
    padding: 2px 6px;
    border-radius: 4px;
    color: #000;
    white-space: nowrap;
    border: 1px solid rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(4px);
  }

  .label-tag.content { border-color: #0071e3; color: #0071e3; }
  .label-tag.entity { border-color: #ff3b30; color: #ff3b30; }
  .label-tag.environment { border-color: #34c759; color: #34c759; }
  .label-tag.item { border-color: #ff9500; color: #ff9500; }
  .label-tag.emotion { border-color: #ff2d55; color: #ff2d55; }
  .label-tag.meta { border-color: #af52de; color: #af52de; font-weight: bold; }
  .label-tag.episode { border-color: #5856d6; color: #5856d6; }
  .label-tag.page { border-color: #00c7be; color: #00c7be; }
  .label-tag.panel { border-color: #30b0c7; color: #30b0c7; }

  .controls {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .viewpoint-selector {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    padding: 4px;
    border-radius: 10px;
    display: flex;
    gap: 2px;
    border: 1px solid var(--tertiary-label);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
    background: rgba(0, 0, 0, 0.05);
  }

  .viewpoint-selector button.active {
    background: #e5e5ea;
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

