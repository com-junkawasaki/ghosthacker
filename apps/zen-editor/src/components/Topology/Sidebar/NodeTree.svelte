<script lang="ts">
  import { graphStore } from '../../../lib/stores/graph.svelte';
  import { flattenTree } from '../../../lib/tree-utils';

  let { onNodeClick = () => {} } = $props<{ onNodeClick?: (node: any) => void }>();

  // Determine root circles
  const rootCircleIds = [
    'hub:content', 'hub:entity', 'hub:environment', 'hub:item', 'hub:emotion', 
    'hub:asset', 'hub:concept', 'hub:translation', 'hub:unlinked'
  ];

  let flattened = $derived(
    flattenTree(rootCircleIds, graphStore.nodes, graphStore.expandedNodes)
  );

  function handleToggle(e: MouseEvent, id: string) {
    e.stopPropagation();
    graphStore.toggleExpand(id);
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
      style="padding-left: {item.depth * 12 + 8}px"
      onclick={() => handleClick(item.node)}
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
      <span class="node-icon {item.group}"></span>
      <span class="label">{item.label}</span>
    </div>
  {/each}
</div>

<style>
  .node-tree {
    flex: 1;
    overflow-y: auto;
    background: #000;
    color: #ccc;
    font-size: 0.75rem;
    padding: 0.5rem 0;
  }

  .tree-item {
    display: flex;
    align-items: center;
    height: 22px;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
  }

  .tree-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .tree-item.selected {
    background: rgba(0, 113, 227, 0.2);
    color: #fff;
  }

  .toggle-icon {
    font-size: 0.6rem;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s;
    opacity: 0.5;
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

  .node-icon.content { background: #0071e3; }
  .node-icon.entity { background: #ff3b30; }
  .node-icon.environment { background: #34c759; }
  .node-icon.item { background: #ff9500; }
  .node-icon.emotion { background: #ff2d55; }
  .node-icon.meta { background: #af52de; }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

