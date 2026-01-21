<script lang="ts">
  import { graphStore } from '../lib/stores/graph.svelte';
  import { onMount } from 'svelte';

  let { projectId, onSelectFile } = $props<{
    projectId: string;
    onSelectFile: (path: string) => void;
  }>();

  onMount(() => {
    graphStore.fetchProjectMetadata(projectId);
  });

  function getFileName(path: string) {
    return path.split('/').pop();
  }

  function getDirName(path: string) {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  }

  let filesByDir = $derived.by(() => {
    const map = new Map<string, string[]>();
    if (!graphStore.projectMetadata?.episodes) return map;
    
    graphStore.projectMetadata.episodes.forEach((ep: any) => {
      ep.files.forEach((f: string) => {
        const dir = getDirName(f) || '/';
        if (!map.has(dir)) map.set(dir, []);
        map.get(dir)!.push(f);
      });
    });
    return map;
  });

  let sortedDirs = $derived(Array.from(filesByDir.keys()).sort());
</script>

<div class="file-explorer">
  <div class="explorer-header">
    <span>Project Files</span>
    <button onclick={() => graphStore.fetchProjectMetadata(projectId)}>🔄</button>
  </div>
  
  <div class="dir-list">
    {#each sortedDirs as dir}
      <div class="dir-group">
        <div class="dir-name">{dir}</div>
        <div class="file-list">
          {#each filesByDir.get(dir)! as file}
            <button class="file-item" onclick={() => onSelectFile(file)}>
              <span class="icon">📄</span>
              <span class="name">{getFileName(file)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .file-explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #05050a;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    width: 240px;
  }

  .explorer-header {
    padding: 0.8rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #666;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .dir-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .dir-group {
    margin-bottom: 1rem;
  }

  .dir-name {
    font-size: 0.65rem;
    font-weight: 600;
    color: #444;
    padding: 0.2rem 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .file-list {
    display: flex;
    flex-direction: column;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .file-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  .icon { font-size: 0.9rem; opacity: 0.5; }
</style>
