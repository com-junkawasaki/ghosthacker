<script lang="ts">
  import { getClient, getAssetUrl } from '../lib/api';
  import { graphStore } from '../lib/stores/graph.svelte';
  import { onMount } from 'svelte';
  import ConnectionSuggester from './ConnectionSuggester.svelte';

  let { node, projectId, onRefresh = () => {} } = $props<{
    node: any;
    projectId: string;
    onRefresh?: () => void;
  }>();

  let activeTab = $state<"profile" | "relations" | "suggestions">("profile");
  let isGenerating = $state(false);
  let genLog = $state("");

  // Find relations involving this node from the store
  let relations = $derived.by(() => {
    const allEdges = graphStore.edges;
    return allEdges.filter((e: any) => e.fromId === node.id || e.toId === node.id)
      .map((e: any) => {
        const otherId = e.fromId === node.id ? e.toId : e.fromId;
        const otherNode = graphStore.nodes.get(otherId);
        return {
          ...e,
          otherNode,
          direction: e.fromId === node.id ? 'out' : 'in'
        };
      });
  });

  async function generatePortrait() {
    isGenerating = true;
    genLog = "Generating portrait using AI...";
    try {
      const client = await getClient();
      if (!client) return;

      // Mock tool call for portrait generation
      // In reality, this might call a tool that uses DALL-E or Midjourney via MCP
      const result = await client.callTool({
        name: "generate_node",
        argumentsJson: JSON.stringify({
          context_paths: [node.id],
          new_path: `assets/portraits/${node.label.toLowerCase().replace(/\s+/g, '_')}.webp`,
          project_id: projectId
        })
      });

      if (result.isError) {
        genLog = `Error: ${result.resultJson}`;
      } else {
        genLog = "Portrait generated and saved to assets!";
        onRefresh();
      }
    } catch (err: any) {
      genLog = `Failed: ${err.message}`;
    } finally {
      isGenerating = false;
    }
  }

  async function generateHistory() {
    isGenerating = true;
    genLog = "Writing character history...";
    try {
      const client = await getClient();
      if (!client) return;

      const result = await client.callTool({
        name: "generate_node",
        argumentsJson: JSON.stringify({
          context_paths: [node.id],
          new_path: `wattpad/history/${node.label.toLowerCase().replace(/\s+/g, '_')}_bio.md`,
          project_id: projectId
        })
      });

      if (result.isError) {
        genLog = `Error: ${result.resultJson}`;
      } else {
        genLog = "Character history generated and added to world graph!";
        onRefresh();
      }
    } catch (err: any) {
      genLog = `Failed: ${err.message}`;
    } finally {
      isGenerating = false;
    }
  }
</script>

<div class="entity-profile">
  <header class="profile-header">
    <div class="avatar-container">
      {#if node.id.includes('tamaki')}
        <img src={getAssetUrl(`/data/251022/assets/portraits/tamaki.webp`)} alt={node.label} onerror={(e) => (e.currentTarget as HTMLImageElement).style.display='none'} />
      {:else}
        <div class="avatar-placeholder">👤</div>
      {/if}
    </div>
    <div class="header-info">
      <h2>{node.label}</h2>
      <span class="type-tag">{node.type.split(':').pop()}</span>
    </div>
  </header>

  <nav class="profile-tabs">
    <button class:active={activeTab === 'profile'} onclick={() => activeTab = 'profile'}>Profile</button>
    <button class:active={activeTab === 'relations'} onclick={() => activeTab = 'relations'}>
      Relations ({relations.length})
    </button>
    <button class:active={activeTab === 'suggestions'} onclick={() => activeTab = 'suggestions'}>AI Suggestions</button>
  </nav>

  <div class="tab-content">
    {#if activeTab === 'profile'}
      <section class="section">
        <h3>Description</h3>
        <p class="description">{node.content || 'No detailed description available.'}</p>
      </section>

      <section class="section">
        <h3>World Building Actions</h3>
        <div class="action-grid">
          <button class="action-btn" onclick={generatePortrait} disabled={isGenerating}>
            🖼️ Generate Portrait
          </button>
          <button class="action-btn" onclick={generateHistory} disabled={isGenerating}>
            📜 Generate History
          </button>
        </div>
        {#if genLog}
          <div class="gen-log">{genLog}</div>
        {/if}
      </section>

    {:else if activeTab === 'relations'}
      <section class="section">
        <h3>Connections</h3>
        <div class="relation-list">
          {#each relations as rel}
            <div class="relation-item">
              <div class="rel-info">
                <span class="rel-label">{rel.relation}</span>
                <span class="rel-target">{rel.otherNode?.label || rel.otherId}</span>
              </div>
              <div class="rel-meta">
                <span class="direction-icon">{rel.direction === 'out' ? '→' : '←'}</span>
                <span class="group-tag">{rel.group}</span>
              </div>
            </div>
          {:else}
            <p class="empty-msg">No relations defined yet.</p>
          {/each}
        </div>
      </section>

    {:else if activeTab === 'suggestions'}
      <ConnectionSuggester {node} {projectId} onConnect={() => onRefresh()} />
    {/if}
  </div>
</div>

<style>
  .entity-profile {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0a0a0f;
    color: white;
    overflow: hidden;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    background: linear-gradient(180deg, rgba(255,59,48,0.1) 0%, rgba(10,10,15,0) 100%);
  }

  .avatar-container {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    background: #1a1a25;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 2px solid rgba(255, 59, 48, 0.3);
  }

  .avatar-container img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-placeholder { font-size: 2.5rem; }

  .header-info h2 { margin: 0; font-size: 1.5rem; }
  .type-tag {
    font-size: 0.7rem;
    padding: 2px 8px;
    background: rgba(255, 59, 48, 0.2);
    color: #ff3b30;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .profile-tabs {
    display: flex;
    padding: 0 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    gap: 1rem;
  }

  .profile-tabs button {
    padding: 0.8rem 0.5rem;
    background: transparent;
    border: none;
    color: #666;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .profile-tabs button.active {
    color: #fff;
    border-bottom-color: #ff3b30;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .section { margin-bottom: 2rem; }
  .section h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 1rem;
    letter-spacing: 0.1em;
  }

  .description {
    line-height: 1.6;
    color: #ccc;
    font-size: 0.95rem;
    white-space: pre-wrap;
  }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .action-btn {
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #eee;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: #ff3b30;
  }

  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .gen-log {
    margin-top: 1rem;
    padding: 0.8rem;
    background: rgba(0, 113, 227, 0.1);
    border-radius: 8px;
    font-size: 0.8rem;
    color: #0071e3;
    font-family: monospace;
  }

  .relation-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .relation-item {
    background: rgba(255, 255, 255, 0.03);
    padding: 1rem;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rel-info { display: flex; flex-direction: column; }
  .rel-label { font-size: 0.7rem; color: #ff3b30; font-weight: 700; text-transform: uppercase; }
  .rel-target { font-size: 1rem; font-weight: 500; }

  .rel-meta { display: flex; align-items: center; gap: 0.8rem; }
  .direction-icon { font-size: 1.2rem; color: #444; }
  .group-tag {
    font-size: 0.6rem;
    padding: 2px 6px;
    background: #222;
    color: #888;
    border-radius: 4px;
  }

  .empty-msg { color: #444; font-style: italic; text-align: center; padding: 2rem; }
</style>

