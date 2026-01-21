<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3-force';
  import { Shield, Terminal, Cpu, Network, Eye, Lock, Zap, Ghost, Pin, PinOff, Calendar, Save, RotateCcw, Download, Bug } from 'lucide-svelte';

  const characters = [
    { id: 'ren', type: 'char', name: '沼野 蓮 (Ren)', role: 'Ghost Hacker', age: 17, image: '/images/characters/ren.png', credentials: ['CISSP Associate', 'CEH'], color: '#0071e3', desc: 'Efficiency-obsessed genius. Hacks the "Ghost" behind info-distortions.' },
    { id: 'nei', type: 'char', name: 'Nei', role: 'AI Partner', age: 16, image: '/images/characters/nei.png', credentials: ['Android AI', 'SIP Manager'], color: '#34c759', desc: 'Ren\'s partner. Manages physical layer intrusions and data analysis.' },
    { id: 'shouta', type: 'char', name: '大門 翔太 (Shouta)', role: 'The Client', age: 26, image: '/images/characters/shouta.png', credentials: ['Daimon Construction'], color: '#ff3b30', desc: 'Successor struggling with legacy systems.' },
    { id: 'takeru', type: 'char', name: '赤羽 猛 (Takeru)', role: 'Rival: Short-tempered', age: 19, image: '/images/characters/takeru.png', credentials: ['OSCP', 'GXPN'], color: '#ff9500', desc: 'Aggressive self-taught hacker.' },
    { id: 'kaname', type: 'char', name: '水城 要 (Kaname)', role: 'Rival: Arrogant', age: 18, image: '/images/characters/kaname.png', credentials: ['CISA', 'PMP'], color: '#af52de', desc: 'Perfectionist elite. Management specialist.' },
  ];

  const concepts = [
    { id: 'aria', type: 'concept', name: 'ARIA Aesthetic', color: '#0071e3', icon: Eye, desc: 'Luminous air, soft light, extreme ocular detail.' },
    { id: 'ghost', type: 'concept', name: 'The GHOST', color: '#ff2d55', icon: Ghost, desc: 'Information with mass. The physical manifestation of digital malice.' },
    { id: 'sip', type: 'concept', name: 'SIP Sequence', color: '#00a0a0', icon: Lock, desc: 'Secure Information Physicality.' },
  ];

  const episodes = [
    { id: 'ep1', type: 'ep', arc: 'A', num: 1, title: '牙を剥く内部の影', theme: 'Internal Sabotage' },
    { id: 'ep2', type: 'ep', arc: 'A', num: 2, title: '許しの毒', theme: 'CISSP Methodology' },
    { id: 'ep3', type: 'ep', arc: 'A', num: 3, title: '善意の呪い', theme: 'Corporate Culture' },
    { id: 'ep4', type: 'ep', arc: 'B', num: 4, title: '終わらぬ時計', theme: 'Takeru Appears' },
    { id: 'ep5', type: 'ep', arc: 'B', num: 5, title: 'Doneがない地獄', theme: 'Design Failure' },
    { id: 'ep6', type: 'ep', arc: 'B', num: 6, title: '終端刻印', theme: 'Salvation' },
    { id: 'ep7', type: 'ep', arc: 'C', num: 7, title: '空の要塞の崩壊', theme: 'Kaname Appears' },
    { id: 'ep8', type: 'ep', arc: 'C', num: 8, title: '消えた資産の足跡', theme: 'Audit Attack' },
    { id: 'ep9', type: 'ep', arc: 'C', num: 9, title: 'それは傲慢ですね', theme: 'Rule Killing' },
    { id: 'ep10', type: 'ep', arc: 'D', num: 10, title: '群れのGhost', theme: 'Ecosystem Risk' },
    { id: 'ep11', type: 'ep', arc: 'D', num: 11, title: '崩壊する信頼', theme: 'Investigation' },
    { id: 'ep12', type: 'ep', arc: 'D', num: 12, title: '逮捕と残響', theme: 'Final Deletion' },
  ];

  const rawLinks = [
    { source: 'ren', target: 'nei', label: 'Partners', color: '#34c759' },
    { source: 'ren', target: 'shouta', label: 'Client', color: '#ff3b30' },
    { source: 'ren', target: 'takeru', label: 'Rival', color: '#ff9500' },
    { source: 'ren', target: 'kaname', label: 'Rival', color: '#af52de' },
    { source: 'ren', target: 'ghost', label: 'Targets', color: '#ff2d55' },
    { source: 'ren', target: 'sip', label: 'Tools', color: '#00a0a0' },
    { source: 'ren', target: 'aria', label: 'Visuals', color: '#0071e3' },
  ];

  let simulationNodes = $state<any[]>([]);
  let simulationLinks = $state<any[]>([]);
  let transform = $state({ x: 500, y: 400, k: 0.8 });
  let simulation: any;
  let isMounted = $state(false);

  onMount(() => {
    // If we can get window size, center it properly
    if (typeof window !== 'undefined') {
      transform.x = window.innerWidth / 2;
      transform.y = window.innerHeight / 2;
    }

    const saved = localStorage.getItem('gh-presentation-layout');
    let savedLayout: any = null;
    if (saved) {
      try { savedLayout = JSON.parse(saved); } catch (e) {}
    }

    const allBaseNodes = [...characters, ...concepts, ...episodes];
    simulationNodes = allBaseNodes.map(n => {
      const savedNode = savedLayout?.["gh:nodes"]?.find((sn: any) => sn["@id"] === `gh:node/${n.id}`);
      if (savedNode) {
        return { ...n, x: savedNode.x, y: savedNode.y, fx: savedNode.fixed ? savedNode.x : null, fy: savedNode.fixed ? savedNode.y : null };
      }
      return { ...n, x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 600, fx: null, fy: null };
    });

    simulationLinks = rawLinks.map(l => ({ ...l }));

    simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(300))
      .force('charge', d3.forceManyBody().strength(-2000))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(150))
      .on('tick', () => {
        simulationNodes = [...simulationNodes];
        simulationLinks = [...simulationLinks];
      });

    if (savedLayout?.transform) transform = savedLayout.transform;
    isMounted = true;
    return () => simulation?.stop();
  });

  let draggingNode = $state<any>(null);
  let isDraggingCanvas = $state(false);

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const card = target.closest('.node-card');
    if (card) {
      const id = card.getAttribute('data-id');
      draggingNode = simulationNodes.find(n => n.id === id);
      if (draggingNode) { draggingNode.fx = draggingNode.x; draggingNode.fy = draggingNode.y; }
    } else {
      isDraggingCanvas = true;
    }
    // @ts-ignore
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (draggingNode) {
      draggingNode.fx += e.movementX / transform.k;
      draggingNode.fy += e.movementY / transform.k;
      simulation.alphaTarget(0.3).restart();
    } else if (isDraggingCanvas) {
      transform.x += e.movementX;
      transform.y += e.movementY;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    draggingNode = null;
    isDraggingCanvas = false;
    simulation.alphaTarget(0);
    // @ts-ignore
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = Math.pow(1.1, -e.deltaY / 150);
    const newK = Math.min(Math.max(transform.k * factor, 0.05), 5);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - transform.x) / transform.k;
    const worldY = (mouseY - transform.y) / transform.k;
    transform.k = newK;
    transform.x = mouseX - worldX * transform.k;
    transform.y = mouseY - worldY * transform.k;
  }

  function toggleFix(node: any, e: Event) {
    e.stopPropagation();
    if (node.fx !== null) { node.fx = null; node.fy = null; }
    else { node.fx = node.x; node.fy = node.y; }
    simulation.alpha(0.3).restart();
  }

  function saveLayout() {
    const layoutData = {
      "@context": { "gh": "https://ghosthacker.gftd.ai/ns/", "schema": "http://schema.org/", "x": "schema:positionX", "y": "schema:positionY", "fixed": "gh:isFixed" },
      "@type": "gh:PresentationLayout",
      "transform": transform,
      "gh:nodes": simulationNodes.map(n => ({ "@id": `gh:node/${n.id}`, "x": Math.round(n.x), "y": Math.round(n.y), "fixed": n.fx !== null }))
    };
    const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ghosthacker-layout.jsonld'; a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem('gh-presentation-layout', JSON.stringify(layoutData));
  }

  function resetAll() {
    localStorage.removeItem('gh-presentation-layout');
    window.location.reload();
  }
