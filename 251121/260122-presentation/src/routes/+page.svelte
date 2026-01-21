<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3-force';
  import { Shield, Terminal, Cpu, Network, Eye, Lock, Zap, Ghost, Pin, PinOff, Calendar, ArrowRight, Activity } from 'lucide-svelte';

  const characters = [
    { id: 'ren', type: 'char', name: '沼野 蓮 (Ren)', role: 'Ghost Hacker', age: 17, image: '/images/characters/ren.png', credentials: ['CISSP Associate', 'CEH'], color: '#0071e3', desc: 'Efficiency-obsessed genius. Hacks the "Ghost" behind info-distortions.' },
    { id: 'nei', type: 'char', name: 'Nei', role: 'AI Partner', age: 16, image: '/images/characters/nei.png', credentials: ['Android AI', 'SIP Manager'], color: '#34c759', desc: 'Ren\'s partner. Manages physical layer intrusions and data analysis.' },
    { id: 'shouta', type: 'char', name: '大門 翔太 (Shouta)', role: 'The Client', age: 26, image: '/images/characters/shouta.png', credentials: ['Daimon Construction'], color: '#ff3b30', desc: 'Successor struggling with legacy systems. Representing the "Victim" side.' },
    { id: 'takeru', type: 'char', name: '赤羽 猛 (Takeru)', role: 'Rival: Short-tempered', age: 19, image: '/images/characters/takeru.png', credentials: ['OSCP', 'GXPN'], color: '#ff9500', desc: 'Aggressive self-taught hacker. Attacks the "Weakness of Will".' },
    { id: 'kaname', type: 'char', name: '水城 要 (Kaname)', role: 'Rival: Arrogant', age: 18, image: '/images/characters/kaname.png', credentials: ['CISA', 'PMP'], color: '#af52de', desc: 'Perfectionist elite. Views cybersecurity as a pure management game.' },
  ];

  const concepts = [
    { id: 'aria', type: 'concept', name: 'ARIA Aesthetic', color: '#ffffff', icon: Eye, desc: 'Luminous air, soft light, extreme ocular detail. The "Visual Soul" of the project.' },
    { id: 'ghost', type: 'concept', name: 'The GHOST', color: '#ff2d55', icon: Ghost, desc: 'Information with mass. The physical manifestation of digital malice/Landauer\'s principle.' },
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
    { id: 'ep11', type: 'ep', arc: 'D', num: 11, title: '崩壊する信頼', theme: 'Investigation' },
    { id: 'ep12', type: 'ep', arc: 'D', num: 12, title: '逮捕と残響', theme: 'Final Deletion' },
  ];

  const links = [
    // Human Relationships
    { source: 'ren', target: 'nei', label: 'Partners', color: '#34c759' },
    { source: 'ren', target: 'shouta', label: 'Client/Case A', color: '#ff3b30' },
    { source: 'ren', target: 'takeru', label: 'Rival/Arc B', color: '#ff9500' },
    { source: 'ren', target: 'kaname', label: 'Rival/Arc C', color: '#af52de' },
    { source: 'takeru', target: 'kaname', label: 'Collab/Arc D', color: '#ffffff' },
    
    // Concept Links
    { source: 'ren', target: 'ghost', label: 'Target', color: '#ff2d55' },
    { source: 'ren', target: 'sip', label: 'Tech', color: '#00ffff' },
    { source: 'ren', target: 'aria', label: 'Visual', color: '#ffffff' },
    
    // Arc Links (Linking first episode of each arc to characters)
    { source: 'ep1', target: 'shouta', label: 'Main Case', color: '#ff3b30' },
    { source: 'ep4', target: 'takeru', label: 'Antagonist', color: '#ff9500' },
    { source: 'ep7', target: 'kaname', label: 'Antagonist', color: '#af52de' },
  ];

  // Episode Sequential Links
  for (let i = 0; i < episodes.length - 1; i++) {
    links.push({ 
      source: episodes[i].id, 
      target: episodes[i + 1].id, 
      label: 'Next', 
      color: '#444' 
    });
  }

  let allNodes = [
    ...characters.map(c => ({ ...c, x: (Math.random()-0.5)*400, y: (Math.random()-0.5)*400, fx: null, fy: null })),
    ...concepts.map(c => ({ ...c, x: (Math.random()-0.5)*200, y: (Math.random()-0.5)*200, fx: null, fy: null })),
    ...episodes.map((e, i) => {
      // Create a "Strategic Arc" layout for episodes by default
      const angle = (i / episodes.length) * Math.PI * 1.2 - Math.PI * 0.6;
      const radius = 600;
      return { 
        ...e, 
        x: Math.cos(angle) * radius + 200, 
        y: Math.sin(angle) * radius,
        fx: null, 
        fy: null 
      };
    })
  ];

  let simulationNodes = $state<any[]>(allNodes);
  let simulationLinks = $state<any[]>(links.map(l => ({ ...l })));
  let simulation: any;

  onMount(() => {
    const saved = localStorage.getItem('gh-presentation-layout');
    if (saved) {
      try {
        const layout = JSON.parse(saved);
        layout["gh:nodes"]?.forEach((savedNode: any) => {
          const id = savedNode["@id"].replace('gh:node/', '');
          const node = simulationNodes.find(n => n.id === id);
          if (node) {
            node.x = savedNode.x;
            node.y = savedNode.y;
            if (savedNode.fixed) {
              node.fx = savedNode.x;
              node.fy = savedNode.y;
            }
          }
        });
      } catch (e) {
        console.error("Failed to load layout", e);
      }
    }

    simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(d => {
        if (d.label === 'Next') return 120;
        return 250;
      }))
      .force('charge', d3.forceManyBody().strength(d => {
        if (d.type === 'ep') return -500;
        return -3000;
      }))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => {
        if (d.type === 'char') return 120;
        if (d.type === 'ep') return 80;
        return 100;
      }))
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

  function resetAll() {
    simulationNodes.forEach(n => { n.fx = null; n.fy = null; });
    if (simulation) simulation.alpha(1).restart();
    localStorage.removeItem('gh-presentation-layout');
  }

  function saveLayout() {
    // ... (logic remains same)
  }

  function handleFileLoad(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const layout = JSON.parse(event.target?.result as string);
        layout["gh:nodes"]?.forEach((savedNode: any) => {
          const id = savedNode["@id"].replace('gh:node/', '');
          const node = simulationNodes.find(n => n.id === id);
          if (node) {
            node.x = savedNode.x;
            node.y = savedNode.y;
            if (savedNode.fixed) {
              node.fx = savedNode.x;
              node.fy = savedNode.y;
            }
          }
        });
        if (simulation) simulation.alpha(0.3).restart();
        localStorage.setItem('gh-presentation-layout', JSON.stringify(layout));
      } catch (e) {
        alert("Failed to load layout file.");
      }
    };
    reader.readAsText(file);
  }
