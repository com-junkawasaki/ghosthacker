<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorState } from 'prosemirror-state';
  import { EditorView } from 'prosemirror-view';
  import { Schema, DOMParser } from 'prosemirror-model';
  import { schema } from 'prosemirror-schema-basic';
  import { history, undo, redo } from 'prosemirror-history';
  import { keymap } from 'prosemirror-keymap';
  import { baseKeymap } from 'prosemirror-commands';

  let { filePath = $bindable(""), initialContent = "", onSave = () => {} } = $props<{
    filePath?: string;
    initialContent?: string;
    onSave?: (content: string) => void;
  }>();

  let editorElement = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;
  let emotions = $state({ Calm: 1.0, Joy: 0.2, Sadness: 0.1 });
  let isSaving = $state(false);

  function createEditorState(content: string) {
    const element = document.createElement('div');
    element.innerHTML = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
    
    return EditorState.create({
      schema,
      doc: DOMParser.fromSchema(schema).parse(element),
      plugins: [
        history(),
        keymap({ "Mod-z": undo, "Mod-y": redo }),
        keymap(baseKeymap)
      ]
    });
  }

  onMount(() => {
    if (!editorElement) return;

    const state = createEditorState(initialContent || "Start writing...");

    view = new EditorView(editorElement, {
      state,
      dispatchTransaction(transaction) {
        const newState = view!.state.apply(transaction);
        view!.updateState(newState);
      }
    });
  });

  onDestroy(() => {
    if (view) view.destroy();
  });

  $effect(() => {
    if (view && initialContent !== undefined) {
      const newState = createEditorState(initialContent);
      view.updateState(newState);
    }
  });

  async function handleSave() {
    if (!view) return;
    isSaving = true;
    try {
      const content = view.state.doc.textContent;
      await onSave(content);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="zen-editor-container">
  <div class="editor-header">
    <div class="file-info">
      <span class="icon">📄</span>
      <span class="path">{filePath}</span>
    </div>
    <div class="header-right">
      <div class="emotion-meter">
        {#each Object.entries(emotions) as [name, val]}
          <div class="meter-item">
            <span class="label">{name}</span>
            <div class="bar-bg"><div class="bar" style="width: {val * 100}%"></div></div>
          </div>
        {/each}
      </div>
      <button class="save-btn" onclick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save"}
      </button>
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
  .header-right { display: flex; align-items: center; gap: 1.5rem; }
  
  .save-btn {
    background: #0071e3;
    color: white;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-btn:hover { background: #0077ed; }
  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
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
