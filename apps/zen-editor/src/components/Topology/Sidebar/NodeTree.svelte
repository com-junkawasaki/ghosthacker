<script lang="ts">
  import { graphStore } from '../../../lib/stores/graph.svelte';
  import { flattenTree } from '../../../lib/tree-utils';

  let { onNodeClick = () => {} } = $props<{ onNodeClick?: (node: any) => void }>();

  // Determine root circles - dynamic from nodes starting with hub:
  let rootCircleIds = $derived(
    Array.from(graphStore.nodes.keys())
      .filter(id => id.startsWith('hub:'))
      .sort((a, b) => {
        // Prioritize Story, Character, etc.
        const order = ['hub:content', 'hub:entity', 'hub:environment', 'hub:item', 'hub:emotion', 'hub:translation', 'hub:unlinked'];
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      })
  );

  let flattened = $derived(
    flattenTree(rootCircleIds, graphStore.nodes, graphStore.expandedNodes)
  );

  function handleToggle(e: MouseEvent, id: string) {
    e.stopPropagation();
    graphStore.toggleExpand(id);
  }

  function handleDragStart(e: DragEvent, node: any) {
    e.dataTransfer?.setData('application/json', JSON.stringify(node));
  }

  function handleClick(node: any) {
    graphStore.selectNode(node.id);
    onNodeClick(node);
  }
</script>

<div class="node-tree">
  {#each flattened as item (item.id + item.depth)}
    <div 
      class="tree-item" 
      class:selected={graphStore.selectedNodeId === item.id}
      class:hub={item.id.startsWith('hub:')}
      style="padding-left: {item.depth * 12 + 8}px"
      onclick={() => handleClick(item.node)}
      draggable="true"
      ondragstart={(e) => handleDragStart(e, item.node)}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && handleClick(item.node)}
    >
      <span 
        class="toggle-icon" 
        class:expanded={item.isExpanded} 
        class:hidden={!item.hasChildren}
        onclick={(e) => handleToggle(e, item.id)}
        role="presentation"
      >
        ▶
      </span>
      {#if item.node.imagePath}
        <img src={item.node.imagePath} alt="" class="node-thumbnail" />
      {:else}
        <span class="node-icon {item.group}"></span>
      {/if}
      <span class="label">{item.label}</span>
    </div>
  {/each}
</div>

<style>
  .node-tree {
    flex: 1;
    overflow-y: auto;
    background: transparent;
    color: var(--system-label);
    font-size: 0.8rem;
    padding: 0;
  }

  .tree-item {
    display: flex;
    align-items: center;
    height: 28px;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    border-radius: 6px;
    margin: 0 8px;
    color: var(--system-label);
  }

  .tree-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--system-label);
  }

  .tree-item.selected {
    background: rgba(0, 122, 255, 0.15);
    color: var(--accent-blue);
    font-weight: 600;
  }

  .tree-item.hub {
    font-weight: 700;
    color: var(--system-label);
    letter-spacing: 0.02em;
  }

  .toggle-icon {
    font-size: 0.5rem;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s;
    opacity: 0.5;
    margin-right: 4px;
  }

  .toggle-icon.expanded {
    transform: rotate(90deg);
  }

  .toggle-icon.hidden {
    visibility: hidden;
  }

  .node-icon {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .node-thumbnail {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    margin-right: 8px;
    flex-shrink: 0;
    object-fit: cover;
    border: 1px solid var(--tertiary-label);
  }

  .node-icon.content { background: #0071e3; }
  .node-icon.entity { background: #ff3b30; }
  .node-icon.environment { background: #34c759; }
  .node-icon.item { background: #ff9500; }
  .node-icon.emotion { background: #ff2d55; }
  .node-icon.meta { background: #af52de; }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    margin-right: 8px;
  }
</style>