</script>

<div class="wrapper">
  <div class="controls">
    <button onclick={saveLayout}>Save Layout (.jsonld)</button>
    <label class="btn-label">
      Load Layout (.jsonld)
      <input type="file" accept=".jsonld" onchange={handleFileLoad} style="display: none;" />
    </label>
    <button onclick={resetAll}>Layout Reset</button>
  </div>

  <div class="a3-page" style="transform: scale({scale})">
    <div class="bg-grid"></div>
    
    <svg class="links-layer">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#444" />
        </marker>
      </defs>
      {#each simulationLinks as link}
        {#if link.source.x !== undefined && link.target.x !== undefined}
          <g>
            <line 
              x1={707 + link.source.x} 
              y1={500 + link.source.y} 
              x2={707 + link.target.x} 
              y2={500 + link.target.y} 
              stroke={link.color || '#0071e3'} 
              stroke-width={link.label === 'Next' ? '1' : '2'} 
              stroke-opacity={link.label === 'Next' ? '0.2' : '0.3'}
              marker-end={link.label === 'Next' ? 'url(#arrow)' : ''}
            />
            {#if link.label !== 'Next'}
              <text 
                x={(707 + link.source.x + 707 + link.target.x) / 2} 
                y={(500 + link.source.y + 500 + link.target.y) / 2} 
                fill={link.color || '#0071e3'} 
                font-size="10" 
                text-anchor="middle"
                dy="-5"
                class="link-label"
              >
                {link.label}
              </text>
            {/if}
          </g>
        {/if}
      {/each}
    </svg>

    <div class="overlay">
      <div class="header">
        <div class="title-main">GHOST HACKER</div>
        <div class="subtitle">12-Episode Strategic Master Plan</div>
        <div class="meta-row">
          <span><Calendar size={14} /> 2026 Setting</span>
          <span><Activity size={14} /> CISSP / CISA Case Studies</span>
          <span><Terminal size={14} /> ARIA Aesthetic Base</span>
        </div>
      </div>

      <div class="nodes-container">
        {#each simulationNodes as node (node.id)}
          {#if node.type === 'char'}
            <div 
              class="node-card char-card" 
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
          {:else if node.type === 'concept'}
            <div 
              class="node-card concept-card" 
              class:fixed={node.fx !== null}
              style="left: {707 + node.x}px; top: {500 + node.y}px; --accent: {node.color}"
              onpointerdown={(e) => handleDragStart(node, e)}
              onpointermove={(e) => handleDragMove(node, e)}
              onpointerup={(e) => handleDragEnd(node, e)}
            >
              <div class="concept-icon"><node.icon size={24} color={node.color} /></div>
              <div class="info">
                <div class="name" style="color: {node.color}">{node.name}</div>
                <div class="desc">{node.desc}</div>
              </div>
            </div>
          {:else if node.type === 'ep'}
            <div 
              class="node-card ep-card" 
              class:fixed={node.fx !== null}
              style="left: {707 + node.x}px; top: {500 + node.y}px;"
              onpointerdown={(e) => handleDragStart(node, e)}
              onpointermove={(e) => handleDragMove(node, e)}
              onpointerup={(e) => handleDragEnd(node, e)}
            >
              <div class="ep-meta">Arc {node.arc} | Ep.{node.num}</div>
              <div class="ep-title">{node.title}</div>
              <div class="ep-theme">{node.theme}</div>
            </div>
          {/if}
        {/each}
      </div>

      <div class="legend">
        <div class="legend-title">ARCH STRUCTURE</div>
        <div class="legend-item"><span class="dot" style="background: #ff3b30"></span> Arc A: Internal & Legacy</div>
        <div class="legend-item"><span class="dot" style="background: #ff9500"></span> Arc B: Psychological Weakness</div>
        <div class="legend-item"><span class="dot" style="background: #af52de"></span> Arc C: Rules & Governance</div>
        <div class="legend-item"><span class="dot" style="background: #0071e3"></span> Arc D: Ecosystem Collapse</div>
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #000;
    color: #fff;
    font-family: 'Inter', 'Hiragino Sans', sans-serif;
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
      linear-gradient(rgba(0, 113, 227, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 113, 227, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .links-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .link-label {
    paint-order: stroke;
    stroke: #05050a;
    stroke-width: 3px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .overlay {
    position: absolute;
    inset: 40px;
    pointer-events: none;
  }
  .header { pointer-events: auto; }
  .title-main {
    font-size: 96px;
    font-weight: 900;
    background: linear-gradient(135deg, #fff 0%, #0071e3 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 0.9;
    letter-spacing: -4px;
  }
  .subtitle { font-size: 28px; color: #0071e3; font-weight: 600; margin-bottom: 15px; letter-spacing: 2px; text-transform: uppercase; }
  .meta-row { display: flex; gap: 25px; color: #555; font-size: 14px; font-weight: 500; }
  .meta-row span { display: flex; align-items: center; gap: 8px; }
  
  .nodes-container { position: absolute; inset: 0; }
  .node-card {
    position: absolute;
    background: rgba(15, 15, 25, 0.85);
    padding: 15px;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    cursor: grab;
    backdrop-filter: blur(12px);
    box-shadow: 0 15px 45px rgba(0,0,0,0.6);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .node-card.fixed { background: rgba(25, 25, 45, 0.95); border-color: rgba(0, 113, 227, 0.3); }
  
  /* Char Card */
  .char-card { width: 220px; border-left: 4px solid var(--accent); }
  .char-card.fixed { border-left-width: 8px; }
  .image-box { width: 100%; height: 200px; background: #000; margin-bottom: 12px; overflow: hidden; border-radius: 2px; }
  .image-box img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.8) contrast(1.1); }
  .name { font-weight: 900; font-size: 18px; margin-bottom: 2px; }
  .role { font-size: 13px; color: var(--accent); margin-bottom: 8px; font-weight: 700; text-transform: uppercase; }
  .creds { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .cred-tag { font-size: 10px; background: rgba(255,255,255,0.08); padding: 3px 7px; border-radius: 3px; color: #ccc; font-weight: 600; }
  .desc { font-size: 11px; color: #999; line-height: 1.5; }

  /* Concept Card */
  .concept-card { width: 200px; display: flex; gap: 15px; border-radius: 40px; padding: 15px 25px; border: 1px solid rgba(255,255,255,0.1); }
  .concept-icon { display: flex; align-items: center; justify-content: center; }

  /* Episode Card */
  .ep-card { width: 160px; padding: 12px; border-radius: 4px; text-align: center; border-bottom: 3px solid #333; }
  .ep-meta { font-size: 10px; color: #0071e3; font-weight: 800; margin-bottom: 5px; }
  .ep-title { font-size: 14px; font-weight: 800; color: #eee; margin-bottom: 4px; line-height: 1.2; }
  .ep-theme { font-size: 10px; color: #666; font-style: italic; }

  .pin-btn { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #333; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; }
  .pin-btn:hover { opacity: 1; color: #fff; }
  .node-card.fixed .pin-btn { color: #0071e3; opacity: 1; }

  .legend {
    position: absolute;
    bottom: 0;
    right: 0;
    background: rgba(0,0,0,0.5);
    padding: 20px;
    border-right: 4px solid #0071e3;
    pointer-events: auto;
  }
  .legend-title { font-size: 12px; font-weight: 900; color: #555; margin-bottom: 10px; letter-spacing: 1px; }
  .legend-item { font-size: 11px; color: #aaa; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }

  .controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 100;
  }
  .controls button, .btn-label {
    background: rgba(0, 113, 227, 0.1);
    border: 1px solid rgba(0, 113, 227, 0.4);
    color: #0071e3;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .controls button:hover, .btn-label:hover {
    background: #0071e3;
    color: #fff;
  }
</style>
