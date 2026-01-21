<script lang="ts">
  import EntityProfile from './EntityProfile.svelte';
  import ConnectionSuggester from './ConnectionSuggester.svelte';

  let { selectedNode, projectId, onRefreshTopology } = $props<{
    selectedNode: any;
    projectId: string;
    onRefreshTopology: () => void;
  }>();

  let mode = $derived(selectedNode?.viewType || 'details');
</script>

<aside class="inspector-sidebar">
  {#if !selectedNode}
    <div class="empty-state">
      <span class="icon">􀍩</span>
      <p>Select a node to view details</p>
    </div>
  {:else}
    <div class="inspector-header">
      <div class="node-badge" style="background-color: var(--accent-{selectedNode.group || 'blue'})"></div>
      <h2>{selectedNode.label || 'Untitled Node'}</h2>
    </div>

    <div class="inspector-content">
      {#if selectedNode.group === 'entity'}
        <EntityProfile node={selectedNode} {projectId} onRefresh={onRefreshTopology} />
      {:else if selectedNode.group === 'unlinked'}
        <ConnectionSuggester node={selectedNode} {projectId} onConnect={onRefreshTopology} />
      {:else}
        <div class="details-section">
          <div class="row">
            <span class="label">ID</span>
            <span class="value">{selectedNode.id}</span>
          </div>
          <div class="row">
            <span class="label">Type</span>
            <span class="value">{selectedNode.type}</span>
          </div>
          <div class="row">
            <span class="label">Group</span>
            <span class="value">{selectedNode.group}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="description">
            <label for="node-desc">Description</label>
            <textarea id="node-desc" readonly>{selectedNode.content || 'No description available'}</textarea>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .inspector-sidebar {
    width: var(--inspector-width);
    height: 100%;
    background-color: var(--system-background);
    border-left: 1px solid var(--tertiary-label);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--tertiary-label);
    gap: 12px;
  }

  .empty-state .icon {
    font-size: 3rem;
  }

  .inspector-header {
    padding: 16px;
    border-bottom: 1px solid var(--tertiary-label);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .node-badge {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  h2 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .inspector-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .details-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }

  .row .label { color: var(--secondary-label); }
  .row .value { color: var(--system-label); font-family: monospace; }

  .divider {
    height: 1px;
    background: var(--tertiary-label);
    margin: 12px 0;
  }

  .description {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .description label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--secondary-label);
  }

  textarea {
    min-height: 100px;
    resize: none;
    font-size: 0.85rem;
    line-height: 1.4;
    background: transparent;
    border: none;
    padding: 0;
  }
</style>
