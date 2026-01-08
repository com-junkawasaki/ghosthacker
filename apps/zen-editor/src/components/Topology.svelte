<script lang="ts">
  import { onMount } from 'svelte';

  // Basic Topology visualization using SVG
  let nodes = [
    { id: '1', label: 'Tamaki', type: 'character', x: 100, y: 100 },
    { id: '2', label: 'Kaede', type: 'character', x: 300, y: 100 },
    { id: '3', label: 'Tokyo', type: 'location', x: 200, y: 250 },
  ];

  let edges = [
    { from: '1', to: '2', relation: 'knows' },
    { from: '1', to: '3', relation: 'lives_in' },
  ];

  function getPos(id: string) {
    return nodes.find(n => n.id === id) || { x: 0, y: 0 };
  }
</script>

<div class="topology-container">
  <svg width="600" height="400">
    <!-- Edges -->
    {#each edges as edge}
      {@const start = getPos(edge.from)}
      {@const end = getPos(edge.to)}
      <line 
        x1={start.x} y1={start.y} 
        x2={end.x} y2={end.y} 
        stroke="#ccc" 
        stroke-width="2" 
      />
      <text 
        x={(start.x + end.x) / 2} 
        y={(start.y + end.y) / 2} 
        font-size="10" 
        fill="#999"
      >
        {edge.relation}
      </text>
    {/each}

    <!-- Nodes -->
    {#each nodes as node}
      <g class="node" transform="translate({node.x}, {node.y})">
        <circle r="20" fill={node.type === 'character' ? '#007bff' : '#28a745'} />
        <text y="35" text-anchor="middle" font-size="12">{node.label}</text>
      </g>
    {/each}
  </svg>
</div>

<style>
  .topology-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #fff;
  }

  .node circle {
    cursor: pointer;
    transition: transform 0.2s;
  }

  .node circle:hover {
    transform: scale(1.2);
  }
</style>

