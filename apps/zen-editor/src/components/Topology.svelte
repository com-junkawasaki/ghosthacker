<script lang="ts">
  import { onMount } from 'svelte';

  // Basic Topology visualization using SVG
  let nodes = [
    { id: '1', label: 'Tamaki', type: 'character', x: 150, y: 150, size: 24 },
    { id: '2', label: 'Kaede', type: 'character', x: 450, y: 150, size: 20 },
    { id: '3', label: 'Tokyo', type: 'location', x: 300, y: 300, size: 30 },
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
  <svg viewBox="0 0 600 450" class="topology-svg">
    <!-- Edges with Blur effect -->
    <defs>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
      </filter>
    </defs>

    {#each edges as edge}
      {@const start = getPos(edge.from)}
      {@const end = getPos(edge.to)}
      <line 
        x1={start.x} y1={start.y} 
        x2={end.x} y2={end.y} 
        stroke="#e5e5e5" 
        stroke-width="1.5" 
      />
    {/each}

    <!-- Nodes -->
    {#each nodes as node}
      <g class="node" transform="translate({node.x}, {node.y})">
        <circle 
          r={node.size} 
          fill={node.type === 'character' ? '#0071e3' : '#34c759'} 
          fill-opacity="0.1"
          stroke={node.type === 'character' ? '#0071e3' : '#34c759'}
          stroke-width="1.5"
        />
        <text 
          y={node.size + 20} 
          text-anchor="middle" 
          font-size="11" 
          font-weight="500"
          fill="#1d1d1f"
        >
          {node.label}
        </text>
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
    border-radius: 12px;
  }

  .topology-svg {
    max-width: 100%;
    max-height: 100%;
  }

  .node circle {
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .node:hover circle {
    fill-opacity: 0.2;
    transform: scale(1.1);
  }
</style>

