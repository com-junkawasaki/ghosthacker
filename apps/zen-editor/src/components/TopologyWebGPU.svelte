<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { client } from '../lib/api';
    import GraphWorker from '../lib/graph.worker?worker';

    let { onSelect } = $props();

    let canvas = $state<HTMLCanvasElement | null>(null);
    let worker: Worker | null = null;
    let containerWidth = $state(1000);
    let containerHeight = $state(800);
    let isLoading = $state(true);
    let nodesMetadata = $state<any[]>([]);

    onMount(async () => {
        console.log("TopologyWebGPU onMount started");
        if (!canvas) {
            console.error("Canvas element not found");
            return;
        }

        try {
            worker = new GraphWorker();
            console.log("GraphWorker created");

            worker.onmessage = (e) => {
                if (e.data.type === 'NODE_FOUND') {
                    console.log("Node found from worker:", e.data.data?.label);
                    if (onSelect) {
                        onSelect(e.data.data, [e.data.data]);
                    }
                }
            };

            const offscreen = canvas.transferControlToOffscreen();
            worker.postMessage({
                type: 'INIT',
                data: { canvas: offscreen }
            }, [offscreen]);
            console.log("Worker INIT message sent");

            await refreshGraph();
        } catch (err) {
            console.error("TopologyWebGPU onMount error:", err);
        }
    });

    onDestroy(() => {
        if (worker) worker.terminate();
    });

    async function refreshGraph() {
        isLoading = true;
        try {
            const topoResp = await client.getTopology({ projectId: "251022" });
            nodesMetadata = topoResp.nodes;
            
            const nodes = topoResp.nodes.map(n => ({
                pos: [
                    (Math.random() - 0.5) * 500,
                    (Math.random() - 0.5) * 400
                ],
                vel: [0, 0],
                mass: 1.0,
                radius: n.group === 'entity' ? 15.0 : 8.0,
            }));

            const edges = topoResp.edges.map(e => ({
                source: topoResp.nodes.findIndex(n => n.id === e.fromId),
                target: topoResp.nodes.findIndex(n => n.id === e.toId),
                weight: e.strength || 1.0
            })).filter(e => e.source !== -1 && e.target !== -1);

            if (worker) {
                worker.postMessage({
                    type: 'UPDATE_DATA',
                    data: { 
                        nodes, 
                        edges, 
                        metadata: topoResp.nodes
                    }
                });
            }
        } catch (err) {
            console.error("Failed to load topology:", err);
        } finally {
            isLoading = false;
        }
    }

    function handleCanvasClick(e: MouseEvent) {
        if (!worker || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        worker.postMessage({ type: 'GET_NODE_AT', data: { x, y } });
    }
</script>

<div class="topology-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
    {#if isLoading}
        <div class="loader">
            <div class="spinner"></div>
            Initializing WebGPU Graph...
        </div>
    {/if}
    <canvas 
        bind:this={canvas} 
        width={containerWidth} 
        height={containerHeight}
        class="topology-canvas"
        onclick={handleCanvasClick}
    ></canvas>

    <!-- Hidden list for E2E testing selection -->
    <div class="test-nodes" style="display: none;" aria-hidden="true">
        {#each nodesMetadata as n}
            <button class="test-node-btn" data-node-name={n.label} onclick={() => onSelect(n, [n])}>{n.label}</button>
        {/each}
    </div>
</div>

<style>
    .topology-container {
        width: 100%; height: 100%; position: relative; background: #fff; overflow: hidden;
    }
    .topology-canvas {
        width: 100%; height: 100%; display: block; cursor: crosshair;
    }
    .loader {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        display: flex; flex-direction: column; align-items: center; gap: 1rem; color: #86868b; font-size: 0.9rem; z-index: 10;
    }
    .spinner {
        width: 24px; height: 24px; border: 2px solid #f5f5f7; border-top-color: #0071e3; border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>
