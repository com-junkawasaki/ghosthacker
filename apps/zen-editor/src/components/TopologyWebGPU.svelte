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

  onMount(() => {
    console.log("Topology component onMount starting (using @cosmos.gl/graph)");
    if (containerElement) {
      try {
        console.log("Initializing Graph with container:", containerElement);
        const g = new Graph(containerElement, {
          backgroundColor: '#05050a',
          pointDefaultSize: 4,
          linkDefaultWidth: 1,
          linkDefaultColor: '#33333a',
          pointColor: '#0071e3',
          simulationGravity: 0.01,
          simulationRepulsion: 0.5,
          simulationFriction: 0.95,
        });

        graph = g;
        fetchData();
      } catch (err) {
        console.error("Graph initialization failed:", err);
      }
    }
  });

  async function fetchData() {
    isLoading = true;
    try {
      const client = await getClient();
      if (!client) return;
      console.log("Fetching topology data...");
      const resp = await client.getTopology({ projectId: "251022" });
      console.log("Topology data received:", resp);
      nodes = (resp.nodes || []).filter(n => n && n.id && n.label);
      const edges = resp.edges || [];

      if (graph) {
        const pointPositions = new Float32Array(nodes.length * 2);
        const pointColors = new Float32Array(nodes.length * 4);
        
        nodes.forEach((n, i) => {
          pointPositions[i * 2] = n.x || (Math.random() * 1000 - 500);
          pointPositions[i * 2 + 1] = n.y || (Math.random() * 1000 - 500);
          
          const color = n.group === 'content' ? [0, 113, 227, 255] : n.group === 'entity' ? [255, 59, 48, 255] : [142, 142, 147, 255];
          pointColors[i * 4] = color[0];
          pointColors[i * 4 + 1] = color[1];
          pointColors[i * 4 + 2] = color[2];
          pointColors[i * 4 + 3] = color[3] / 255;
        });

        const links = new Float32Array(edges.length * 2);
        const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
        
        edges.forEach((e, i) => {
          links[i * 2] = idToIndex.get(e.fromId) || 0;
          links[i * 2 + 1] = idToIndex.get(e.toId) || 0;
        });

        console.log("Setting Graph data...");
        graph.setPointPositions(pointPositions);
        graph.setPointColors(pointColors);
        graph.setLinks(links);
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
      if (!client) return;
      
      const positions = nodes.map((n, i) => {
        const pos = graph!.getPointPositionByIndex(i);
        return { id: n.id, x: pos[0], y: pos[1] };
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

  function handleDragStart(e: DragEvent, node: any) {
    e.dataTransfer?.setData('application/json', JSON.stringify(node));
    e.dataTransfer!.effectAllowed = 'copy';
  }
</script>

<div class="topology-container">
  <div class="topology-sidebar">
    <div class="sidebar-header">
      <span>Nodes</span>
      <button class="save-layout-btn" onclick={saveLayout} title="Save Layout to History">💾</button>
    </div>
    <div class="node-list">
      {#each nodes as n (n.id)}
        <div 
          class="node-item" 
          draggable={true}
          ondragstart={(e) => handleDragStart(e, n)}
          onclick={() => handleNodeClick(n)}
        >
          <span class="node-icon {n.group || 'default'}"></span>
          <span class="node-label">{n.label}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="topology-main">
    <div 
      bind:this={containerElement} 
      style="width: 100%; height: 100%;"
    ></div>
    
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

  .save-layout-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .save-layout-btn:hover { opacity: 1; }

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
  .node-icon.default { background: #8e8e93; }

  .topology-main {
    flex: 1;
    position: relative;
  }
  
  .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; }
  .test-nodes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.01; }
  .test-node-btn { pointer-events: auto; cursor: grab; }
</style>
