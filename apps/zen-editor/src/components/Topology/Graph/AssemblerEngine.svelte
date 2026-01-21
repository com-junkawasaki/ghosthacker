<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import { OrbitControls, ContactShadows, Grid, GLTF } from '@threlte/extras';
  import * as THREE from 'three';
  import { graphStore } from '../../../lib/stores/graph.svelte';
  import { getAssetUrl } from '../../../lib/api';

  let { 
    onNodeClick = () => {} 
  } = $props<{
    onNodeClick?: (node: any) => void;
  }>();

  let controlsRef = $state<any>(null);

  // Filter nodes that belong to the current environment/assembler view
  let assemblerNodes = $derived(
    Array.from(graphStore.nodes.values()).filter(n => 
      (n.position3d && n.position3d.length > 0) || 
      (n.gltfPath && n.gltfPath !== "") || 
      n.group === 'environment' || n.group === 'entity' || n.group === 'item'
    )
  );

  // Camera management (can be stored in a special meta node if needed)
  let cameraState = $state({
    position: [10, 5, 10] as [number, number, number],
    target: [0, 0, 0] as [number, number, number]
  });

</script>

<T.PerspectiveCamera
  makeDefault
  position={cameraState.position}
  fov={50}
>
  <OrbitControls
    bind:ref={controlsRef}
    enableDamping
    target={cameraState.target}
    onchange={() => {
      if (controlsRef) {
        const cam = controlsRef.object;
        cameraState.position = [cam.position.x, cam.position.y, cam.position.z];
        cameraState.target = [controlsRef.target.x, controlsRef.target.y, controlsRef.target.z];
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
  scale={20}
  blur={2}
  far={5}
  opacity={0.5}
/>

{#each assemblerNodes as node (node.id)}
  {@const isSelected = graphStore.selectedNodeId === node.id}
  <T.Group
    position={node.position3d?.length === 3 ? node.position3d : [0, 0, 0]}
    rotation={node.rotation3d?.length === 3 ? node.rotation3d : [0, 0, 0]}
    scale={node.scale3d?.length === 3 ? node.scale3d : [1, 1, 1]}
  >
    {#if node.gltfPath && node.gltfPath !== ""}
      <GLTF
        url={getAssetUrl(node.gltfPath)}
        castShadow
        receiveShadow
        onclick={(e: any) => {
          e.stopPropagation();
          onNodeClick(node);
        }}
      />
    {:else}
      <!-- Fallback for nodes without GLTF -->
      <T.Mesh
        onclick={(e: any) => {
          e.stopPropagation();
          onNodeClick(node);
        }}
      >
        <T.BoxGeometry args={[0.5, 0.5, 0.5]} />
        <T.MeshStandardMaterial 
          color={isSelected ? '#ff3e00' : (node.group === 'entity' ? '#ff3b30' : '#8e8e93')} 
          emissive={isSelected ? '#ff3e00' : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0}
        />
      </T.Mesh>
    {/if}
    
    {#if isSelected}
       <T.Mesh position={[0, 0.6, 0]}>
         <T.SphereGeometry args={[0.1, 8, 8]} />
         <T.MeshBasicMaterial color="#ff3e00" />
       </T.Mesh>
    {/if}
  </T.Group>
{/each}
