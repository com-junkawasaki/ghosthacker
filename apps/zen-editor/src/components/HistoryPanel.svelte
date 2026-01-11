<script lang="ts">
  import { onMount } from 'svelte';
  import { getClient } from '../lib/api';

  let { onCheckout } = $props<{ onCheckout: (state: any, type: string) => void }>();

  let historyItems = $state<any[]>([]);
  let currentBranch = $state("main");
  let isLoading = $state(false);

  async function loadHistory() {
    isLoading = true;
    try {
      const client = await getClient();
      if (!client) return;
      const resp = await client.getHistory({ projectId: "251022", branchName: currentBranch });
      historyItems = resp.items || [];
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      isLoading = false;
    }
  }

  async function checkout(id: string) {
    try {
      const client = await getClient();
      if (!client) return;
      const resp = await client.checkoutHistory({ historyId: id });
      if (resp.success) {
        const state = JSON.parse(resp.stateJson);
        onCheckout(state, resp.type);
      }
    } catch (err) {
      console.error("Failed to checkout:", err);
    }
  }

  async function createBranch() {
    const name = prompt("Enter new branch name:");
    if (name) {
      currentBranch = name;
      await loadHistory();
    }
  }

  onMount(() => {
    loadHistory();
  });
</script>

<div class="history-panel">
  <div class="history-header">
    <h3>History & Branches</h3>
    <div class="branch-selector">
      <span>Branch: <strong>{currentBranch}</strong></span>
      <button onclick={createBranch} class="small-btn">New</button>
      <button onclick={loadHistory} class="refresh-btn">🔄</button>
    </div>
  </div>

  <div class="history-list">
    {#if isLoading}
      <div class="loading">Loading history...</div>
    {:else}
      {#each historyItems as item}
        <div class="history-item" onclick={() => checkout(item.id)}>
          <div class="item-header">
            <span class="type-tag" class:storyboard={item.type === 'storyboard'}>{item.type}</span>
            <span class="date">{new Date(item.createdAt).toLocaleString()}</span>
          </div>
          <div class="message">{item.message}</div>
          <div class="item-footer">
            <span class="branch">{item.branchName}</span>
            <span class="id">#{item.id.slice(0, 8)}</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .history-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111;
    color: #eee;
    border-left: 1px solid #333;
  }

  .history-header {
    padding: 1rem;
    border-bottom: 1px solid #333;
  }

  h3 { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #888; text-transform: uppercase; }

  .branch-selector { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }

  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .history-item {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 0.8rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .history-item:hover {
    background: #222;
    border-color: #0071e3;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
  }

  .type-tag {
    font-size: 0.6rem;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    background: #444;
  }

  .type-tag.storyboard { background: #34c759; }

  .date { font-size: 0.7rem; color: #666; }

  .message { font-size: 0.85rem; margin-bottom: 0.4rem; color: #ccc; }

  .item-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: #555;
  }

  .small-btn {
    padding: 2px 8px;
    font-size: 0.7rem;
    background: #333;
    border: 1px solid #444;
    color: #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  .refresh-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .loading { padding: 2rem; text-align: center; color: #666; font-size: 0.8rem; }
</style>

