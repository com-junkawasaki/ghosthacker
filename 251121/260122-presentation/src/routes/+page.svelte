<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import { OrbitControls, HTML, Grid } from '@threlte/extras';
  import * as THREE from 'three';
  import * as d3 from 'd3-force';
  import { Shield, Terminal, Cpu, Network, Eye, Lock, Zap, Ghost, Pin, PinOff } from 'lucide-svelte';

  const characters = [
    { id: 'ren', name: '沼野 蓮 (Ren)', role: 'Ghost Hacker', age: 17, image: '/images/characters/ren.png', credentials: ['CISSP Associate', 'CEH'], color: '#0071e3', desc: 'Efficiency-obsessed genius. Hacks the "Ghost" behind info-distortions.' },
    { id: 'nei', name: 'Nei', role: 'AI Android', age: 16, image: '/images/characters/nei.png', credentials: ['Android AI', 'Analytical'], color: '#34c759', desc: 'Ren\'s partner. Manages physical layer intrusions and data analysis.' },
    { id: 'shouta', name: '大門 翔太 (Shouta)', role: 'Client', age: 26, image: '/images/characters/shouta.png', credentials: ['Daimon Construction', 'Successor'], color: '#ff3b30', desc: 'Struggling to modernize his father\'s company. First client in Ep.1.' },
    { id: 'takeru', name: '赤羽 猛 (Takeru)', role: 'Rival Hacker', age: 19, image: '/images/characters/takeru.png', credentials: ['OSCP', 'GXPN'], color: '#ff9500', desc: 'Aggressive self-taught hacker. Prefers destructive exploits.' },
    { id: 'kaname', name: '水城 要 (Kaname)', role: 'Rival Hacker', age: 18, image: '/images/characters/kaname.png', credentials: ['CISA', 'PMP'], color: '#af52de', desc: 'Arrogant perfectionist. Stanford grad. Views hacking as a management task.' },
    { id: 'aria', name: 'ARIA Aesthetic', role: 'Visual Style', age: 0, image: '', credentials: ['Luminous', 'Soft Light'], color: '#ffffff', desc: 'Clean air, soft diffused lighting, and extreme ocular detail for Runway.' },
    { id: 'ghost', name: 'The GHOST', role: 'Core Concept', age: 0, image: '', credentials: ['Physical Info'], color: '#ff2d55', desc: 'Information with mass. The physical manifestation of digital malice.' },
  ];

  const links = [
    { source: 'ren', target: 'nei', label: 'Partner' },
    { source: 'shouta', target: 'ren', label: 'Client' },
    { source: 'takeru', target: 'ren', label: 'Rival' },
    { source: 'kaname', target: 'ren', label: 'Rival' },
    { source: 'kaname', target: 'takeru', label: 'Collaboration' },
    { source: 'aria', target: 'ren', label: 'Style' },
    { source: 'ghost', target: 'aria', label: 'Contrast' },
  ];

  const scenes = [
    { id: 's1', title: 'Ep.1: 牙を剥く内部の影', pos: { x: -500, y: -300 }, desc: 'Daimon Construction internal sabotage case.' },
    { id: 's2', title: 'Tokyo 2026', pos: { x: 500, y: -300 }, desc: 'A society where every "Ghost" is recorded.' },
    { id: 's3', title: 'The Ghost Hack', pos: { x: 0, y: 400 }, desc: 'Physics meets Information Security.' },
    { id: 's4', title: 'Ocular Detail', pos: { x: -500, y: 300 }, desc: 'Extreme iris patterns representing soul sync.' }
  ];

  const props = [
    { id: 'p1', name: 'Digital Axe', type: 'Tool', desc: 'Ren\'s weapon to "delete" malicious ghosts.', pos: { x: -200, y: 100 } },
    { id: 'p2', name: 'SIP Device', type: 'Hardware', desc: 'Secure Information Physicality device.', pos: { x: 200, y: 100 } }
  ];

  let simulationNodes = $state<any[]>(characters.map(c => ({ 
    ...c, 
    x: (Math.random() - 0.5) * 800, 
    y: (Math.random() - 0.5) * 600,
    fx: null,
    fy: null
  })));

  // ... (links and scenes remain the same)

  let draggingNode = $state<any>(null);

  function handleDragStart(node: any, e: PointerEvent) {
    if (e.button !== 0) return; // Left click only
    draggingNode = node;
    node.fx = node.x;
    node.fy = node.y;
    // @ts-ignore
    e.target.setPointerCapture(e.pointerId);
  }

  function handleDragMove(node: any, e: PointerEvent) {
    if (draggingNode !== node) return;
    
    // We need to convert screen delta to world delta
    // For simplicity in this fixed-scale view, we'll approximate
    const dx = e.movementX / scale;
    const dy = -e.movementY / scale; // Three.js Y is up, DOM Y is down
    
    node.fx += dx;
    node.fy += dy;
    
    if (simulation) simulation.alphaTarget(0.3).restart();
  }

  function handleDragEnd(node: any, e: PointerEvent) {
    if (draggingNode !== node) return;
    draggingNode = null;
    // @ts-ignore
    e.target.releasePointerCapture(e.pointerId);
    
    // If we want to "fix" it permanently as requested:
    // node.fx and node.fy remain set.
    if (simulation) simulation.alphaTarget(0);
  }

  function toggleFix(node: any) {
    if (node.fx !== null) {
      node.fx = null;
      node.fy = null;
    } else {
      node.fx = node.x;
      node.fy = node.y;
    }
    if (simulation) simulation.alpha(0.3).restart();
  }

  $effect(() => {
    if (!simulation) {
      simulation = d3.forceSimulation(simulationNodes)
        .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(250))
        .force('charge', d3.forceManyBody().strength(-2000))
        .force('center', d3.forceCenter(0, 0))
        .force('collision', d3.forceCollide().radius(150))
        .on('tick', () => {
          simulationNodes = [...simulationNodes];
          simulationLinks = [...simulationLinks];
        });
    }
  });

  let containerWidth = $state(0);
  let containerHeight = $state(0);
  let showGrid = $state(true);
  let scale = $derived(Math.min(containerWidth / 1414, containerHeight / 1000) * 0.95);

  function resetPositions() {
    simulationNodes.forEach(n => {
      n.fx = null;
      n.fy = null;
    });
    if (simulation) simulation.alpha(1).restart();
  }