</script>

<div class="viewport" onpointerdown={handlePointerDown} onpointermove={handlePointerMove} onpointerup={handlePointerUp} onwheel={handleWheel}>
  <div class="hud">
    <div class="glitch-container">
      <div class="glitch-logo" data-text="GHOST">GHOST</div>
      <div class="glitch-logo" data-text="HACKER">HACKER</div>
    </div>
    <div class="subtitle">STRATEGIC MASTER PLAN</div>
  </div>

  <div class="canvas" style="transform: translate({transform.x}px, {transform.y}px) scale({transform.k})">
    <div class="bg-grid"></div>
    <svg class="links-layer">
      {#each simulationLinks as link}
        {#if link.source && link.target && typeof link.source === 'object'}
          <g>
            <line x1={link.source.x} y1={link.source.y} x2={link.target.x} y2={link.target.y} stroke={link.color || '#999'} stroke-width="2" stroke-opacity="0.2" />
            <text x={(link.source.x + link.target.x) / 2} y={(link.source.y + link.target.y) / 2} fill={link.color || '#999'} font-size="12" text-anchor="middle" dy="-10" class="link-label">{link.label}</text>
          </g>
        {/if}
      {/each}
    </svg>

    <div class="nodes-layer">
      {#each simulationNodes as node (node.id)}
        <div class="node-card {node.type}-card" class:fixed={node.fx !== null} style="left: {node.x}px; top: {node.y}px; --accent: {node.color}" data-id={node.id}>
          <button class="pin-btn" onclick={(e) => toggleFix(node, e)}>
            {#if node.fx !== null}<Pin size={14} fill="currentColor" />{:else}<PinOff size={14} />{/if}
          </button>
          {#if node.type === 'char'}
            {#if node.image}<div class="image-box"><img src={node.image} alt={node.name} /></div>{/if}
            <div class="info">
              <div class="name">{node.name}</div>
              <div class="role">{node.role}</div>
              <div class="creds">{#each node.credentials as cred}<span class="cred-tag">{cred}</span>{/each}</div>
              <p class="desc">{node.desc}</p>
            </div>
          {:else if node.type === 'concept'}
            <div class="concept-content">
              <div class="concept-icon"><node.icon size={32} color={node.color} /></div>
              <div class="info"><div class="name" style="color: {node.color}">{node.name}</div><p class="desc">{node.desc}</p></div>
            </div>
          {:else if node.type === 'ep'}
            <div class="ep-content">
              <div class="ep-meta">Arc {node.arc} | Ep.{node.num}</div>
              <div class="ep-title">{node.title}</div>
              <div class="ep-theme">{node.theme}</div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="controls">
    <button onclick={saveLayout}><Save size={16} /> Save</button>
    <button onclick={resetAll}><RotateCcw size={16} /> Reset</button>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&family=Noto+Sans+JP:wght@400;700;900&family=Poppins:wght@400;700;900&display=swap');
  :global(body) { margin: 0; background: #fff; color: #333; font-family: 'Poppins', 'Noto Sans JP', sans-serif; overflow: hidden; touch-action: none; }
  .viewport { width: 100vw; height: 100vh; position: relative; overflow: hidden; background: #fff; }
  .canvas { position: absolute; transform-origin: 0 0; }
  .bg-grid { position: absolute; width: 20000px; height: 20000px; top: -10000px; left: -10000px; background-image: radial-gradient(circle, #eee 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; }
  .links-layer { position: absolute; width: 20000px; height: 20000px; top: -10000px; left: -10000px; pointer-events: none; }
  .link-label { font-weight: 700; paint-order: stroke; stroke: #fff; stroke-width: 4px; pointer-events: none; }
  .node-card { position: absolute; transform: translate(-50%, -50%); background: #fff; padding: 15px; border: 1px solid #ddd; box-shadow: 0 10px 30px rgba(0,0,0,0.05); user-select: none; pointer-events: auto; }
  .node-card.fixed { border-color: var(--accent); border-width: 2px; }
  .char-card { width: 240px; border-top: 4px solid var(--accent); }
  .image-box { width: 100%; height: 240px; background: #f0f0f0; margin-bottom: 10px; overflow: hidden; }
  .image-box img { width: 100%; height: 100%; object-fit: cover; }
  .name { font-weight: 900; font-size: 18px; }
  .role { font-size: 12px; color: var(--accent); font-weight: 800; margin-bottom: 8px; }
  .cred-tag { font-size: 9px; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-weight: 700; color: #666; }
  .desc { font-size: 11px; color: #888; margin-top: 8px; line-height: 1.4; }
  .concept-card { width: 300px; border-radius: 60px; display: flex; align-items: center; gap: 15px; padding: 20px 30px; border: 2px solid var(--accent); }
  .ep-card { width: 160px; text-align: center; border-radius: 8px; border-bottom: 3px solid #ddd; background: #fafafa; }
  .ep-meta { font-size: 10px; color: #999; font-weight: 900; }
  .ep-title { font-size: 14px; font-weight: 900; }
  .pin-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #eee; cursor: pointer; }
  .fixed .pin-btn { color: var(--accent); }
  .hud { position: fixed; top: 40px; left: 40px; pointer-events: none; }
  .glitch-container { display: flex; flex-direction: column; }
  .glitch-logo { position: relative; font-family: 'Courier Prime', monospace; font-size: 80px; font-weight: 700; line-height: 0.85; color: #111; text-transform: uppercase; letter-spacing: -2px; }
  .glitch-logo::before, .glitch-logo::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
  .glitch-logo::before { left: 4px; text-shadow: -3px 0 #ff00ff; color: transparent; opacity: 0.7; }
  .glitch-logo::after { left: -4px; text-shadow: 3px 0 #00ffff; color: transparent; opacity: 0.7; }
  .subtitle { font-size: 18px; color: #999; font-weight: 700; margin-top: 10px; letter-spacing: 5px; }
  .controls { position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; }
  .controls button { background: #fff; border: 1px solid #ddd; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 5px; }
</style>
