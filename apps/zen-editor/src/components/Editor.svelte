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
        
        // Auto-save on every transaction (debounced via effect if needed, but let's do direct for now)
        const content = newState.doc.textContent;
        onSave(content);
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

  // Auto-save logic
  $effect(() => {
    // We can't directly watch ProseMirror state here easily without a store or plugin
    // But we can hook into the dispatchTransaction if we want real-time
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
      <button class="save-btn" onclick={handleSave} disabled={isSaving} style="display: none;">
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
    background: var(--system-background);
    color: var(--system-label);
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: rgba(0,0,0,0.5);
    border-bottom: 1px solid var(--tertiary-label);
  }

  .file-info { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--secondary-label); }
  .path { font-family: "SF Mono", Menlo, monospace; }

  .emotion-meter { display: flex; gap: 12px; }
  .header-right { display: flex; align-items: center; gap: 20px; }
  
  .save-btn {
    background: var(--accent-blue);
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-btn:hover { background: #0077ed; opacity: 0.9; }
  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .meter-item { display: flex; align-items: center; gap: 6px; }
  .meter-item .label { font-size: 0.6rem; font-weight: 700; color: var(--secondary-label); text-transform: uppercase; }
  .bar-bg { width: 30px; height: 3px; background: var(--tertiary-label); border-radius: 2px; overflow: hidden; }
  .bar { height: 100%; background: var(--accent-blue); transition: width 0.3s; }

  .prosemirror-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 40px 60px;
    font-size: 1rem;
    line-height: 1.6;
    outline: none;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  :global(.ProseMirror) {
    min-height: 100%;
    outline: none;
  }

  :global(.ProseMirror p) { margin-bottom: 1.5rem; }
</style>