</script>

<div class="wrapper" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <div class="controls">
    <button onclick={() => showGrid = !showGrid}>{showGrid ? 'Hide' : 'Show'} Grid</button>
    <button onclick={resetPositions}>Reset All</button>
  </div>
  <div class="a3-page" style="transform: scale({scale})">
    <div class="canvas-container">
      <Canvas>
        <T.PerspectiveCamera makeDefault position={[0, 0, 1000]} fov={40}>
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </T.PerspectiveCamera>

        <T.AmbientLight intensity={0.5} />
        <T.PointLight position={[0, 500, 500]} intensity={1.5} color="#0071e3" />

        {#if showGrid}
          <Grid
            position.z={-10}
            cellColor="#111122"
            sectionColor="#0071e3"
            sectionSize={100}
            cellSize={20}
            infiniteGrid
            rotation.x={Math.PI / 2}
            opacity={0.2}
          />
        {/if}

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
              <T.LineBasicMaterial color="#0071e3" transparent opacity={0.3} linewidth={2} />
            </T.Line>
          {/if}
        {/each}

        <!-- Nodes (Characters) -->
        {#each simulationNodes as node (node.id)}
          <HTML position={[node.x, node.y, 10]} center>
            <div 
              class="char-card" 
              class:fixed={node.fx !== null}
              style="--accent: {node.color}"
              onpointerdown={(e) => handleDragStart(node, e)}
              onpointermove={(e) => handleDragMove(node, e)}
              onpointerup={(e) => handleDragEnd(node, e)}
            >
              <button class="pin-btn" onclick={(e) => { e.stopPropagation(); toggleFix(node); }}>
                {#if node.fx !== null}
                  <Pin size={12} fill="currentColor" />
                {:else}
                  <PinOff size={12} />
                {/if}
              </button>
              
              {#if node.image}
                <div class="image-box">
                  <img src={node.image} alt={node.name} />
                </div>
              {/if}
              
              <div class="info">
                <div class="name">{node.name}</div>
                <div class="role">{node.role}</div>
                <div class="creds">
                  {#each node.credentials as cred}
                    <span class="cred-tag">{cred}</span>
                  {/each}
                </div>
                <div class="desc">{node.desc}</div>
              </div>
            </div>
          </HTML>
        {/each}

        <!-- Scenes -->
        {#each scenes as scene}
          <HTML position={[scene.pos.x, scene.pos.y, 0]} center>
            <div class="scene-node">
              <div class="scene-title">{scene.title}</div>
              <div class="scene-desc">{scene.desc}</div>
            </div>
          </HTML>
        {/each}

        <!-- Props -->
        {#each props as prop}
          <HTML position={[prop.pos.x, prop.pos.y, 0]} center>
            <div class="prop-node">
              <div class="prop-type">{prop.type}</div>
              <div class="prop-name">{prop.name}</div>
              <div class="prop-desc">{prop.desc}</div>
            </div>
          </HTML>
        {/each}
      </Canvas>
    </div>

    <div class="overlay">
      <div class="header">
        <div class="title-main">GHOST HACKER</div>
        <div class="subtitle">サイバーセキュリティ・ケーススタディ漫画</div>
        <div class="metadata">
          <span><Terminal size={14} /> ARIA Cinematic Aesthetic</span>
          <span><Shield size={14} /> Real-world InfoSec Frameworks</span>
          <span><Cpu size={14} /> Tokyo 2026 Setting</span>
        </div>
      </div>

      <div class="concept-panel">
        <div class="section-title"><Zap size={18} /> CONCEPT</div>
        <p>
          「情報は物理量である」— ランダウアーの原理に基づき、
          デジタル空間の歪みが「Ghost（質量を持った悪意）」として実体化する近未来。
          CISSPやCISA等の実在する資格・技術を駆使し、
          少年漫画の熱量でサイバー犯罪を「デリート」する。
        </p>
      </div>

      <div class="tech-stack">
        <div class="section-title"><Network size={18} /> SYSTEM ARCHITECTURE</div>
        <div class="tech-grid">
          <div class="tech-item"><Lock size={12} /> CISA / CMMI</div>
          <div class="tech-item"><Eye size={12} /> ARIA Ocular Detail</div>
          <div class="tech-item"><Ghost size={12} /> SIP Sequence</div>
        </div>
      </div>

      <div class="footer">
        PROJECT: MANGA-GHOST-HACKER-251121 | PRESENTATION BY GFTD
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #000;
    color: #fff;
    font-family: 'Inter', sans-serif;
  }

  .wrapper {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    background: radial-gradient(circle at center, #111 0%, #000 100%);
    position: relative;
  }

  .controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 100;
    display: flex;
    gap: 10px;
  }

  .controls button {
    background: rgba(0, 113, 227, 0.2);
    border: 1px solid #0071e3;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    backdrop-filter: blur(10px);
  }

  .controls button:hover {
    background: #0071e3;
  }

  .a3-page {
    width: 1414px;
    height: 1000px;
    background: #05050a;
    position: relative;
    box-shadow: 0 0 100px rgba(0, 113, 227, 0.2);
    border: 1px solid #1a1a2e;
    transform-origin: center center;
  }

  .canvas-container {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .overlay {
    position: absolute;
    inset: 40px;
    pointer-events: none;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .header {
    max-width: 600px;
  }

  .title-main {
    font-size: 84px;
    font-weight: 900;
    letter-spacing: -2px;
    background: linear-gradient(135deg, #fff 0%, #0071e3 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1;
    margin-bottom: 10px;
  }

  .subtitle {
    font-size: 24px;
    color: #0071e3;
    font-weight: 600;
    margin-bottom: 20px;
  }

  .metadata {
    display: flex;
    gap: 20px;
    color: #888;
    font-size: 14px;
  }

  .metadata span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .concept-panel {
    position: absolute;
    bottom: 100px;
    left: 0;
    width: 400px;
    background: rgba(0, 113, 227, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 113, 227, 0.2);
    padding: 24px;
    border-radius: 4px;
    pointer-events: auto;
  }

  .tech-stack {
    position: absolute;
    bottom: 100px;
    right: 0;
    width: 300px;
    padding: 24px;
    background: rgba(0, 0, 0, 0.5);
    border-right: 4px solid #0071e3;
  }

  .section-title {
    color: #0071e3;
    font-weight: 800;
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
  }

  .tech-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .tech-item {
    font-size: 12px;
    color: #aaa;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .footer {
    font-size: 12px;
    color: #444;
    letter-spacing: 2px;
    text-align: center;
  }

  /* Character Card Styles */
  .char-card {
    width: 200px;
    background: rgba(10, 10, 20, 0.9);
    border-left: 3px solid var(--accent);
    padding: 12px;
    pointer-events: auto;
    cursor: grab;
    transition: transform 0.2s, background 0.2s;
    position: relative;
    user-select: none;
    touch-action: none;
  }

  .char-card.fixed {
    border-left-style: double;
    border-left-width: 6px;
    background: rgba(20, 20, 40, 0.95);
  }

  .pin-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background: none;
    border: none;
    color: #444;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    z-index: 10;
  }

  .pin-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .char-card.fixed .pin-btn {
    color: #0071e3;
  }

  .image-box {
    width: 100%;
    height: 200px;
    background: #111;
    margin-bottom: 10px;
    overflow: hidden;
  }

  .image-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info .name {
    font-weight: 800;
    font-size: 16px;
    margin-bottom: 2px;
  }

  .info .role {
    font-size: 12px;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .creds {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }

  .cred-tag {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 2px;
  }

  .desc {
    font-size: 11px;
    color: #999;
    line-height: 1.4;
  }

  /* Scene Styles */
  .scene-node {
    background: rgba(0, 0, 0, 0.8);
    border: 1px dashed #333;
    padding: 10px 15px;
    width: 250px;
    pointer-events: auto;
  }

  .scene-title {
    font-size: 14px;
    font-weight: 700;
    color: #888;
    margin-bottom: 4px;
  }

  .scene-desc {
    font-size: 12px;
    color: #555;
  }

  .prop-node {
    background: rgba(0, 113, 227, 0.1);
    border: 1px solid rgba(0, 113, 227, 0.3);
    padding: 8px 12px;
    border-radius: 20px;
    pointer-events: auto;
    backdrop-filter: blur(5px);
  }

  .prop-type {
    font-size: 9px;
    text-transform: uppercase;
    color: #0071e3;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }

  .prop-name {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .prop-desc {
    font-size: 10px;
    color: #888;
  }
</style>
