<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
  import { OrbitControls, ContactShadows, Float, Grid } from '@threlte/extras';
  import * as THREE from 'three';
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3-force';
  import { graphStore, type Node, type Edge } from '../../../lib/stores/graph.svelte';

  let { 
    onNodeClick = () => {},
    currentTransform = $bindable({ x: 0, y: 0, k: 1 })
  } = $props<{
    onNodeClick?: (node: any) => void;
    currentTransform: { x: number; y: number; k: number };
  }>();

  // Colors mapping
  function getNodeColor(group: string): string {
    switch (group) {
      case 'content': return '#0071e3';
      case 'entity': return '#ff3b30';
      case 'environment': return '#34c759';
      case 'item': return '#ff9500';
      case 'emotion': return '#ff2d55';
      case 'meta': return '#af52de';
      default: return '#8e8e93';
    }
  }

  // Simulation state
  let simulation = $state<any>(null);
  
  // We need a stable array of nodes for d3-force
  let simulationNodes = $state<any[]>([]);
  let simulationLinks = $state<any[]>([]);

  // Sync store nodes to simulation nodes
  $effect(() => {
    const storeNodes = Array.from(graphStore.nodes.values());
    const storeEdges = graphStore.edges;

    // Initialize or update simulation nodes
    if (simulationNodes.length === 0 && storeNodes.length > 0) {
      simulationNodes = storeNodes.map(n => ({ ...n }));
      simulationLinks = storeEdges.map(e => ({
        source: e.fromId,
        target: e.toId,
        ...e
      }));
    } else if (storeNodes.length !== simulationNodes.length) {
      // Handle added/removed nodes
      const currentIds = new Set(simulationNodes.map(n => n.id));
      const newNodes = storeNodes.filter(n => !currentIds.has(n.id)).map(n => ({ ...n }));
      simulationNodes = [...simulationNodes, ...newNodes];
      
      const currentLinkIds = new Set(simulationLinks.map(l => `${l.source}:${l.target}`));
      const newLinks = storeEdges
        .filter(e => !currentLinkIds.has(`${e.fromId}:${e.toId}`))
        .map(e => ({
          source: e.fromId,
          target: e.toId,
          ...e
        }));
      simulationLinks = [...simulationLinks, ...newLinks];
    }

    if (simulationNodes.length > 0) {
      if (!simulation) {
        simulation = d3.forceSimulation(simulationNodes)
          .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(150))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(0, 0))
          .force('collision', d3.forceCollide().radius(20))
          .on('tick', () => {
            // Update store with new positions
            const positions = new Float32Array(simulationNodes.length * 2);
            simulationNodes.forEach((n, i) => {
              positions[i * 2] = n.x || 0;
              positions[i * 2 + 1] = n.y || 0;
            });
            graphStore.updateNodePositions(positions);
          });
      } else {
        simulation.nodes(simulationNodes);
        simulation.force('link').links(simulationLinks);
        simulation.alpha(0.3).restart();
      }
    }
  });

  // Sync Camera to currentTransform (OrbitControls perspective)
  let controlsRef = $state<any>(null);
  const { camera } = useThrelte();

  $effect(() => {
    if (controlsRef) {
      const updateTransform = () => {
        const cam = $camera;
        const target = controlsRef.target;
        // Map 3D camera to 2D currentTransform {x, y, k}
        // k is roughly 1 / distance
        const distance = cam.position.distanceTo(target);
        const k = 1000 / distance; 
        // x, y are target offsets (roughly)
        if (currentTransform.x !== -target.x || currentTransform.y !== -target.y || currentTransform.k !== k) {
          currentTransform = { x: -target.x, y: -target.y, k };
        }
      };

      controlsRef.addEventListener('change', updateTransform);
      return () => controlsRef.removeEventListener('change', updateTransform);
    }
  });

  $effect(() => {
    if (controlsRef && graphStore.selectedNodeId) {
      const selectedNode = graphStore.nodes.get(graphStore.selectedNodeId);
      if (selectedNode) {
        // Move camera to look at the selected node
        const target = new THREE.Vector3(selectedNode.x || 0, selectedNode.y || 0, 0);
        // Animate or jump
        controlsRef.target.lerp(target, 0.1);
      }
    }
  });

  onDestroy(() => {
    if (simulation) simulation.stop();
  });

  export function fitView() {
    if (controlsRef) {
      controlsRef.reset();
      controlsRef.target.set(0, 0, 0);
    }
  }
</script>

<T.PerspectiveCamera
  makeDefault
  position={[0, 0, 1000]}
  fov={45}
>
  <OrbitControls
    bind:ref={controlsRef}
    enableDamping
    dampingFactor={0.05}
    screenSpacePanning={true}
  />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.8} />
<T.DirectionalLight position={[10, 10, 10]} intensity={1} />

<Grid
  position.z={-1}
  cellColor="#111115"
  sectionColor="#22222a"
  sectionSize={100}
  cellSize={20}
  infiniteGrid
  rotation.x={Math.PI / 2}
/>

<!-- Nodes -->
{#each simulationNodes as node (node.id)}
  <T.Mesh
    position={[node.x || 0, node.y || 0, 0]}
    onpointerenter={() => { document.body.style.cursor = 'pointer'; }}
    onpointerleave={() => { document.body.style.cursor = 'default'; }}
    onclick={(e) => {
      e.stopPropagation();
      onNodeClick(node);
    }}
  >
    <T.SphereGeometry args={[node.group === 'meta' ? 8 : 4, 16, 16]} />
    <T.MeshStandardMaterial color={getNodeColor(node.group)} emissive={getNodeColor(node.group)} emissiveIntensity={0.5} />
  </T.Mesh>
{/each}

<!-- Edges -->
{#each simulationLinks as link}
  {#if link.source.x !== undefined && link.target.x !== undefined}
    <T.Line>
      <T.BufferGeometry
        oncreate={(ref) => {
          const points = [
            new THREE.Vector3(link.source.x, link.source.y, 0),
            new THREE.Vector3(link.target.x, link.target.y, 0)
          ];
          ref.setFromPoints(points);
        }}
      />
      <T.LineBasicMaterial color="#33333a" transparent opacity={0.3} />
    </T.Line>
  {/if}
{/each}


