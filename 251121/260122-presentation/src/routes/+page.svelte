<script lang="ts">
  import { onMount } from 'svelte';
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

  let simulationNodes = $state<any[]>(characters.map(c => ({ 
    ...c, 
    x: (Math.random() - 0.5) * 800, 
    y: (Math.random() - 0.5) * 600,
    fx: null,
    fy: null
  })));
  let simulationLinks = $state<any[]>(links.map(l => ({ ...l })));
  let simulation: any;

  onMount(() => {
    simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(250))
      .force('charge', d3.forceManyBody().strength(-3000))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(150))
      .on('tick', () => {
        simulationNodes = [...simulationNodes];
        simulationLinks = [...simulationLinks];
      });

    const updateSize = () => {
      containerWidth = window.innerWidth;
      containerHeight = window.innerHeight;
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    return () => {
      if (simulation) simulation.stop();
      window.removeEventListener('resize', updateSize);
    };
  });

  let containerWidth = $state(1414);
  let containerHeight = $state(1000);
  let scale = $derived(Math.min(containerWidth / 1414, containerHeight / 1000) * 0.95);

  let draggingNode = $state<any>(null);

  function handleDragStart(node: any, e: PointerEvent) {
    if (e.button !== 0) return;
    draggingNode = node;
    node.fx = node.x;
    node.fy = node.y;
    // @ts-ignore
    e.target.setPointerCapture(e.pointerId);
  }

  function handleDragMove(node: any, e: PointerEvent) {
    if (draggingNode !== node) return;
    node.fx += e.movementX / scale;
    node.fy += e.movementY / scale;
    if (simulation) simulation.alphaTarget(0.3).restart();
  }

  function handleDragEnd(node: any, e: PointerEvent) {
    if (draggingNode !== node) return;
    draggingNode = null;
    // @ts-ignore
    e.target.releasePointerCapture(e.pointerId);
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
</script>

<div class="wrapper">
  <div class="a3-page" style="transform: scale({scale})">
    <div class="bg-grid"></div>
    
    <svg class="links-layer">
      {#each simulationLinks as link}
        {#if link.source.x !== undefined && link.target.x !== undefined}
          <line 
            x1={707 + link.source.x} 
            y1={500 + link.source.y} 
            x2={707 + link.target.x} 
            y2={500 + link.target.y} 
            stroke="#0071e3" 
            stroke-width="2" 
            stroke-opacity="0.3"
          />
        {/if}
      {/each}
    </svg>

    <div class="overlay">
      <div class="header">
        <div class="title-main">GHOST HACKER</div>
        <div class="subtitle">サイバーセキュリティ・ケーススタディ漫画</div>
        <div class="meta-row">
          <span><Terminal size={14} /> ARIA Aesthetic</span>
          <span><Shield size={14} /> CISSP / CISA</span>
          <span><Cpu size={14} /> Tokyo 2026</span>
        </div>
      </div>

      <div class="nodes-container">
        {#each simulationNodes as node (node.id)}
          <div 
            class="node-card" 
            class:fixed={node.fx !== null}
            style="left: {707 + node.x}px; top: {500 + node.y}px; --accent: {node.color}"
            onpointerdown={(e) => handleDragStart(node, e)}
            onpointermove={(e) => handleDragMove(node, e)}
            onpointerup={(e) => handleDragEnd(node, e)}
          >
            <button class="pin-btn" onclick={(e) => { e.stopPropagation(); toggleFix(node); }}>
              {#if node.fx !== null}<Pin size={12} fill="currentColor" />{:else}<PinOff size={12} />{/if}
            </button>
            {#if node.image}<div class="image-box"><img src={node.image} alt={node.name} /></div>{/if}
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
        {/each}

        {#each scenes as scene}
          <div class="scene-node" style="left: {707 + scene.pos.x}px; top: {500 + scene.pos.y}px;">
            <div class="scene-title">{scene.title}</div>
            <div class="scene-desc">{scene.desc}</div>
          </div>
        {/each}
      </div>

      <div class="concept-panel">
        <div class="section-title"><Zap size={18} /> CONCEPT</div>
        <p>「情報は物理量である」— デジタル空間の歪みが実体化する「Ghost」をデリートせよ。</p>
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
    overflow: hidden;
  }
  .wrapper {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
  }
  .a3-page {
    width: 1414px;
    height: 1000px;
    background: #05050a;
    position: relative;
    border: 1px solid #1a1a2e;
    overflow: hidden;
  }
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(0, 113, 227, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 113, 227, 0.05) 1px, transparent 1px);
    background-size: 50px 50px;
  }
  .links-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .overlay {
    position: absolute;
    inset: 40px;
    pointer-events: none;
  }
  .header { pointer-events: auto; }
  .title-main {
    font-size: 84px;
    font-weight: 900;
    background: linear-gradient(135deg, #fff 0%, #0071e3 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1;
  }
  .subtitle { font-size: 24px; color: #0071e3; font-weight: 600; margin-bottom: 10px; }
  .meta-row { display: flex; gap: 20px; color: #666; font-size: 14px; }
  .meta-row span { display: flex; align-items: center; gap: 6px; }
  
  .nodes-container { position: absolute; inset: 0; }
  .node-card {
    position: absolute;
    width: 200px;
    background: rgba(10, 10, 20, 0.9);
    border-left: 3px solid var(--accent);
    padding: 12px;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    cursor: grab;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .node-card.fixed { border-left-width: 6px; background: rgba(20, 20, 40, 0.95); }
  .pin-btn { position: absolute; top: 5px; right: 5px; background: none; border: none; color: #444; cursor: pointer; }
  .node-card.fixed .pin-btn { color: #0071e3; }
  .image-box { width: 100%; height: 180px; background: #111; margin-bottom: 10px; overflow: hidden; }
  .image-box img { width: 100%; height: 100%; object-fit: cover; }
  .name { font-weight: 800; font-size: 16px; }
  .role { font-size: 12px; color: var(--accent); margin-bottom: 6px; }
  .creds { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
  .cred-tag { font-size: 9px; background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 2px; color: #aaa; }
  .desc { font-size: 10px; color: #888; line-height: 1.4; }

  .scene-node {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    border: 1px dashed #333;
    padding: 15px;
    width: 220px;
    transform: translate(-50%, -50%);
    pointer-events: auto;
  }
  .scene-title { font-size: 14px; font-weight: 700; color: #aaa; margin-bottom: 4px; }
  .scene-desc { font-size: 11px; color: #555; }

  .concept-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 400px;
    background: rgba(0, 113, 227, 0.05);
    padding: 24px;
    border: 1px solid rgba(0, 113, 227, 0.2);
    pointer-events: auto;
  }
  .section-title { color: #0071e3; font-weight: 800; font-size: 18px; display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
</style>
