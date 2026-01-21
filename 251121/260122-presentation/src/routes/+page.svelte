<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3-force';
  import { Shield, Terminal, Cpu, Network, Eye, Lock, Zap, Ghost, Pin, PinOff, Calendar, Save, RotateCcw, Download } from 'lucide-svelte';

  const characters = [
    { id: 'ren', type: 'char', name: '沼野 蓮 (Ren)', role: 'Ghost Hacker', age: 17, image: '/images/characters/ren.png', credentials: ['CISSP Associate', 'CEH'], color: '#0071e3', desc: 'Efficiency-obsessed genius. Hacks the "Ghost" behind info-distortions.' },
    { id: 'nei', type: 'char', name: 'Nei', role: 'AI Partner', age: 16, image: '/images/characters/nei.png', credentials: ['Android AI', 'SIP Manager'], color: '#34c759', desc: 'Ren\'s partner. Manages physical layer intrusions and data analysis.' },
    { id: 'shouta', type: 'char', name: '大門 翔太 (Shouta)', role: 'The Client', age: 26, image: '/images/characters/shouta.png', credentials: ['Daimon Construction'], color: '#ff3b30', desc: 'Successor struggling with legacy systems. Representing the "Victim" side.' },
    { id: 'takeru', type: 'char', name: '赤羽 猛 (Takeru)', role: 'Rival: Short-tempered', age: 19, image: '/images/characters/takeru.png', credentials: ['OSCP', 'GXPN'], color: '#ff9500', desc: 'Aggressive self-taught hacker. Attacks the "Weakness of Will".' },
    { id: 'kaname', type: 'char', name: '水城 要 (Kaname)', role: 'Rival: Arrogant', age: 18, image: '/images/characters/kaname.png', credentials: ['CISA', 'PMP'], color: '#af52de', desc: 'Perfectionist elite. Views cybersecurity as a pure management game.' },
    { id: 'aria', type: 'concept', name: 'ARIA Aesthetic', color: '#ffffff', icon: Eye, desc: 'Luminous air, soft light, extreme ocular detail. The "Visual Soul" of the project.' },
    { id: 'ghost', type: 'concept', name: 'The GHOST', color: '#ff2d55', icon: Ghost, desc: 'Information with mass. The physical manifestation of digital malice.' },
    { id: 'sip', type: 'concept', name: 'SIP Sequence', color: '#00ffff', icon: Lock, desc: 'Secure Information Physicality. Technology to lock digital ghosts into the physical plane.' },
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
    { id: 'ep11', type: 'ep', arc: 'D', num: 11, theme: 'Investigation', title: '崩壊する信頼' },
    { id: 'ep12', type: 'ep', arc: 'D', num: 12, theme: 'Final Deletion', title: '逮捕と残響' },
  ];

  const rawLinks = [
    { source: 'ren', target: 'nei', label: 'Partners', color: '#34c759' },
    { source: 'ren', target: 'shouta', label: 'Client/Case A', color: '#ff3b30' },
    { source: 'ren', target: 'takeru', label: 'Rival/Arc B', color: '#ff9500' },
    { source: 'ren', target: 'kaname', label: 'Rival/Arc C', color: '#af52de' },
    { source: 'takeru', target: 'kaname', label: 'Collab/Arc D', color: '#ffffff' },
    { source: 'ren', target: 'ghost', label: 'Target', color: '#ff2d55' },
    { source: 'ren', target: 'sip', label: 'Tech', color: '#00ffff' },
    { source: 'ren', target: 'aria', label: 'Visual', color: '#ffffff' },
    { source: 'ep1', target: 'shouta', label: 'Main Case', color: '#ff3b30' },
    { source: 'ep4', target: 'takeru', label: 'Antagonist', color: '#ff9500' },
    { source: 'ep7', target: 'kaname', label: 'Antagonist', color: '#af52de' },
  ];

  for (let i = 0; i < episodes.length - 1; i++) {
    rawLinks.push({ source: episodes[i].id, target: episodes[i + 1].id, label: 'Next', color: '#444' });
  }

  let simulationNodes = $state<any[]>([]);
  let simulationLinks = $state<any[]>([]);
  let transform = $state({ x: 0, y: 0, k: 0.6 });
  let simulation: any;

  onMount(() => {
    // Center viewport initially
    transform.x = window.innerWidth / 2;
    transform.y = window.innerHeight / 2;

    const saved = localStorage.getItem('gh-presentation-layout');
    let savedLayout: any = null;
    if (saved) {
      try { savedLayout = JSON.parse(saved); } catch (e) {}
    }

    const initialNodes = [
      ...characters.map(c => ({ ...c })),
      ...concepts.map(c => ({ ...c })),
      ...episodes.map(e => ({ ...e }))
    ].map(n => {
      const savedNode = savedLayout?.["gh:nodes"]?.find((sn: any) => sn["@id"] === `gh:node/${n.id}`);
      if (savedNode) {
        return { ...n, x: savedNode.x, y: savedNode.y, fx: savedNode.fixed ? savedNode.x : null, fy: savedNode.fixed ? savedNode.y : null };
      }
      return { ...n, x: (Math.random()-0.5)*800, y: (Math.random()-0.5)*600, fx: null, fy: null };
    });

    simulationNodes = initialNodes;
    simulationLinks = rawLinks.map(l => ({ ...l }));

    simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(d => d.label === 'Next' ? 100 : 250))
      .force('charge', d3.forceManyBody().strength(d => d.type === 'ep' ? -500 : -3000))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => d.type === 'char' ? 150 : 100))
      .on('tick', () => {
        simulationNodes = [...simulationNodes];
        simulationLinks = [...simulationLinks];
      });

    if (savedLayout?.transform) {
      transform = savedLayout.transform;
    }

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
      if (draggingNode) {
        draggingNode.fx = draggingNode.x;
        draggingNode.fy = draggingNode.y;
      }
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
    if (draggingNode) {
      draggingNode = null;
      simulation.alphaTarget(0);
    }
    isDraggingCanvas = false;
    // @ts-ignore
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = Math.pow(1.1, -e.deltaY / 100);
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
    if (node.fx !== null) {
      node.fx = null;
      node.fy = null;
    } else {
      node.fx = node.x;
      node.fy = node.y;
    }
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
    simulationNodes.forEach(n => { n.fx = null; n.fy = null; });
    transform = { x: window.innerWidth / 2, y: window.innerHeight / 2, k: 0.6 };
    simulation.alpha(1).restart();
    localStorage.removeItem('gh-presentation-layout');
  }

  function handleFileLoad(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const layout = JSON.parse(event.target?.result as string);
        if (layout.transform) transform = layout.transform;
        layout["gh:nodes"]?.forEach((savedNode: any) => {
          const id = savedNode["@id"].replace('gh:node/', '');
          const node = simulationNodes.find(n => n.id === id);
          if (node) {
            node.x = savedNode.x; node.y = savedNode.y;
            if (savedNode.fixed) { node.fx = savedNode.x; node.fy = savedNode.y; }
          }
        });
        simulation.alpha(0.3).restart();
      } catch (e) {}
    };
    reader.readAsText(file);
  }
