<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorState } from 'prosemirror-state';
  import { EditorView } from 'prosemirror-view';
  import { Schema, DOMParser } from 'prosemirror-model';
  import { schema } from 'prosemirror-schema-basic';
  import { history, undo, redo } from 'prosemirror-history';
  import { keymap } from 'prosemirror-keymap';
  import { baseKeymap } from 'prosemirror-commands';

  let { filePath = $bindable(""), initialContent = "" } = $props<{
    filePath?: string;
    initialContent?: string;
  }>();

  let editorElement = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;
  let emotions = $state({ Calm: 1.0, Joy: 0.2, Sadness: 0.1 });

  onMount(() => {
    if (!editorElement) return;

    const state = EditorState.create({
      schema,
      plugins: [
        history(),
        keymap({ "Mod-z": undo, "Mod-y": redo }),
        keymap(baseKeymap)
      ]
    });

    view = new EditorView(editorElement, {
      state,
      dispatchTransaction(transaction) {
        const newState = view!.state.apply(transaction);
        view!.updateState(newState);
        // Handle changes here (e.g., real-time emotion analysis trigger)
      }
    });

    console.log("ProseMirror Editor initialized for:", filePath);
  });

  onDestroy(() => {
    if (view) view.destroy();
  });

  $effect(() => {
    if (filePath && view) {
      console.log("Switching to file:", filePath);
      
      // Simulating file load
      const dummyContent = `# ${filePath.split('/').pop()}\n\nThis is the content of the selected node. You can edit this in Zen Mode.`;
      
      const element = document.createElement('div');
      element.innerHTML = `<p>${dummyContent.replace(/\n/g, '</p><p>')}</p>`;
      
      const newState = EditorState.create({
        schema,
        doc: DOMParser.fromSchema(schema).parse(element),
        plugins: view.state.plugins
      });
      
      view.updateState(newState);
    }
  });
</script>

<div class="zen-editor-container">
  <div class="editor-header">
    <div class="file-info">
      <span class="icon">📄</span>
      <span class="path">{filePath || 'Untitled.md'}</span>
    </div>
    <div class="emotion-meter">
      {#each Object.entries(emotions) as [name, val]}
        <div class="meter-item">
          <span class="label">{name}</span>
          <div class="bar-bg"><div class="bar" style="width: {val * 100}%"></div></div>
        </div>
      {/each}
    </div>
  </div>
  
  <div class="prosemirror-wrapper" bind:this={editorElement}></div>
</div>

<style>
  .zen-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    color: #1d1d1f;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1.5rem;
    background: #f5f5f7;
    border-bottom: 1px solid #d2d2d7;
  }

  .file-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #86868b; }
  .path { font-family: monospace; }

  .emotion-meter { display: flex; gap: 1rem; }
  .meter-item { display: flex; align-items: center; gap: 0.5rem; }
  .meter-item .label { font-size: 0.7rem; font-weight: 600; color: #86868b; text-transform: uppercase; }
  .bar-bg { width: 40px; height: 4px; background: #d2d2d7; border-radius: 2px; overflow: hidden; }
  .bar { height: 100%; background: #0071e3; transition: width 0.3s; }

  .prosemirror-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 2rem 4rem;
    font-size: 1.1rem;
    line-height: 1.8;
    outline: none;
  }

  :global(.ProseMirror) {
    min-height: 100%;
    outline: none;
  }

  :global(.ProseMirror p) { margin-bottom: 1.5rem; }
</style>
