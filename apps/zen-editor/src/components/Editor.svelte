<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorState } from 'prosemirror-state';
  import { EditorView } from 'prosemirror-view';
  import { Schema, DOMParser } from 'prosemirror-model';
  import { schema } from 'prosemirror-schema-basic';
  import { baseKeymap } from 'prosemirror-commands';
  import { keymap } from 'prosemirror-keymap';
  import { history, undo, redo } from 'prosemirror-history';

  let editorElement: HTMLDivElement;
  let view: EditorView;

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
        // Here we can trigger the AI analysis or graph update
      }
    });
  });

  onDestroy(() => {
    if (view) view.destroy();
  });
</script>

<div class="zen-editor-container">
  <div bind:this={editorElement} class="prosemirror-editor"></div>
</div>

<style>
  .zen-editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    padding: 2rem;
    background: #fafafa;
  }

  .prosemirror-editor {
    width: 100%;
    max-width: 800px;
    min-height: 500px;
    background: white;
    padding: 3rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    outline: none;
    font-family: 'Georgia', serif;
    line-height: 1.6;
    font-size: 1.1rem;
  }

  :global(.ProseMirror) {
    outline: none;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>

