<script lang="ts">
  import { client } from '../lib/api';
  import * as d3 from 'd3-force';
  import { onMount } from 'svelte';

  interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    type: string;
    content?: string;
    group: string;
    size: number;
    embedding?: number[];
    filePath?: string;
  }

  interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
    relation: string;
    color?: string;
    style?: string;
    group: string;
    strength: number;
    distance: number;
  }

  let { onSelect } = $props();

  let nodes = $state<GraphNode[]>([]);
  let edges = $state<GraphEdge[]>([]);
  let isLoading = $state(true);
  let selectedNodeId = $state<string | null>(null);
  let multiSelect = $state<string[]>([]);
  let isDragging = $state(false);
  let dragNode = $state<GraphNode | null>(null);

  let simulation: d3.Simulation<GraphNode, GraphEdge>;
  let containerWidth = 1000;
  let containerHeight = 800;

  console.log("Topology component script evaluated");

  $effect(() => {
    initSimulation();
    refreshGraph();
  });

  function initSimulation() {
    simulation = d3.forceSimulation<GraphNode>()
      .force("link", d3.forceLink<GraphNode, GraphEdge>().id(d => d.id).distance(d => d.distance))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => d.size + 15))
      .on("tick", () => {
        nodes = [...nodes];
      });
  }

  async function refreshGraph() {
    isLoading = true;
    try {
      const [metaResp, topoResp] = await Promise.all([
        client.getProjectMetadata({ projectId: "251022" }),
        client.getTopology({ projectId: "251022" })
      ]);
      
      const rawNodes: GraphNode[] = topoResp.nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        x: n.x || (containerWidth / 2 + (Math.random() - 0.5) * 100),
        y: n.y || (containerHeight / 2 + (Math.random() - 0.5) * 100),
        content: n.content,
        group: n.group,
        embedding: [...n.embedding],
        size: calculateSize(n)
      }));

      const rawEdges: GraphEdge[] = topoResp.edges.map(e => ({
        source: e.fromId,
        target: e.toId,
        relation: e.relation,
        color: e.color,
        style: e.style,
        group: e.group,
        strength: e.strength,
        distance: e.distance || 150
      }));

      nodes = rawNodes;
      edges = rawEdges;

      simulation.nodes(nodes);
      simulation.force<d3.ForceLink<GraphNode, GraphEdge>>("link").links(edges);
      simulation.alpha(1).restart();

      isLoading = false;
    } catch (err) {
      console.error("Failed to load graph:", err);
      isLoading = false;
    }
  }

  function calculateSize(n) {
    if (n.group === 'content') return n.type === 'gh:Manuscript' ? 28 : 12;
    if (n.group === 'entity') return 32;
    if (n.group === 'concept') return 20;
    if (n.group === 'link-node') return 18;
    return 20;
  }

  // --- Dragging Logic ---
  function handleMouseDown(node, event) {
    if (event.shiftKey) return;
    dragNode = node;
    isDragging = true;
    simulation.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;
  }

  function handleMouseMove(event) {
    if (!isDragging || !dragNode) return;
    const svg = event.currentTarget;
    const CTM = svg.getScreenCTM();
    const x = (event.clientX - CTM.e) / CTM.a;
    const y = (event.clientY - CTM.f) / CTM.d;
    
    dragNode.fx = x;
    dragNode.fy = y;
  }

  function handleMouseUp() {
    if (isDragging && dragNode) {
      simulation.alphaTarget(0);
      // Keep fx/fy if we want to "pin" nodes, or set to null to let them settle
      // Let's set to null for "LLM vector fluid layout" feel
      dragNode.fx = null;
      dragNode.fy = null;
      autoSaveLayout();
    }
    isDragging = false;
    dragNode = null;
  }

  let saveTimeout;
  function autoSaveLayout() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
        await client.callTool({
          name: "update_node_positions",
          argumentsJson: JSON.stringify({ positions })
        });
        console.log("Layout auto-saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2000);
  }

  function toggleNode(node, event) {
    event.stopPropagation();
    if (event.shiftKey) {
      if (multiSelect.includes(node.id)) {
        multiSelect = multiSelect.filter(id => id !== node.id);
      } else {
        multiSelect = [...multiSelect, node.id];
      }
    } else {
      selectedNodeId = node.id;
      multiSelect = [node.id];
    }
    
    if (onSelect) {
      const selectedNodes = nodes.filter(n => multiSelect.includes(n.id));
      onSelect(node, selectedNodes);
    }
  }

  async function handleGenerateNode() {
    if (multiSelect.length === 0) return;
    const contextPaths = nodes.filter(n => multiSelect.includes(n.id) && n.filePath).map(n => n.filePath);
    if (contextPaths.length === 0) return;
    const newPath = prompt("Enter path for new generated node:", "251022/wattpad/episodes/gen/new_scene.md");
    if (!newPath) return;
    isLoading = true;
    try {
      await client.callTool({ name: "generate_node", argumentsJson: JSON.stringify({ context_paths: contextPaths, new_path: newPath }) });
      await refreshGraph();
    } catch (err) { console.error(err); } finally { isLoading = false; }
  }

  async function runAIAnalysis() {
    if (multiSelect.length < 2) {
      alert("Select at least 2 nodes for AI analysis.");
      return;
    }
    isLoading = true;
    try {
      const resp = await client.callTool({
        name: "analyze_links",
        argumentsJson: JSON.stringify({ node_ids: multiSelect })
      });
      if (!resp.isError) {
        alert("AI Analysis complete. Suggestions: " + resp.resultJson);
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="topology-container">
  {#if isLoading}
    <div class="loader"><div class="spinner"></div>Syncing Story Graph...</div>
  {:else}
    <div class="graph-toolbar">
      <div class="selection-info">{multiSelect.length} nodes selected</div>
      <button class="tool-btn ai-btn" onclick={runAIAnalysis}>✨ AI Link Analysis</button>
      <button class="tool-btn action" onclick={handleGenerateNode}>Generate from Selection</button>
    </div>
    
    <svg 
      viewBox="0 0 {containerWidth} {containerHeight}" 
      class="topology-svg" 
      onmousemove={handleMouseMove} 
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      role="img"
      aria-label="Story Topology Graph"
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#d2d2d7" />
        </marker>
      </defs>

      <g class="edges">
        {#each edges as edge}
          {#if typeof edge.source === 'object' && typeof edge.target === 'object'}
            <line 
              x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} 
              class="edge-line" 
              style="stroke: {edge.color || '#e5e5e5'}; stroke-dasharray: {edge.style === 'dashed' ? '4 4' : edge.style === 'dotted' ? '1 3' : 'none'}"
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
            data-group={node.group}
            data-id={node.id}
            onmousedown={(e) => handleMouseDown(node, e)}
            onclick={(e) => toggleNode(node, e)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleNode(node, e)}
            class:selected={selectedNodeId === node.id || multiSelect.includes(node.id)}
            role="button"
            tabindex="0"
            aria-label="Select node {node.label}"
          >
            <circle 
              r={node.size} 
              class="node-circle" 
              class:manuscript={node.type === 'gh:Manuscript'} 
              class:block={node.type === 'gh:Block'}
              class:person={node.type && node.type.includes('Person')} 
              class:link-node={node.group === 'link-node'}
            />
            <text y={node.size + 18} text-anchor="middle" class="node-label">
              {node.label}
            </text>
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
  .edge-line { stroke: #e5e5e5; stroke-width: 1.5; fill: none; }
  .node { cursor: pointer; transition: transform 0.1s linear; pointer-events: all; }
  .node:active { cursor: grabbing; }
      .node-circle { fill: #f5f5f7; stroke: #d2d2d7; stroke-width: 1.5; }
      .node-circle.manuscript { fill: #eef7ff; stroke: #0071e3; }
      .node-circle.block { fill: #f0fff0; stroke: #34c759; }
      .node-circle.person { fill: #fff0f0; stroke: #ff3b30; }
      .node-circle.link-node { fill: #f3e8ff; stroke: #a855f7; }
      
      /* Group-based colors if class mapping is not enough */
      .node[data-group="entity"] .node-circle { fill: #fff0f0; stroke: #ff3b30; }
      .node[data-group="content"] .node-circle { fill: #eef7ff; stroke: #0071e3; }
      .node[data-group="concept"] .node-circle { fill: #f5f5f7; stroke: #d2d2d7; }
      .node[data-group="link-node"] .node-circle { fill: #f3e8ff; stroke: #a855f7; }

      .node-label { font-size: 14px; font-weight: 600; fill: #1d1d1f; pointer-events: none; }
      .selection-ring { fill: none; stroke: #0071e3; stroke-width: 2; opacity: 0.6; }
      .selected .node-circle { stroke-width: 3; stroke: #0071e3; }

      .ai-btn {
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
      }
      .ai-btn:hover { opacity: 0.9; transform: translateY(-1px); }
</style>
