<script lang="ts">
  import { getClient } from '../lib/api';
  import { onMount, onDestroy } from 'svelte';
  import { Graph } from '@cosmos.gl/graph';

  let { onSelect = () => {}, selectedId = undefined } = $props<{
    onSelect?: (node: any, nodes: any[]) => void;
    selectedId?: string;
  }>();

  let containerElement = $state<HTMLDivElement | null>(null);
  let graph = $state<Graph | null>(null);
  let isLoading = $state(true);
  let nodes = $state<any[]>([]);
  let edges = $state<any[]>([]);
  let hoveredNode = $state<any>(null);
  let mousePos = $state({ x: 0, y: 0 });

  let minimapViewport = $state({ top: 0, left: 0, width: 100, height: 100 });

  onMount(() => {
    console.log("Topology component onMount starting (using @cosmos.gl/graph)");
    if (containerElement) {
      try {
        console.log("Initializing Graph with container:", containerElement);
        const g = new Graph(containerElement, {
          backgroundColor: '#05050a',
          pointDefaultSize: 6,
          linkDefaultWidth: 1.5,
          linkDefaultColor: '#33333a',
          pointColor: '#0071e3',
          simulationGravity: 0.05,
          simulationRepulsion: 1.0,
          simulationFriction: 0.9,
        });

        // Setup interactions
        // @ts-ignore
        g.onClick = (index: number) => {
          if (index !== undefined && nodes[index]) {
            handleNodeClick(nodes[index]);
          }
        };

        // @ts-ignore
        g.onPointerOver = (index: number) => {
          if (index !== undefined && nodes[index]) {
            hoveredNode = nodes[index];
            if (containerElement) containerElement.style.cursor = 'pointer';
          }
        };

        // @ts-ignore
        g.onPointerOut = () => {
          hoveredNode = null;
          if (containerElement) containerElement.style.cursor = 'default';
        };

        // Sync minimap
        // @ts-ignore
        if (g.zoomInstance) {
          // @ts-ignore
          g.zoomInstance.on('zoom', (event) => {
            const transform = event.transform;
            const scale = Math.min(1, 1 / transform.k);
            minimapViewport = {
              left: ((-transform.x / transform.k) / 2000 + 0.5) * 100,
              top: ((-transform.y / transform.k) / 2000 + 0.5) * 100,
              width: scale * 50,
              height: scale * 50
            };
          });
        }

        graph = g;
        fetchData();
      } catch (err) {
        console.error("Graph initialization failed:", err);
      }
    }
  });

  function handleMouseMove(e: MouseEvent) {
    mousePos = { x: e.clientX, y: e.clientY };
  }

  async function fetchData() {
    isLoading = true;
    try {
      const client = await getClient();
      if (!client) return;
      console.log("Fetching topology data...");
      const resp = await client.getTopology({ projectId: "251022" });
      console.log("Topology data received:", resp);
      nodes = (resp.nodes || []).filter((n: any) => n && n.id && n.label);
      edges = resp.edges || [];

      if (graph) {
        const pointPositions = new Float32Array(nodes.length * 2);
        const pointColors = new Float32Array(nodes.length * 4);
        
        nodes.forEach((n, i) => {
          pointPositions[i * 2] = n.x || (Math.random() * 1000 - 500);
          pointPositions[i * 2 + 1] = n.y || (Math.random() * 1000 - 500);
          
          let color = [142, 142, 147, 255]; // Default gray
          if (n.group === 'content') color = [0, 113, 227, 255]; // blue
          if (n.group === 'entity') color = [255, 59, 48, 255]; // red
          if (n.type === 'gh:Episode') color = [255, 214, 10, 255]; // yellow
          if (n.type === 'gh:ClusterHub') color = [175, 82, 222, 255]; // purple
          
          pointColors[i * 4] = color[0];
          pointColors[i * 4 + 1] = color[1];
          pointColors[i * 4 + 2] = color[2];
          pointColors[i * 4 + 3] = color[3] / 255;
        });

        const links = new Float32Array(edges.length * 2);
        const linkColors = new Float32Array(edges.length * 4);
        const linkWidths = new Float32Array(edges.length);
        const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
        
        edges.forEach((e, i) => {
          const fromIdx = idToIndex.get(e.fromId) || 0;
          const toIdx = idToIndex.get(e.toId) || 0;
          links[i * 2] = fromIdx;
          links[i * 2 + 1] = toIdx;

          const color = hexToRgba(e.color || '#33333a', 0.4);
          linkColors[i * 4] = color[0];
          linkColors[i * 4 + 1] = color[1];
          linkColors[i * 4 + 2] = color[2];
          linkColors[i * 4 + 3] = color[3];

          linkWidths[i] = e.relation === 'gh:precedes' ? 2.0 : 1.0;
        });

        console.log("Setting Graph data with enhanced links...");
        graph.setPointPositions(pointPositions);
        graph.setPointColors(pointColors);
        graph.setLinks(links);
        
        // @ts-ignore
        if (graph.setLinkColors) graph.setLinkColors(linkColors);
        // @ts-ignore
        if (graph.setLinkWidths) graph.setLinkWidths(linkWidths);

        graph.render();
        graph.fitView(1000);
      }
    } catch (err) {
      console.error("Topology fetch failed:", err);
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (graph && selectedId) {
      const index = nodes.findIndex(n => n.id === selectedId);
      if (index !== -1) {
          graph.zoomToPointByIndex(index, 1000);
      }
    }
  });

  onDestroy(() => {
    if (graph) {
      graph.destroy();
    }
  });

  function handleNodeClick(node: any) {
    onSelect?.(node, [node]);
    
    // Zoom to clicked node
    if (graph) {
      const index = nodes.findIndex(n => n.id === node.id);
      if (index !== -1) {
        graph.zoomToPointByIndex(index, 1000);
      }
    }
  }

  function hexToRgba(hex: string, alpha: number = 0.5) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, alpha];
  }

  export function setPositions(positions: any[]) {
    if (!graph) return;
    const posMap = new Map(positions.map(p => [p.id, p]));
    const pointPositions = new Float32Array(nodes.length * 2);
    
    nodes.forEach((n, i) => {
      const p = posMap.get(n.id);
      pointPositions[i * 2] = p ? p.x : (n.x || 0);
      pointPositions[i * 2 + 1] = p ? p.y : (n.y || 0);
    });
    
    graph.setPointPositions(pointPositions);
    graph.render();
  }

  async function saveLayout() {
    if (!graph) return;
    try {
      const client = await getClient();
      if (!client || !graph) return;
      
      const allPositions = graph.getPointPositions();
      const positions = nodes.map((n, i) => {
        return { 
          id: n.id, 
          x: allPositions[i * 2], 
          y: allPositions[i * 2 + 1] 
        };
      });

      await client.commitHistory({
        projectId: "251022",
        type: "graph",
        stateJson: JSON.stringify(positions),
        message: "Manual layout commit",
        branchName: "main"
      });
      alert("Layout committed to history!");
    } catch (err) {
      console.error("Failed to commit layout:", err);
    }
  }

  function handleZoomIn() {
    if (!graph) return;
    // @ts-ignore
    graph.zoomInstance.scaleBy(graph.canvasD3Selection.transition().duration(300), 1.5);
  }

  function handleZoomOut() {
    if (!graph) return;
    // @ts-ignore
    graph.zoomInstance.scaleBy(graph.canvasD3Selection.transition().duration(300), 0.75);
  }

  function handleResetZoom() {
    if (!graph) return;
    graph.fitView(500);
  }

  function handleDragStart(e: DragEvent, node: any) {
    e.dataTransfer?.setData('application/json', JSON.stringify(node));
    e.dataTransfer!.effectAllowed = 'copy';
  }
