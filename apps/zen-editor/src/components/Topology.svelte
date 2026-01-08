<script lang="ts">
  import { onMount } from 'svelte';
  import { client } from '../lib/api';

  let { onSelect } = $props();

  let nodes = $state([]);
  let edges = $state([]);
  let isLoading = $state(true);
  let selectedNodeId = $state(null);
  let multiSelect = $state([]); // For generation context

  onMount(async () => {
    await refreshGraph();
  });

  async function refreshGraph() {
    isLoading = true;
    try {
      const [meta, topo] = await Promise.all([
        client.getProjectMetadata({ projectId: "251022" }),
        client.getTopology({ projectId: "251022" })
      ]);

      const width = 1000;
      const height = 800;
      const centerX = width / 2;
      const centerY = height / 2;

      const manuscriptNodes = [];
      const manuscriptEdges = [];
      
      meta.episodes.forEach((ep, epIdx) => {
        const epAngle = (epIdx / meta.episodes.length) * Math.PI * 2;
        const epX = centerX + Math.cos(epAngle) * 350;
        const epY = centerY + Math.sin(epAngle) * 300;

        ep.files.forEach((file, fileIdx) => {
          const fileId = `file:${ep.id}:${fileIdx}`;
          manuscriptNodes.push({
            id: fileId,
            label: file.split('/').pop(),
            type: 'manuscript',
            filePath: "251022/wattpad/" + file,
            x: epX + (fileIdx - 1) * 60,
            y: epY + 40,
            size: 22
          });
          if (fileIdx > 0) {
            manuscriptEdges.push({ fromId: `file:${ep.id}:${fileIdx - 1}`, toId: fileId, relation: 'precedes' });
          }
        });
      });

      const entityNodes = topo.nodes.map((n, i) => {
        const angle = (i / topo.nodes.length) * Math.PI * 2;
        return { ...n, x: centerX + Math.cos(angle) * 150, y: centerY + Math.sin(angle) * 120, size: n.type.includes('Person') ? 30 : 20 };
      });

      nodes = [...manuscriptNodes, ...entityNodes];
      edges = [...manuscriptEdges, ...topo.edges];
      isLoading = false;
    } catch (err) {
      console.error("Failed to load graph:", err);
      isLoading = false;
    }
  }

  function toggleNode(node, event) {
    if (event.shiftKey) {
      if (multiSelect.includes(node.id)) {
        multiSelect = multiSelect.filter(id => id !== node.id);
      } else {
        multiSelect = [...multiSelect, node.id];
      }
    } else {
      selectedNodeId = node.id;
      multiSelect = [node.id];
      if (onSelect) onSelect(node);
    }
  }

  function getPos(id: string) {
    const n = nodes.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  }

  async function handleGenerateNode() {
    if (multiSelect.length === 0) {
      alert("Please select at least one node (Shift+Click for multiple).");
      return;
    }

    const contextPaths = nodes
      .filter(n => multiSelect.includes(n.id) && n.filePath)
      .map(n => n.filePath);

    if (contextPaths.length === 0) {
      alert("Selected nodes must be manuscripts to provide context.");
      return;
    }

    const newPath = prompt("Enter path for new generated node:", "251022/wattpad/episodes/gen/new_scene.md");
    if (!newPath) return;

    isLoading = true;
    try {
      const resp = await client.callTool({
        name: "generate_node",
        argumentsJson: JSON.stringify({
          context_paths: contextPaths,
          new_path: newPath
        })
      });
      
      if (!resp.isError) {
        alert("Node Generated Successfully!");
        await refreshGraph();
      } else {
        alert("Generation failed: " + resp.resultJson);
      }
    } catch (err) {
      console.error("Tool call failed:", err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="topology-container">
  {#if isLoading}
    <div class="loader">
      <div class="spinner"></div>
      Processing Story Graph...
    </div>
  {:else}
    <div class="graph-toolbar">
      <div class="selection-info">
        {multiSelect.length} nodes selected
      </div>
      <button class="tool-btn action" onclick={handleGenerateNode}>
        Generate New Node from Selection
      </button>
      <button class="tool-btn" onclick={refreshGraph}>Refresh</button>
    </div>
    
    <svg viewBox="0 0 1000 800" class="topology-svg">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#d2d2d7" />
        </marker>
      </defs>

      <g class="edges">
        {#each edges as edge}
          {@const start = getPos(edge.fromId)}
          {@const end = getPos(edge.toId)}
          {#if start.x !== 0 && end.x !== 0}
            <line
              x1={start.x} y1={start.y}
              x2={end.x} y2={end.y}
              class="edge-line"
              class:manuscript-edge={edge.relation === 'precedes'}
              marker-end="url(#arrowhead)"
            />
          {/if}
        {/each}
      </g>

      <g class="nodes">
        {#each nodes as node}
          <g 
            class="node" 
            transform="translate({node.x}, {node.y})"
            onclick={(e) => toggleNode(node, e)}
            class:selected={selectedNodeId === node.id || multiSelect.includes(node.id)}
          >
            <circle
              r={node.size}
              class="node-circle"
              class:manuscript={node.type === 'manuscript'}
              class:person={node.type.includes('Person')}
            />
            <text y={node.size + 18} text-anchor="middle" class="node-label">{node.label}</text>
            {#if multiSelect.includes(node.id)}
              <circle r={node.size + 5} class="selection-ring" />
            {/if}
          </g>
        {/each}
      </g>
    </svg>
  {/if}
</div>

<style>
  .topology-container { width: 100%; height: 100%; position: relative; overflow: hidden; background: #fff; }
  .topology-svg { width: 100%; height: 100%; }
  .loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 1rem; color: #86868b; font-size: 0.9rem; z-index: 50; }
  .spinner { width: 24px; height: 24px; border: 2px solid #f5f5f7; border-top-color: #0071e3; border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .graph-toolbar { position: absolute; top: 1.5rem; right: 1.5rem; display: flex; align-items: center; gap: 1rem; z-index: 10; }
  .selection-info { font-size: 0.75rem; color: #86868b; font-weight: 600; background: rgba(255,255,255,0.8); padding: 0.4rem 0.8rem; border-radius: 12px; backdrop-filter: blur(10px); }
  .tool-btn { background: #f5f5f7; color: #1d1d1f; border: 1px solid #d2d2d7; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .tool-btn.action { background: #0071e3; color: white; border: none; box-shadow: 0 4px 12px rgba(0,113,227,0.2); }
  .tool-btn:hover { transform: translateY(-1px); }

  .edge-line { stroke: #e5e5e5; stroke-width: 1.5; fill: none; }
  .manuscript-edge { stroke: #0071e3; stroke-dasharray: 4 4; opacity: 0.4; }

  .node { cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .node-circle { fill: #f5f5f7; stroke: #d2d2d7; stroke-width: 1.5; }
  .node-circle.manuscript { fill: #eef7ff; stroke: #0071e3; }
  .node-circle.person { fill: #fff0f0; stroke: #ff3b30; }
  .node-label { font-size: 10px; font-weight: 600; fill: #1d1d1f; pointer-events: none; }
  .selection-ring { fill: none; stroke: #0071e3; stroke-width: 2; opacity: 0.6; }
  .selected .node-circle { stroke-width: 3; stroke: #0071e3; }
</style>
