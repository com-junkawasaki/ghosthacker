<script lang="ts">
  import { assemblerStore } from '../../lib/stores/assembler.svelte';

  const selected = $derived(assemblerStore.selectedObject);

  function updatePos(axis: 0 | 1 | 2, val: string) {
    if (!selected) return;
    const newPos = [...selected.position] as [number, number, number];
    newPos[axis] = parseFloat(val);
    assemblerStore.updateObject(selected.id, { position: newPos });
  }

  function updateRot(axis: 0 | 1 | 2, val: string) {
    if (!selected) return;
    const newRot = [...selected.rotation] as [number, number, number];
    newRot[axis] = (parseFloat(val) * Math.PI) / 180;
    assemblerStore.updateObject(selected.id, { rotation: newRot });
  }
</script>

<div class="p-4 bg-slate-800 text-white h-full overflow-y-auto">
  <h2 class="text-xl font-bold mb-4">Properties</h2>

  {#if selected}
    <div class="space-y-6">
      <section>
        <h3 class="text-sm font-semibold text-slate-400 mb-2">Selected Object</h3>
        <div class="flex items-center justify-between">
          <span class="text-sm">{selected.name}</span>
          <button 
            class="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
            onclick={() => assemblerStore.removeObject(selected.id)}
          >
            Delete
          </button>
        </div>
      </section>

      <section>
        <h3 class="text-sm font-semibold text-slate-400 mb-2">Position</h3>
        <div class="grid grid-cols-3 gap-2">
          {#each ['X', 'Y', 'Z'] as axis, i}
            <div>
              <label class="text-[10px] block text-slate-500">
                {axis}
                <input
                  type="number"
                  step="0.1"
                  class="w-full bg-slate-700 p-1 text-sm rounded border border-slate-600"
                  value={selected.position[i]}
                  oninput={(e) => updatePos(i as any, (e.target as HTMLInputElement).value)}
                />
              </label>
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3 class="text-sm font-semibold text-slate-400 mb-2">Rotation (Deg)</h3>
        <div class="grid grid-cols-3 gap-2">
          {#each ['X', 'Y', 'Z'] as axis, i}
            <div>
              <label class="text-[10px] block text-slate-500">
                {axis}
                <input
                  type="number"
                  step="1"
                  class="w-full bg-slate-700 p-1 text-sm rounded border border-slate-600"
                  value={(selected.rotation[i] * 180) / Math.PI}
                  oninput={(e) => updateRot(i as any, (e.target as HTMLInputElement).value)}
                />
              </label>
            </div>
          {/each}
        </div>
      </section>
    </div>
  {:else}
    <p class="text-sm text-slate-500 italic">Select an object in the scene to edit its properties.</p>
  {/if}

  <section class="mt-10 pt-6 border-t border-slate-700">
    <h3 class="text-sm font-semibold text-slate-400 mb-2">Camera</h3>
    <div class="space-y-2 text-xs text-slate-300">
      <p>Pos: {assemblerStore.camera.position.map(v => v.toFixed(2)).join(', ')}</p>
      <p>Target: {assemblerStore.camera.target.map(v => v.toFixed(2)).join(', ')}</p>
    </div>
  </section>
</div>
