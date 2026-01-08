<script lang="ts">
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
    {#each edges as edge}
      {@const start = getPos(edge.from)}
      {@const end = getPos(edge.to)}
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#e5e5e5" stroke-width="1.5" />
    {/each}

    {#each nodes as node}
      <g class="node" transform="translate({node.x}, {node.y})">
        <circle r={node.size} fill="#0071e3" fill-opacity="0.1" stroke="#0071e3" stroke-width="1.5" />
        <text y={node.size + 20} text-anchor="middle" font-size="11">{node.label}</text>
      </g>
    {/each}
  </svg>
</div>

<style>
  .topology-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #fff; }
  .topology-svg { max-width: 100%; max-height: 100%; }
</style>
