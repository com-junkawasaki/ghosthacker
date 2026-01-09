<script lang="ts">
  console.log("TopologyWebGPU script evaluated");
  import { client } from '../lib/api';
  import { onMount, onDestroy } from 'svelte';
  // import * as d3Zoom from 'd3-zoom';
  // import { select } from 'd3-selection';
  import GraphWorker from '../lib/graph_v2.worker?worker';

  let { onSelect } = $props();

  let nodes = $state<any[]>([]);
  let isLoading = $state(true);
  
  let containerWidth = $state(1000);
  let containerHeight = $state(800);
  let canvasElement = $state<HTMLCanvasElement | null>(null);
  let worker: Worker | null = null;

  $effect(() => {
    console.log("TopologyWebGPU $effect (Worker init) started");
    if (!worker && canvasElement) {
        try {
            console.log("Creating GraphWorker...");
            worker = new GraphWorker();
            worker.onerror = (err) => console.error("Worker error:", err);
            worker.onmessage = (e) => {
                if (e.data.type === 'NODE_AT_RESULT' && e.data.data) {
                    onSelect?.(e.data.data, [e.data.data]);
                }
            };
            
            console.log("Transferring canvas control...");
            const offscreen = canvasElement.transferControlToOffscreen();
            worker.postMessage({ 
                type: 'INIT', 
                data: { 
                    canvas: offscreen,
                    width: containerWidth,
                    height: containerHeight
                } 
            }, [offscreen]);
            
            console.log("Worker initialized.");
        } catch (err) {
            console.error("Worker creation failed:", err);
        }
    }
  });

  $effect(() => {
    console.log("TopologyWebGPU $effect (Data fetch) started");
    (async () => {
        isLoading = true;
        try {
          console.log("Fetching topology data...");
          const topoResp = await client.getTopology({ projectId: "251022" });
          nodes = (topoResp.nodes || []).filter(n => n && n.id && n.label);
          console.log(`Fetched ${nodes.length} nodes`);
          
          if (worker) {
              const nodesData = nodes.map(n => ({ 
                  id: n.id, 
                  label: n.label, 
                  x: n.x || (Math.random() * containerWidth), 
                  y: n.y || (Math.random() * containerHeight),
                  group: n.group || 'unknown'
              }));
              worker.postMessage({ type: 'UPDATE_DATA', data: { nodes: nodesData, edges: [] } });
          }
        } catch (err) {
          console.error("Topology fetch failed:", err);
        } finally {
          isLoading = false;
        }
    })();
  });

  onDestroy(() => {
    if (worker) worker.terminate();
  });

  function handleNodeClick(node: any) {
      onSelect?.(node, [node]);
  }
</script>

<div class="topology-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  {console.log("Rendering Topology canvas, element:", canvasElement)}
  <canvas 
    bind:this={canvasElement} 
    width={containerWidth} 
    height={containerHeight}
  ></canvas>
  
  {#if isLoading}
    <div class="loader"><div class="spinner"></div>Syncing Story Graph...</div>
  {/if}

  <div class="test-nodes">
      {#each nodes as n (n.id)}
          <button class="test-node-btn" data-node-name={n.label} onclick={() => handleNodeClick(n)}>{n.label}</button>
      {/each}
  </div>
</div>

<style>
  .topology-container { width: 100%; height: 100%; position: relative; background: #05050a; }
  canvas { width: 100%; height: 100%; display: block; }
  .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; display: flex; flex-direction: column; align-items: center; gap: 1rem; z-index: 100; }
  .spinner { width: 24px; height: 24px; border: 2px solid #333; border-top-color: #0071e3; border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .test-nodes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 10; opacity: 0.01; }
  .test-node-btn { pointer-events: auto; }
</style>