</script>

<div class="topology-container">
  <div class="topology-sidebar">
    <div class="sidebar-header">
      <span>Nodes</span>
      <div class="header-actions">
        <button class="icon-btn" onclick={() => graph?.fitView(1000)} title="Fit View">🔍</button>
        <button class="save-layout-btn" onclick={saveLayout} title="Save Layout to History">💾</button>
      </div>
    </div>
    <div class="node-list">
      {#each nodes as n (n.id)}
        <div 
          role="button"
          tabindex="0"
          class="node-item" 
          draggable={true}
          ondragstart={(e) => handleDragStart(e, n)}
          onclick={() => handleNodeClick(n)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNodeClick(n)}
        >
          <span class="node-icon {n.group || 'default'}"></span>
          <span class="node-label">{n.label}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="topology-main" role="presentation" onmousemove={handleMouseMove}>
    <div 
      bind:this={containerElement} 
      style="width: 100%; height: 100%;"
      role="application"
      aria-label="Graph Visualization"
    ></div>

    <div class="graph-controls">
      <button class="control-btn" onclick={handleZoomIn} title="Zoom In">+</button>
      <button class="control-btn" onclick={handleZoomOut} title="Zoom Out">−</button>
      <button class="control-btn" onclick={handleResetZoom} title="Reset View">⟲</button>
    </div>

    <div class="minimap-container">
      <div class="minimap-header">Minimap</div>
      <div class="minimap-view" role="region" aria-label="Minimap View">
        <!-- Nodes representation in minimap -->
        {#each nodes as n}
          <div role="presentation" class="minimap-node {n.group || 'default'}" style="left: {((n.x || 0) / 2000 + 0.5) * 100}%; top: {((n.y || 0) / 2000 + 0.5) * 100}%;"></div>
        {/each}
        <div class="minimap-viewport" style="left: {minimapViewport.left}%; top: {minimapViewport.top}%; width: {minimapViewport.width}%; height: {minimapViewport.height}%;"></div>
      </div>
    </div>
    
    {#if hoveredNode}
      <div role="tooltip" class="node-tooltip" style="left: {mousePos.x + 15}px; top: {mousePos.y + 15}px;">
        <div class="tooltip-header">
          <span class="node-icon {hoveredNode.group || 'default'}"></span>
          <strong>{hoveredNode.label}</strong>
        </div>
        <div class="tooltip-type">{hoveredNode.type}</div>
        
        {#if hoveredNode.content}
          <div class="tooltip-content">{hoveredNode.content}</div>
        {/if}

        <div class="tooltip-footer">
          <span class="relation-count">
            Connections: {edges.filter(e => e.fromId === hoveredNode.id || e.toId === hoveredNode.id).length}
          </span>
          <span class="node-id">ID: {hoveredNode.id.split(':').pop()}</span>
        </div>
      </div>
    {/if}
    
    {#if isLoading}
      <div class="loader">Syncing story world...</div>
    {/if}

    <div class="test-nodes">
        {#each nodes as n (n.id)}
            <button 
              class="test-node-btn" 
              draggable={true}
              ondragstart={(e) => handleDragStart(e, n)}
              data-node-name={n.label} 
              onclick={() => handleNodeClick(n)}
            >
              {n.label}
            </button>
        {/each}
    </div>
  </div>
</div>

<style>
  .topology-container { 
    width: 100%; 
    height: 100%; 
    display: flex;
    background: #05050a; 
  }

  .topology-sidebar {
    width: 180px;
    background: #000;
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    letter-spacing: 0.1em;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .icon-btn, .save-layout-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    opacity: 0.5;
    transition: opacity 0.2s;
    padding: 2px;
  }

  .icon-btn:hover, .save-layout-btn:hover { opacity: 1; }

  .node-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.2rem;
  }

  .node-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: grab;
    transition: all 0.2s;
    font-size: 0.75rem;
    color: #999;
  }

  .node-item:hover {
    background: rgba(0, 113, 227, 0.1);
    color: #fff;
  }

  .node-icon {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .node-icon.content { background: #0071e3; }
  .node-icon.entity { background: #ff3b30; }
  .node-icon.meta { background: #af52de; }
  .node-icon.default { background: #8e8e93; }

  .topology-main {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .graph-controls {
    position: absolute;
    bottom: 2rem;
    left: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 100;
  }

  .graph-controls .control-btn {
    width: 36px;
    height: 36px;
    background: rgba(20, 20, 25, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    backdrop-filter: blur(5px);
  }

  .graph-controls .control-btn:hover {
    background: #0071e3;
    border-color: #0071e3;
  }

  .minimap-container {
    position: absolute;
    bottom: 2rem;
    right: 2rem;
    width: 180px;
    height: 120px;
    background: rgba(10, 10, 15, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    z-index: 100;
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
  }

  .minimap-header {
    padding: 0.4rem 0.8rem;
    font-size: 0.6rem;
    text-transform: uppercase;
    color: #666;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    letter-spacing: 0.1em;
  }

  .minimap-view {
    flex: 1;
    position: relative;
    background: #05050a;
  }

  .minimap-node {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .minimap-node.content { background: #0071e3; }
  .minimap-node.entity { background: #ff3b30; }
  .minimap-node.default { background: #8e8e93; }

  .minimap-viewport {
    position: absolute;
    border: 1px solid rgba(0, 113, 227, 0.5);
    background: rgba(0, 113, 227, 0.1);
    pointer-events: none;
  }
  
  .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; }
  
  .node-tooltip {
    position: fixed;
    z-index: 1000;
    background: rgba(10, 10, 15, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.8rem;
    pointer-events: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    max-width: 300px;
    backdrop-filter: blur(10px);
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .tooltip-type {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 0.4rem;
    letter-spacing: 0.05em;
  }

  .tooltip-content {
    font-size: 0.8rem;
    color: #ccc;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 0.6rem;
  }

  .tooltip-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 0.4rem;
    font-size: 0.6rem;
    color: #555;
  }

  .relation-count { color: #0071e3; font-weight: 600; }

  .test-nodes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.01; }
  .test-node-btn { pointer-events: auto; cursor: grab; }
</style>
