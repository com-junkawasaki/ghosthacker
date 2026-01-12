<script lang="ts">
  import { graphStore, type Node } from '../lib/stores/graph.svelte';
  import { getClient } from '../lib/api';

  let { manuscriptId, projectId } = $props<{ manuscriptId: string; projectId: string }>();

  let blocks = $derived(
    Array.from(graphStore.nodes.values())
      .filter(n => {
        // Find blocks that are part of this manuscript
        return graphStore.edges.some(e => e.fromId === manuscriptId && e.toId === n.id && e.relation === 'gh:contains');
      })
      .sort((a, b) => {
        // Sort by block ID or index if available
        return a.id.localeCompare(b.id);
      })
  );

  let isSaving = $state(false);

  async function handleSave() {
    isSaving = true;
    try {
      const client = await getClient();
      if (!client) return;

      // Prepare blocks for saving
      const saveBlocks = blocks.map(b => ({
        id: b.id,
        content: b.content,
        type: b.type,
        group: b.group,
        localizedContent: b.localizedContent
      }));

      await client.saveManuscript({
        projectId,
        manuscriptId,
        blocks: saveBlocks
      });
      alert("Translation saved successfully");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed");
    } finally {
      isSaving = false;
    }
  }

  function updateBlock(id: string, lang: string, value: string) {
    const node = graphStore.nodes.get(id);
    if (node) {
      if (!node.localizedContent) node.localizedContent = {};
      node.localizedContent[lang] = value;
      // Also update generic content if ja is updated
      if (lang === 'ja') node.content = value;
      else if (lang === 'en' && !node.localizedContent['ja']) node.content = value;
    }
  }
</script>

<div class="translation-viewer">
  <header class="viewer-header">
    <h3>Translation Editor: {manuscriptId.split(':').pop()}</h3>
    <button class="save-btn" onclick={handleSave} disabled={isSaving}>
      {isSaving ? 'Saving...' : 'Save All Blocks'}
    </button>
  </header>

  <div class="blocks-container">
    <div class="lang-headers">
      <div class="header-ja">Japanese (Source)</div>
      <div class="header-en">English (Target)</div>
    </div>

    {#each blocks as block (block.id)}
      <div class="block-row">
        <div class="block-col ja">
          <textarea 
            value={block.localizedContent?.ja || ''} 
            oninput={(e) => updateBlock(block.id, 'ja', e.currentTarget.value)}
            placeholder="日本語原文..."
          ></textarea>
        </div>
        <div class="block-col en">
          <textarea 
            value={block.localizedContent?.en || ''} 
            oninput={(e) => updateBlock(block.id, 'en', e.currentTarget.value)}
            placeholder="English translation..."
          ></textarea>
        </div>
      </div>
    {/each}

    {#if blocks.length === 0}
      <div class="empty-state">
        No blocks found. Try expanding the manuscript in the sidebar first.
      </div>
    {/if}
  </div>
</div>

<style>
  .translation-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1c1c1e;
    color: #f5f5f7;
  }

  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #333;
  }

  .save-btn {
    background: #0071e3;
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
  }

  .save-btn:disabled {
    opacity: 0.5;
  }

  .blocks-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .lang-headers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #8e8e93;
    font-weight: 600;
  }

  .block-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #2c2c2e;
  }

  .block-col textarea {
    width: 100%;
    min-height: 100px;
    background: #2c2c2e;
    color: #f5f5f7;
    border: 1px solid #3a3a3c;
    border-radius: 8px;
    padding: 12px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
  }

  .block-col textarea:focus {
    outline: none;
    border-color: #0071e3;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #8e8e93;
  }
</style>

