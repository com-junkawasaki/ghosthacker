<script lang="ts">
  import { client } from '../lib/api';

  let { onSelect } = $props();

  let nodes = $state([]);
  let edges = $state([]);
  let isLoading = $state(true);
  let selectedNodeId = $state(null);
  let multiSelect = $state([]);
  let isDragging = $state(false);
  let dragNode = $state(null);

  console.log("Topology component script evaluated");

  $effect(() => {
    refreshGraph();
  });

      async function refreshGraph() {
        isLoading = true;
        try {
          console.log("Fetching project metadata and topology...");
          const [metaResp, topoResp] = await Promise.all([
            client.getProjectMetadata({ projectId: "251022" }),
            client.getTopology({ projectId: "251022" })
          ]);
          
          const topo = {
            nodes: topoResp.nodes.map(n => ({
              id: n.id,
              label: n.label,
              type: n.type,
              x: n.x,
              y: n.y,
              content: n.content,
              group: n.group
            })),
            edges: topoResp.edges.map(e => ({
              fromId: e.fromId,
              toId: e.toId,
              relation: e.relation,
              color: e.color,
              style: e.style,
              group: e.group,
              strength: e.strength
            }))
          };

          const width = 1000;
          const height = 800;
          const centerX = width / 2;
          const centerY = height / 2;

          // Process nodes and assign positions if missing
          nodes = topo.nodes.map((n, i) => {
            let x = n.x;
            let y = n.y;
            let size = 20;

            if (n.group === 'content') {
              size = n.type === 'gh:Manuscript' ? 28 : 12;
            } else if (n.group === 'entity') {
              size = 32;
            } else if (n.group === 'concept') {
              size = 20;
            } else if (n.group === 'link-node') {
              size = 18; // Smaller diamond-like node for relationships
            }

            if (x === 0 && y === 0) {
              if (n.group === 'entity') {
                const angle = (i / 10) * Math.PI * 2;
                x = centerX + Math.cos(angle) * 200;
                y = centerY + Math.sin(angle) * 180;
              } else if (n.group === 'content') {
                const angle = (i / 15) * Math.PI * 2;
                x = centerX + Math.cos(angle) * 380;
                y = centerY + Math.sin(angle) * 320;
              } else if (n.group === 'link-node') {
                x = centerX + (Math.random() - 0.5) * 200;
                y = centerY + (Math.random() - 0.5) * 200;
              } else {
                x = centerX + (Math.random() - 0.5) * 400;
                y = centerY + (Math.random() - 0.5) * 400;
              }
            }

            return { ...n, x, y, size, label: n.label || 'Unknown' };
          });

          edges = topo.edges;
          isLoading = false;
        } catch (err) {
          console.error("Failed to load graph:", err);
          isLoading = false;
        }
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
            const results = JSON.parse(resp.resultJson);
            alert("AI Analysis complete. Suggestions: " + resp.resultJson);
            // In future, we could add these links dynamically
          }
        } catch (err) {
          console.error(err);
        } finally {
          isLoading = false;
        }
      }

  // --- Dragging Logic ---
  function handleMouseDown(node, event) {
    console.log("handleMouseDown called for:", node.id);
    if (event.shiftKey) return; // Ignore for multi-select
    dragNode = node;
    isDragging = true;
    
    // We don't call onSelect here to avoid duplicate calls with onclick
    // but we can set the dragNode so handleMouseMove works
  }

  function handleMouseMove(event) {
    if (!isDragging || !dragNode) return;
    const svg = event.currentTarget;
    const CTM = svg.getScreenCTM();
    const x = (event.clientX - CTM.e) / CTM.a;
    const y = (event.clientY - CTM.f) / CTM.d;
    
    // Update node position in state
    nodes = nodes.map(n => n.id === dragNode.id ? { ...n, x, y } : n);
  }

  function handleMouseUp() {
    isDragging = false;
    dragNode = null;
  }

  async function saveLayout() {
    isLoading = true;
    try {
      const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
      const resp = await client.callTool({
        name: "update_node_positions",
        argumentsJson: JSON.stringify({ positions })
      });
      if (!resp.isError) {
        console.log("Layout saved to JSON-LD");
      } else {
        alert("Failed to save layout: " + resp.resultJson);
      }
    } catch (err) {
      console.error("Save layout failed:", err);
    } finally {
      isLoading = false;
    }
  }

  function toggleNode(node, event) {
    console.log("toggleNode called for:", node.id, "shiftKey:", event.shiftKey);
    event.stopPropagation(); // Prevent bubbling if any
    
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
    
    console.log("New multiSelect:", multiSelect);
    
    // Provide callback with full selection objects
    if (onSelect) {
      const selectedNodes = nodes.filter(n => multiSelect.includes(n.id));
      console.log("Calling onSelect with:", selectedNodes.length, "nodes");
      onSelect(node, selectedNodes);
    }
  }

  function getPos(id: string) {
    const n = nodes.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
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
</script>

<div class="topology-container">
  {#if isLoading}
    <div class="loader"><div class="spinner"></div>Syncing Story Graph...</div>
  {:else}
        <div class="graph-toolbar">
          <div class="selection-info">{multiSelect.length} nodes selected</div>
          <button class="tool-btn ai-btn" onclick={runAIAnalysis}>✨ AI Link Analysis</button>
          <button class="tool-btn action" onclick={handleGenerateNode}>Generate from Selection</button>
          <button class="tool-btn" onclick={saveLayout}>Save Layout</button>
          <button class="tool-btn" onclick={refreshGraph}>Refresh</button>
        </div>
    
    <svg 
      viewBox="0 0 1000 800" 
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
              {@const start = getPos(edge.fromId)}
              {@const end = getPos(edge.toId)}
              {#if start.x !== 0 && end.x !== 0}
                <line 
                  x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
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
