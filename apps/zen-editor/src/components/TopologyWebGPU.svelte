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
</script>

<div class="topology-container">
  <div 
    bind:this={containerElement} 
    style="width: 100%; height: 100%;"
  ></div>
  
  {#if isLoading}
    <div class="loader">Syncing story world...</div>
  {/if}

  <div class="test-nodes">
      {#each nodes as n (n.id)}
          <button class="test-node-btn" data-node-name={n.label} onclick={() => handleNodeClick(n)}>{n.label}</button>
      {/each}
  </div>
</div>

<style>
  .topology-container { width: 100%; height: 100%; position: relative; background: #05050a; }
  .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; }
  .test-nodes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.01; }
  .test-node-btn { pointer-events: auto; }
</style>
