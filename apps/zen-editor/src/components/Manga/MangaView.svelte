<script lang="ts">
  import { onMount } from 'svelte';
  import { graphStore } from '../../lib/stores/graph.svelte';
  import MangaPanel from './MangaPanel.svelte';

  let { projectId } = $props<{ projectId: string }>();

  $effect(() => {
    if (projectId) {
      graphStore.loadMangaScript(projectId);
    }
  });

  async function saveManga() {
    await graphStore.saveMangaScript();
    alert("Manga script and layout saved!");
  }
</script>

<div class="manga-view-container">
  <header class="manga-header">
    <div class="manga-info">
      <h2>Manga View</h2>
      <span class="page-count">{graphStore.mangaPages.length} Pages</span>
    </div>
    <div class="actions">
      <button class="save-btn" onclick={saveManga}>Save Layout</button>
    </div>
  </header>

  <div class="manga-canvas">
    {#each graphStore.mangaPages as page (page.id)}
      <section class="manga-page" id={page.id}>
        <div class="page-header">
          <span class="page-num">Page {page.pageNumber}</span>
          {#if page.type}
            <span class="page-type">{page.type}</span>
          {/if}
        </div>
        
        <div class="panels-container">
          {#each page.panels as panel (panel.id)}
            <MangaPanel {panel} pageId={page.id} />
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>

<style>
  .manga-view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1a1a1a;
    color: #eee;
  }

  .manga-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #000;
    border-bottom: 1px solid #333;
  }

  .manga-header h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .page-count {
    font-size: 0.8rem;
    color: #888;
  }

  .save-btn {
    background: #34c759;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .manga-canvas {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3rem;
  }

  .manga-page {
    width: 100%;
    max-width: 800px;
    background: #fff;
    color: #000;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    padding: 2rem;
    border-radius: 4px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
  }

  .page-num {
    font-weight: bold;
    font-size: 0.9rem;
  }

  .page-type {
    font-size: 0.7rem;
    color: #888;
    text-transform: uppercase;
  }

  .panels-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