</script>

<div 
  class="viewport" 
  onpointerdown={handlePointerDown} 
  onpointermove={handlePointerMove} 
  onpointerup={handlePointerUp}
  onwheel={handleWheel}
>
  <div class="canvas" style="transform: translate({transform.x}px, {transform.y}px) scale({transform.k})">
    <div class="bg-grid"></div>
    
    <svg class="links-layer">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#444" />
        </marker>
      </defs>
      {#each simulationLinks as link}
        {#if link.source.x !== undefined && link.target.x !== undefined}
          <g>
            <line 
              x1={link.source.x} y1={link.source.y} x2={link.target.x} y2={link.target.y} 
              stroke={link.color || '#0071e3'} 
              stroke-width={link.label === 'Next' ? '1.5' : '3'} 
              stroke-opacity={link.label === 'Next' ? '0.1' : '0.2'}
              marker-end={link.label === 'Next' ? 'url(#arrow)' : ''}
            />
            {#if link.label !== 'Next'}
              <text 
                x={(link.source.x + link.target.x) / 2} y={(link.source.y + link.target.y) / 2} 
                fill={link.color || '#0071e3'} font-size="12" text-anchor="middle" dy="-8" class="link-label"
              >{link.label}</text>
            {/if}
          </g>
        {/if}
      {/each}
    </svg>

    <div class="nodes-layer">
      {#each simulationNodes as node (node.id)}
        <div 
          class="node-card {node.type}-card" 
          class:fixed={node.fx !== null}
          style="left: {node.x}px; top: {node.y}px; --accent: {node.color}"
          data-id={node.id}
        >
          <button class="pin-btn" onclick={(e) => toggleFix(node, e)}>
            {#if node.fx !== null}<Pin size={14} fill="currentColor" />{:else}<PinOff size={14} />{/if}
          </button>

          {#if node.type === 'char'}
            {#if node.image}<div class="image-box"><img src={node.image} alt={node.name} /></div>{/if}
            <div class="info">
              <div class="name">{node.name}</div>
              <div class="role">{node.role}</div>
              <div class="creds">
                {#each node.credentials as cred}<span class="cred-tag">{cred}</span>{/each}
              </div>
              <div class="desc">{node.desc}</div>
            </div>
          {:else if node.type === 'concept'}
            <div class="concept-content">
              <div class="concept-icon"><node.icon size={32} color={node.color} /></div>
              <div class="info">
                <div class="name" style="color: {node.color}">{node.name}</div>
                <div class="desc">{node.desc}</div>
              </div>
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

  <div class="hud">
    <div class="title-main">GHOST HACKER</div>
    <div class="subtitle">STRATEGIC MASTER PLAN</div>
    <div class="legend">
      <div class="legend-item"><span class="dot" style="background: #ff3b30"></span> Arc A: Legacy</div>
      <div class="legend-item"><span class="dot" style="background: #ff9500"></span> Arc B: Psychology</div>
      <div class="legend-item"><span class="dot" style="background: #af52de"></span> Arc C: Governance</div>
      <div class="legend-item"><span class="dot" style="background: #0071e3"></span> Arc D: Ecosystem</div>
    </div>
  </div>

  <div class="controls">
    <button onclick={saveLayout}><Save size={16} /> Save</button>
    <label class="btn-label">
      <Download size={16} /> Load
      <input type="file" accept=".jsonld" onchange={handleFileLoad} style="display: none;" />
    </label>
    <button onclick={resetAll}><RotateCcw size={16} /> Reset</button>
  </div>
</div>

<style>
  :global(body) { margin: 0; background: #000; color: #fff; font-family: 'Inter', sans-serif; overflow: hidden; touch-action: none; }
  .viewport { width: 100vw; height: 100vh; position: relative; overflow: hidden; }
  .canvas { position: absolute; transform-origin: 0 0; }
  .bg-grid { position: absolute; width: 10000px; height: 10000px; top: -5000px; left: -5000px; background-image: linear-gradient(rgba(0, 113, 227, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 113, 227, 0.05) 1px, transparent 1px); background-size: 50px 50px; }
  .links-layer { position: absolute; width: 10000px; height: 10000px; top: -5000px; left: -5000px; pointer-events: none; }
  .link-label { font-weight: 700; paint-order: stroke; stroke: #05050a; stroke-width: 4px; pointer-events: none; }
  .node-card { position: absolute; transform: translate(-50%, -50%); background: rgba(15, 15, 25, 0.85); padding: 15px; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 20px 50px rgba(0,0,0,0.5); user-select: none; }
  .node-card.fixed { border-color: rgba(0, 113, 227, 0.3); background: rgba(20, 20, 40, 0.9); }
  .char-card { width: 240px; border-left: 4px solid var(--accent); }
  .image-box { width: 100%; height: 240px; background: #000; margin-bottom: 12px; overflow: hidden; }
  .image-box img { width: 100%; height: 100%; object-fit: cover; }
  .name { font-weight: 900; font-size: 18px; }
  .role { font-size: 12px; color: var(--accent); font-weight: 800; margin-bottom: 8px; }
  .cred-tag { font-size: 9px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; margin-right: 4px; }
  .desc { font-size: 11px; color: #888; margin-top: 8px; }
  .concept-card { width: 300px; border-radius: 60px; display: flex; align-items: center; gap: 20px; }
  .ep-card { width: 180px; text-align: center; border-radius: 8px; border-bottom: 4px solid #333; }
  .pin-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #444; cursor: pointer; }
  .fixed .pin-btn { color: #0071e3; }
  .hud { position: fixed; top: 40px; left: 40px; pointer-events: none; }
  .title-main { font-size: 80px; font-weight: 950; background: linear-gradient(135deg, #fff 0%, #0071e3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; }
  .subtitle { font-size: 24px; color: #0071e3; font-weight: 700; margin-top: 10px; }
  .controls { position: fixed; top: 25px; right: 25px; display: flex; gap: 12px; }
  .controls button, .btn-label { background: rgba(0, 113, 227, 0.1); border: 1px solid rgba(0, 113, 227, 0.4); color: #0071e3; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
</style>
