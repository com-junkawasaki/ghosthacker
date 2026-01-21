<script lang="ts">
  import { Canvas } from '@threlte/core';
  import SceneView from '../../components/Assembler/SceneView.svelte';
  import AssetLibrary from '../../components/Assembler/AssetLibrary.svelte';
  import ControlPanel from '../../components/Assembler/ControlPanel.svelte';
  import { assemblerStore } from '../../lib/stores/assembler.svelte';
</script>

<div class="flex h-screen w-screen overflow-hidden bg-slate-900">
  <!-- Left Sidebar: Library -->
  <div class="w-64 border-r border-slate-700">
    <AssetLibrary />
  </div>

  <!-- Center: 3D Viewport -->
  <div class="flex-1 relative">
    <Canvas>
      <SceneView />
    </Canvas>

    <div class="absolute top-4 left-4 bg-slate-900/80 p-2 rounded border border-slate-700 text-white text-xs">
      <h1 class="font-bold">Ghost Hacker 3D Assembler</h1>
      <p class="text-slate-400">Assemble scenes and set camera angles</p>
    </div>

    <div class="absolute bottom-4 left-4 flex gap-2">
       <button 
        class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs"
        onclick={() => console.log('Current Scene:', $state.snapshot(assemblerStore.objects))}
      >
        Export Scene JSON
      </button>
       <button 
        class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs"
        onclick={() => assemblerStore.clearScene()}
      >
        Clear Scene
      </button>
    </div>
  </div>

  <!-- Right Sidebar: Controls -->
  <div class="w-80 border-l border-slate-700">
    <ControlPanel />
  </div>
</div>
