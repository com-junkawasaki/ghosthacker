<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorState } from 'prosemirror-state';
  import { EditorView } from 'prosemirror-view';
  import { Schema, DOMParser } from 'prosemirror-model';
  import { schema } from 'prosemirror-schema-basic';
  import { baseKeymap } from 'prosemirror-commands';
  import { keymap } from 'prosemirror-keymap';
  import { history, undo, redo } from 'prosemirror-history';
  import { client } from '$lib/api';

  let editorElement: HTMLDivElement;
  let view: EditorView;
  let debounceTimer: ReturnType<typeof setTimeout>;
  let emotions: Record<string, number> = { Calm: 1.0 };

  function getBackgroundColor(emo: Record<string, number>) {
    if (emo.Joy > 0.5) return 'rgba(255, 250, 230, 0.5)';
    if (emo.Sadness > 0.5) return 'rgba(230, 240, 255, 0.5)';
    return 'rgba(250, 250, 250, 1.0)';
  }

  async function handleUpdate(content: string) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      // Analyze text via gRPC client
      const result: any = await client.analyzeText(content);
      if (result && result.emotions) {
        emotions = result.emotions;
      }
    }, 1500);
  }

  onMount(() => {
    const state = EditorState.create({
      schema,
      plugins: [
        history(),
        keymap({ ...baseKeymap, 'Mod-z': undo, 'Mod-y': redo }),
      ]
    });

    view = new EditorView(editorElement, {
      state,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        
        if (transaction.docChanged) {
          handleUpdate(newState.doc.textContent);
        }
      }
    });
  });

  onDestroy(() => {
    if (view) view.destroy();
  });
</script>

<div class="zen-editor-container" style="background: {getBackgroundColor(emotions)};">
  <div bind:this={editorElement} class="prosemirror-editor"></div>

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
    padding: 4rem 2rem;
    transition: background 2s ease-in-out;
  }

  .prosemirror-editor {
    width: 100%;
    max-width: 700px;
    min-height: 60vh;
    background: transparent;
    padding: 1rem;
    outline: none;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", serif;
    line-height: 1.8;
    font-size: 1.2rem;
    color: #1d1d1f;
    letter-spacing: -0.01em;
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

  :global(.ProseMirror) {
    outline: none;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>

  :global(.ProseMirror) {
    outline: none;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>

