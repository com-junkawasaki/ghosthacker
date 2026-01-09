<script lang="ts">
  import { onMount } from 'svelte';

  let { filePath = $bindable(""), initialContent = "" } = $props();

  let emotions = $state({ Calm: 1.0, Joy: 0.2, Sadness: 0.1 });
  let content = $state("");
  let isDirty = $state(false);

  onMount(() => {
    console.log("Editor mounted");
  });
</script>

<div class="zen-editor-container">
  <div>Editor (DEBUG)</div>
  <textarea bind:value={content}></textarea>
</div>

<style>
  .zen-editor-container { background: #fff; color: #000; width: 100%; height: 100%; }
  textarea { width: 100%; height: 100%; }
</style>
