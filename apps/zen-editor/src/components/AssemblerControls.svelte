<script lang="ts">
  import { graphStore } from '../lib/stores/graph.svelte';

  const selectedNode = $derived(graphStore.nodes.get(graphStore.selectedNodeId || ''));

  function updatePos(axis: 0 | 1 | 2, val: string) {
    if (!selectedNode) return;
    const currentPos = selectedNode.position3d || [0, 0, 0];
    const newPos = [...currentPos] as [number, number, number];
    newPos[axis] = parseFloat(val);
    graphStore.updateNode3d(selectedNode.id, { position3d: newPos });
  }

  function updateRot(axis: 0 | 1 | 2, val: string) {
    if (!selectedNode) return;
    const currentRot = selectedNode.rotation3d || [0, 0, 0];
    const newRot = [...currentRot] as [number, number, number];
    newRot[axis] = (parseFloat(val) * Math.PI) / 180;
    graphStore.updateNode3d(selectedNode.id, { rotation3d: newRot });
  }

  function updateScale(axis: 0 | 1 | 2, val: string) {
    if (!selectedNode) return;
    const currentScale = selectedNode.scale3d || [1, 1, 1];
    const newScale = [...currentScale] as [number, number, number];
    newScale[axis] = parseFloat(val);
    graphStore.updateNode3d(selectedNode.id, { scale3d: newScale });
  }

  function updateGltf(val: string) {
    if (!selectedNode) return;
    graphStore.updateNode3d(selectedNode.id, { gltfPath: val } as any);
  }
</script>

<div class="p-4 bg-slate-800 text-white h-full overflow-y-auto">
  <h2 class="text-xl font-bold mb-4">3D Properties</h2>

  {#if selectedNode}
    <div class="space-y-6">
      <section>
        <h3 class="text-sm font-semibold text-slate-400 mb-2">Selected Node</h3>
        <div class="flex items-center justify-between">
          <span class="text-sm">{selectedNode.label}</span>
          <span class="text-xs text-slate-500">{selectedNode.type}</span>
        </div>
      </section>

      <section>
        <h3 class="text-sm font-semibold text-slate-400 mb-2">GLTF Path</h3>
        <input
          type="text"
          class="w-full bg-slate-700 p-1 text-sm rounded border border-slate-600"
          value={selectedNode.gltfPath || ''}
          placeholder="/assets/props/model.glb"
          onchange={(e) => updateGltf((e.target as HTMLInputElement).value)}
        />
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
                  value={selectedNode.position3d?.[i] || 0}
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
                  value={((selectedNode.rotation3d?.[i] || 0) * 180) / Math.PI}
                  oninput={(e) => updateRot(i as any, (e.target as HTMLInputElement).value)}
                />
              </label>
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3 class="text-sm font-semibold text-slate-400 mb-2">Scale</h3>
        <div class="grid grid-cols-3 gap-2">
          {#each ['X', 'Y', 'Z'] as axis, i}
            <div>
              <label class="text-[10px] block text-slate-500">
                {axis}
                <input
                  type="number"
                  step="0.1"
                  class="w-full bg-slate-700 p-1 text-sm rounded border border-slate-600"
                  value={selectedNode.scale3d?.[i] || 1}
                  oninput={(e) => updateScale(i as any, (e.target as HTMLInputElement).value)}
                />
              </label>
            </div>
          {/each}
        </div>
      </section>
    </div>
  {:else}
    <p class="text-sm text-slate-500 italic">Select a node in the graph to edit its 3D properties.</p>
  {/if}
</div>
