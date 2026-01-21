<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
  import { OrbitControls, ContactShadows, Grid, GLTF } from '@threlte/extras';
  import * as THREE from 'three';
  import { assemblerStore } from '../../lib/stores/assembler.svelte';

  let controlsRef = $state<any>(null);
</script>

<T.PerspectiveCamera
  makeDefault
  position={assemblerStore.camera.position}
  fov={assemblerStore.camera.fov}
>
  <OrbitControls
    bind:ref={controlsRef}
    enableDamping
    target={assemblerStore.camera.target}
    onchange={() => {
      if (controlsRef) {
        const cam = controlsRef.object;
        assemblerStore.updateCamera({
          position: [cam.position.x, cam.position.y, cam.position.z],
          target: [controlsRef.target.x, controlsRef.target.y, controlsRef.target.z]
        });
      }
    }}
  />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.5} />
<T.DirectionalLight position={[10, 10, 5]} intensity={1} castShadow />

<Grid
  sectionSize={1}
  sectionThickness={1}
  cellSize={0.5}
  cellThickness={0.5}
  infiniteGrid
  plane="xz"
/>

<ContactShadows
  scale={10}
  blur={2}
  far={2.5}
  opacity={0.5}
/>

{#each assemblerStore.objects as obj (obj.id)}
  <T.Group
    position={obj.position}
    rotation={obj.rotation}
    scale={obj.scale}
  >
    {#if obj.gltfPath}
      <GLTF
        url={obj.gltfPath}
        castShadow
        receiveShadow
        onclick={(e: any) => {
          e.stopPropagation();
          assemblerStore.selectObject(obj.id);
        }}
      />
    {:else}
      <!-- Fallback cube if no GLTF is provided yet -->
      <T.Mesh
        onclick={(e: any) => {
          e.stopPropagation();
          assemblerStore.selectObject(obj.id);
        }}
      >
        <T.BoxGeometry args={[1, 1, 1]} />
        <T.MeshStandardMaterial color={assemblerStore.selectedObjectId === obj.id ? '#ff3e00' : '#888888'} />
      </T.Mesh>
    {/if}
  </T.Group>
{/each}
