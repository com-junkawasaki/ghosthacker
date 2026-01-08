<script lang="ts">
  import { onMount, watch } from 'svelte';
  import { client } from '../lib/api';

  let { filePath = $bindable("") } = $props();

  let emotions = $state({ Calm: 1.0, Joy: 0.2, Sadness: 0.1 });
  let content = $state("");
  let isDirty = $state(false);

  // Watch for filePath changes to load the file
  $effect(() => {
    if (filePath) {
      loadFile(filePath);
    }
  });

  async function loadFile(path: string) {
    try {
      const resp = await client.openFile({ path });
      content = resp.content;
      isDirty = false;
    } catch (err) {
      console.error("Failed to open file:", err);
      alert("Failed to open file: " + path);
    }
  }

  let backgroundColor = $derived.by(() => {
    if (emotions.Joy > 0.5) return 'rgba(255, 250, 230, 0.4)';
    if (emotions.Sadness > 0.5) return 'rgba(230, 240, 255, 0.4)';
    return '#ffffff';
  });

  async function handleSave() {
    if (!filePath) {
      filePath = prompt("Enter save path:", "251022/new_part.md") || "";
    }
    if (filePath) {
      try {
        const resp = await client.saveFile({ path: filePath, content });
        if (resp.success) {
          isDirty = false;
          // Trigger AI analysis in background
          triggerAnalysis();
        }
      } catch (err) {
        console.error("Failed to save file:", err);
      }
    }
  }

  async function triggerAnalysis() {
    try {
      const resp = await client.analyzeText({ text: content });
      console.log("Analysis result:", resp);
      // In a real scenario, we'd update emotions from actual Hume results
    } catch (err) {
      console.error("Analysis failed:", err);
    }
  }

  function handleInput() {
    isDirty = true;
  }
</script>

<div class="zen-editor-container" style="background: {backgroundColor};">
  <div class="toolbar">
    <div class="file-info">
      <span class="file-path">{filePath || 'Untitled'}</span>
      {#if isDirty}<span class="dirty-dot"></span>{/if}
    </div>
    <div class="actions">
      <button class="save-btn" onclick={handleSave} disabled={!isDirty && filePath !== ""}>
        {isDirty ? 'Save Changes' : 'Saved'}
      </button>
    </div>
  </div>

  <div class="editor-wrapper">
    <textarea
      class="zen-textarea"
      placeholder="Start writing the next chapter of Ghost Hacker..."
      bind:value={content}
      oninput={handleInput}
    ></textarea>
  </div>

  <div class="emotion-indicator">
    {#each Object.entries(emotions) as [name, score]}
      <div class="emotion-tag">
        <span class="dot" style="opacity: {score}; background: {name === 'Joy' ? '#ffcc00' : name === 'Sadness' ? '#0071e3' : '#86868b'};"></span>
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
    padding: 0;
    transition: background 1.5s ease-in-out;
  }

  .toolbar {
    width: 100%;
    height: 60px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    z-index: 10;
  }

  .file-info { display: flex; align-items: center; gap: 0.5rem; }
  .file-path { font-size: 0.8rem; font-weight: 500; color: #86868b; }
  .dirty-dot { width: 6px; height: 6px; background: #ff3b30; border-radius: 50%; }

  .save-btn {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    border: none;
    background: #0071e3;
    color: white;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .save-btn:disabled { background: #f5f5f7; color: #d2d2d7; cursor: default; }

  .editor-wrapper {
    width: 100%;
    flex: 1;
    display: flex;
    justify-content: center;
    overflow-y: auto;
    padding-top: 4rem;
  }

  .zen-textarea {
    width: 100%;
    max-width: 720px;
    height: fit-content;
    min-height: 80vh;
    background: transparent;
    border: none;
    padding: 2rem;
    outline: none;
    font-family: "Georgia", serif;
    line-height: 2;
    font-size: 1.25rem;
    color: #1d1d1f;
    resize: none;
  }

  .emotion-indicator {
    position: absolute;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    gap: 1.2rem;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    padding: 0.6rem 1.2rem;
    border-radius: 30px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .emotion-tag {
    font-size: 0.75rem;
    font-weight: 600;
    color: #424245;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
</style>
