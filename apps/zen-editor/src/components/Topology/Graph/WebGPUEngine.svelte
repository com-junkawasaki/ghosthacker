<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Graph } from '@cosmos.gl/graph';
  import { graphStore } from '../../lib/stores/graph.svelte';

  let { 
    onNodeClick = () => {},
    currentTransform = $bindable({ x: 0, y: 0, k: 1 })
  } = $props<{
    onNodeClick?: (node: any) => void;
    currentTransform: { x: number; y: number; k: number };
  }>();

  let containerElement = $state<HTMLDivElement | null>(null);
  let graph = $state<Graph | null>(null);

  // Watch for node/edge changes in store
  $effect(() => {
    if (graph && graphStore.nodes.size > 0) {
      updateGraphData();
    }
  });

  // Watch for selection changes in store
  $effect(() => {
    if (graph && graphStore.selectedNodeId) {
      const nodeList = Array.from(graphStore.nodes.values());
      const index = nodeList.findIndex(n => n.id === graphStore.selectedNodeId);
      if (index !== -1) {
        graph.zoomToPointByIndex(index, 800);
      }
    }
  });

  onMount(() => {
    if (containerElement) {
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

      // @ts-ignore
      g.onClick = (index: number) => {
        const nodeList = Array.from(graphStore.nodes.values());
        if (index !== undefined && index >= 0 && index < nodeList.length) {
          onNodeClick(nodeList[index]);
        }
      };

      // @ts-ignore
      if (g.zoomInstance && typeof g.zoomInstance.on === 'function') {
        // @ts-ignore
        g.zoomInstance.on('zoom', (event) => {
          const t = event.transform;
          currentTransform = { x: t.x, y: t.y, k: t.k };
        });
      }

      graph = g;
    }
  });

  onDestroy(() => {
    graph?.destroy();
  });

  function updateGraphData() {
    if (!graph) return;
    const nodeList = Array.from(graphStore.nodes.values());
    const edgeList = graphStore.edges;

    const pointPositions = new Float32Array(nodeList.length * 2);
    const pointColors = new Float32Array(nodeList.length * 4);
    
    nodeList.forEach((n, i) => {
      pointPositions[i * 2] = n.x || (Math.random() * 1000 - 500);
      pointPositions[i * 2 + 1] = n.y || (Math.random() * 1000 - 500);
      
      let color = [142, 142, 147, 255]; // default
      if (n.group === 'content') color = [0, 113, 227, 255];
      if (n.group === 'entity') color = [255, 59, 48, 255];
      if (n.group === 'environment') color = [52, 199, 89, 255];
      if (n.group === 'item') color = [255, 149, 0, 255];
      if (n.group === 'emotion') color = [255, 45, 85, 255];
      
      pointColors[i * 4] = color[0] / 255;
      pointColors[i * 4 + 1] = color[1] / 255;
      pointColors[i * 4 + 2] = color[2] / 255;
      pointColors[i * 4 + 3] = color[3] / 255;
    });

    const links = new Float32Array(edgeList.length * 2);
    const idToIndex = new Map(nodeList.map((n, i) => [n.id, i]));
    
    edgeList.forEach((e, i) => {
      const fromIdx = idToIndex.get(e.fromId) ?? 0;
      const toIdx = idToIndex.get(e.toId) ?? 0;
      links[i * 2] = fromIdx;
      links[i * 2 + 1] = toIdx;
    });

    graph.setPointPositions(pointPositions);
    graph.setPointColors(pointColors);
    graph.setLinks(links);
    graph.render();
  }

  export function fitView() {
    graph?.fitView(1000);
  }
</script>

<div bind:this={containerElement} class="engine-container"></div>

<style>
  .engine-container {
    width: 100%;
    height: 100%;
    background: #05050a;
  }
</style>

