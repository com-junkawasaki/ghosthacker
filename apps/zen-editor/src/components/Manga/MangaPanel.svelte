<script lang="ts">
  import { type MangaPanel, graphStore } from '../../lib/stores/graph.svelte';
  import { getAssetUrl } from '../../lib/api';

  let { panel, pageId } = $props<{ panel: MangaPanel, pageId: string }>();

  let isOver = $state(false);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    isOver = true;
  }

  function handleDragLeave() {
    isOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isOver = false;
    const data = e.dataTransfer?.getData('application/json');
    if (data) {
      try {
        const payload = JSON.parse(data);
        if (payload.type === 'storyboard-scene') {
          // Assign visual description as a placeholder or use a real image if available
          // In this demo, we use the visual text as a prompt/reference
          graphStore.updateMangaPanel(pageId, panel.panelId, {
            imagePath: payload.image || "", // Use actual image if it exists
            visual: payload.visual || panel.visual
          });
        }
      } catch (err) {
        console.error("Failed to parse drop data:", err);
      }
    }
  }

  function updateDialogue(idx: number, text: string) {
    const newDialogues = [...panel.dialogue];
    newDialogues[idx].text = text;
    graphStore.updateMangaPanel(pageId, panel.panelId, { dialogue: newDialogues });
  }

  function handleBubbleMouseDown(idx: number, e: MouseEvent) {
    const bubble = e.currentTarget as HTMLDivElement;
    const rect = bubble.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      
      const newDialogues = [...panel.dialogue];
      newDialogues[idx].x = Math.max(0, Math.min(100, x));
      newDialogues[idx].y = Math.max(0, Math.min(100, y));
      graphStore.updateMangaPanel(pageId, panel.panelId, { dialogue: newDialogues });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

<div 
  class="manga-panel" 
  class:is-over={isOver}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="Manga Panel"
>
  <div class="panel-content">
    {#if panel.imagePath}
      <img src={getAssetUrl(panel.imagePath)} alt={panel.visual} class="panel-image" />
    {:else}
      <div class="panel-placeholder">
        <span class="visual-desc">{panel.visual}</span>
        <span class="drop-hint">Drop Storyboard Scene Here</span>
      </div>
    {/if}

    <div class="dialogue-layer">
      {#each panel.dialogue as d, i}
        <div 
          class="speech-bubble {d.type}" 
          style="left: {d.x}%; top: {d.y}%; transform: translate(-50%, -50%);"
          contenteditable="true"
          onmousedown={(e) => handleBubbleMouseDown(i, e)}
          onblur={(e) => updateDialogue(i, (e.currentTarget as HTMLDivElement).innerText)}
          role="textbox"
          tabindex="0"
        >
          {d.text}
        </div>
      {/each}
    </div>
  </div>
  
  <div class="panel-footer">
    Panel {panel.panelId}
  </div>
</div>

<style>
  .manga-panel {
    border: 2px solid #000;
    background: #fff;
    position: relative;
    min-height: 200px;
    margin-bottom: 1rem;
    transition: all 0.2s;
    overflow: hidden;
  }

  .manga-panel.is-over {
    border-color: #0071e3;
    background: #f0f7ff;
    transform: scale(1.01);
  }

  .panel-content {
    position: relative;
    width: 100%;
    height: 100%;
    aspect-ratio: 4/3;
  }

  .panel-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .panel-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #888;
    text-align: center;
    background: #fafafa;
  }

  .visual-desc {
    font-size: 0.8rem;
    font-style: italic;
    margin-bottom: 1rem;
  }

  .drop-hint {
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    color: #0071e3;
  }

  .dialogue-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .speech-bubble {
    position: absolute;
    pointer-events: auto;
    background: #fff;
    border: 2px solid #000;
    padding: 0.5rem 1rem;
    border-radius: 50%;
    min-width: 60px;
    max-width: 150px;
    font-size: 0.8rem;
    color: #000;
    text-align: center;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    cursor: text;
  }

  .speech-bubble.thought {
    border-style: dotted;
    border-radius: 20px;
  }

  .speech-bubble.shout {
    font-weight: bold;
    border-width: 3px;
    /* In a real app we'd use a SVG filter for jagged edges */
  }

  .panel-footer {
    background: #000;
    color: #fff;
    font-size: 0.6rem;
    padding: 2px 6px;
    position: absolute;
    bottom: 0;
    right: 0;
  }
</style>
