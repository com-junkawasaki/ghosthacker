<script lang="ts">
  import { onMount } from 'svelte';
  import { client } from '../lib/api';

  // Svelte 5 Runes
  let nodes = $state([]);
  let edges = $state([]);
  let isLoading = $state(true);

  onMount(async () => {
    try {
      const resp = await client.getTopology({ projectId: "251022" });
      
      // Basic layout algorithm (circular or grid for now)
      const width = 800;
      const height = 600;
      
      nodes = resp.nodes.map((n, i) => {
        const angle = (i / resp.nodes.length) * Math.PI * 2;
        return {
          ...n,
          x: width / 2 + Math.cos(angle) * 200,
          y: height / 2 + Math.sin(angle) * 180,
          size: n.type.includes('Person') ? 25 : 20
        };
      });

      edges = resp.edges;
      isLoading = false;
    } catch (err) {
      console.error("Failed to load topology:", err);
      isLoading = false;
    }
  });

  function getPos(id: string) {
    return nodes.find(n => n.id === id) || { x: 0, y: 0 };
  }
</script>

<div class="topology-container">
  {#if isLoading}
    <div class="loader">Constructing Graph...</div>
  {:else}
    <svg viewBox="0 0 800 600" class="topology-svg">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="20" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#d2d2d7" />
        </marker>
      </defs>

      {#each edges as edge}
        {@const start = getPos(edge.fromId)}
        {@const end = getPos(edge.toId)}
        {#if start.x !== 0 && end.x !== 0}
          <line
            x1={start.x} y1={start.y}
            x2={end.x} y2={end.y}
            stroke="#e5e5e5"
            stroke-width="1.5"
            marker-end="url(#arrowhead)"
          />
        {/if}
      {/each}

      {#each nodes as node}
        <g class="node" transform="translate({node.x}, {node.y})">
          <circle
            r={node.size}
            fill={node.type.includes('Person') ? '#0071e3' : '#34c759'}
            fill-opacity="0.1"
            stroke={node.type.includes('Person') ? '#0071e3' : '#34c759'}
            stroke-width="1.5"
          />
          <text
            y={node.size + 15}
            text-anchor="middle"
            font-size="10"
            font-weight="600"
            fill="#1d1d1f"
          >
            {node.label}
          </text>
          <text
            y={node.size + 28}
            text-anchor="middle"
            font-size="8"
            fill="#86868b"
          >
            {node.type.split(':').pop()}
          </text>
        </g>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .topology-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
  .topology-svg { width: 100%; height: 100%; }
  .node circle { cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .node:hover circle { fill-opacity: 0.2; transform: scale(1.1); }
  .loader { font-size: 0.9rem; color: #86868b; font-weight: 500; }
</style>
