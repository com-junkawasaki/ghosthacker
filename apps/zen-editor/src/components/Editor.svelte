<script lang="ts">
  import { onMount } from 'svelte';
  import { client } from '../lib/api';

  let emotions = $state({ Calm: 1.0, Joy: 0.2, Sadness: 0.1 });
  let content = $state("");
  let currentFilePath = $state("");

  let backgroundColor = $derived.by(() => {
    if (emotions.Joy > 0.5) return 'rgba(255, 250, 230, 0.5)';
    if (emotions.Sadness > 0.5) return 'rgba(230, 240, 255, 0.5)';
    return 'rgba(250, 250, 250, 1.0)';
  });

  async function handleOpen() {
    const path = prompt("Enter file path to open (relative to project root):", "251121/README.md");
    if (path) {
      try {
        const resp = await client.openFile({ path });
        content = resp.content;
        currentFilePath = path;
      } catch (err) {
        console.error("Failed to open file:", err);
        alert("Failed to open file. Check console.");
      }
    }
  }

  async function handleSave() {
    if (!currentFilePath) {
      currentFilePath = prompt("Enter save path:", "251121/README_updated.md") || "";
    }
    if (currentFilePath) {
      try {
        const resp = await client.saveFile({ path: currentFilePath, content });
        if (resp.success) {
          alert("File saved successfully!");
        }
      } catch (err) {
        console.error("Failed to save file:", err);
        alert("Failed to save file. Check console.");
      }
    }
  }
</script>

<div class="zen-editor-container" style="background: {backgroundColor};">
  <div class="toolbar">
    <button on:click={handleOpen}>Open</button>
    <button on:click={handleSave}>Save</button>
    <span class="file-path">{currentFilePath || 'No file open'}</span>
  </div>

  <textarea 
    class="zen-textarea" 
    placeholder="Write your story here..."
    bind:value={content}
  ></textarea>

  <div class="emotion-indicator">
    {#each Object.entries(emotions) as [name, score]}
      <div class="emotion-tag">
        <span class="dot" style="opacity: {score};"></span>
        {name}
      </div>
    {/each}
  </div>
</div>

<style>
  .zen-editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    transition: background 2s ease-in-out;
  }

  .toolbar {
    width: 100%;
    max-width: 700px;
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: center;
  }

  .toolbar button {
    padding: 0.4rem 1rem;
    border-radius: 6px;
    border: 1px solid #d2d2d7;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .file-path {
    font-size: 0.8rem;
    color: #86868b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .zen-textarea {
    width: 100%;
    max-width: 700px;
    min-height: 60vh;
    background: transparent;
    border: none;
    padding: 1rem;
    outline: none;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", serif;
    line-height: 1.8;
    font-size: 1.2rem;
    color: #1d1d1f;
    resize: none;
  }

  .emotion-indicator {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .emotion-tag {
    font-size: 0.8rem;
    color: #86868b;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: #0071e3;
    border-radius: 50%;
  }
</style>
