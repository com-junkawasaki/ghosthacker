<script lang="ts">
  import { assemblerStore } from '../../lib/stores/assembler.svelte';

  const assets = [
    { type: 'gh:prop/okamura-cruise-atlas', name: 'Okamura Cruise & Atlas', gltf: '/assets/props/okamura_cruise.glb' },
    { type: 'gh:prop/usm-haller', name: 'USM Haller', gltf: '/assets/props/usm_haller.glb' },
    { type: 'gh:character/ren', name: 'Ren Numano', gltf: '/assets/characters/ren.glb' },
    { type: 'gh:character/nei', name: 'Nei (Android)', gltf: '/assets/characters/nei.glb' },
    { type: 'gh:prop/chair-generic', name: 'Generic Chair', gltf: '' },
    { type: 'gh:prop/desk-generic', name: 'Generic Desk', gltf: '' }
  ];

  function addAsset(asset: typeof assets[0]) {
    assemblerStore.addObject(asset.type, asset.name, asset.gltf || undefined);
  }
</script>

<div class="p-4 bg-slate-800 text-white h-full overflow-y-auto">
  <h2 class="text-xl font-bold mb-4">Asset Library</h2>
  
  <div class="space-y-4">
    <section>
      <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Furniture</h3>
      <div class="grid grid-cols-1 gap-2">
        {#each assets.filter(a => a.type.startsWith('gh:prop')) as asset}
          <button
            class="p-2 bg-slate-700 hover:bg-slate-600 rounded text-left text-sm transition-colors"
            onclick={() => addAsset(asset)}
          >
            {asset.name}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Characters</h3>
      <div class="grid grid-cols-1 gap-2">
        {#each assets.filter(a => a.type.startsWith('gh:character')) as asset}
          <button
            class="p-2 bg-slate-700 hover:bg-slate-600 rounded text-left text-sm transition-colors"
            onclick={() => addAsset(asset)}
          >
            {asset.name}
          </button>
        {/each}
      </div>
    </section>
  </div>
</div>
