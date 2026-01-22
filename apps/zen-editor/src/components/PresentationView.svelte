<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3-force';
  import { Eye, Ghost, Lock, Pin, PinOff, Save, RotateCcw, FileJson, Bug, Share2 } from 'lucide-svelte';
  import { graphStore } from '../lib/stores/graph.svelte';

  let { projectId } = $props<{ projectId: string }>();

  type ClientNode = {
    id: string;
    nodeType: 'char' | 'concept' | 'ep' | 'edge' | string;
    name?: string;
    description?: string;
    image?: string;
    role?: string;
    credentials?: string[];
    color?: string;
    x: number;
    y: number;
    scale?: number;
    fixed?: boolean;
    fx?: number | null;
    fy?: number | null;
    sourceId?: string;
    targetId?: string;
  };

  type ClientLink = {
    source: string | ClientNode;
    target: string | ClientNode;
    label?: string;
    color?: string;
  };

  const conceptIconById: Record<string, any> = {
    aria: Eye,
    ghost: Ghost,
    sip: Lock
  };

  let boardData = $state<any>(null);
  let transform = $state({ x: 0, y: 0, k: 1 });
  let simulationNodes = $state<ClientNode[]>([]);
  let simulationLinks = $state<ClientLink[]>([]);
  let simulation: d3.Simulation<ClientNode, any> | null = null;

  let draggingNode = $state<ClientNode | null>(null);
  let resizingNode = $state<ClientNode | null>(null);
  let linkingSource = $state<ClientNode | null>(null);
  let linkingTargetPos = $state({ x: 0, y: 0 });
  let isDraggingCanvas = $state(false);
  let dragStartPointer = { x: 0, y: 0 };
  let dragStartNodePos = { x: 0, y: 0 };

  let showDebug = $state(false);
  let showEditor = $state(false);
  let jsonDraft = $state('');

  async function loadBoard() {
    try {
      // Use the path relative to workspace root as expected by the backend
      const content = await graphStore.openFile(`251121/260122-presentation/data/presentation.jsonld`);
      if (content) {
        boardData = JSON.parse(content);
        initSimulation();
      }
    } catch (err) {
      console.error("Failed to load presentation board:", err);
    }
  }

  function ensureNumbers(n: number | undefined, fallback: number) {
    return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  }

  function initSimulation() {
    if (!boardData) return;

    const initialBaseNodes: ClientNode[] = (boardData.nodes ?? []).map((n: any) => {
      const x = ensureNumbers(n.x, 0);
      const y = ensureNumbers(n.y, 0);
      return { ...n, x, y, scale: n.scale ?? 1, fx: n.fixed ? x : null, fy: n.fixed ? y : null };
    });

    const initialEdgeNodes: ClientNode[] = (boardData.links ?? []).map((l: any, i: number) => ({
      id: `edge-${i}`, nodeType: 'edge', name: l.label, color: l.color, sourceId: l.source, targetId: l.target, x: 0, y: 0, scale: 0.8,
      fixed: !!l.fixed, fx: l.fixed ? (l.x || 0) : null, fy: l.fixed ? (l.y || 0) : null
    }));

    const initialLinks: any[] = [];
    (boardData.links ?? []).forEach((l: any, i: number) => {
      const edgeId = `edge-${i}`;
      initialLinks.push({ source: l.source, target: edgeId, color: l.color });
      initialLinks.push({ source: edgeId, target: l.target, color: l.color });
    });

    transform = structuredClone(boardData.transform || { x: window.innerWidth / 2, y: window.innerHeight / 2, k: 1 });
    simulationNodes = [...initialBaseNodes, ...initialEdgeNodes];
    simulationLinks = initialLinks;

    if (simulation) simulation.stop();

    simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength((d: any) => d.nodeType === 'edge' ? -400 : -3000))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius((d: any) => (d.nodeType === 'edge' ? 50 : 180)))
      .on('tick', () => {
        simulationNodes = [...simulationNodes];
        simulationLinks = [...simulationLinks];
      });
  }

  function asNode(v: string | ClientNode, nodes: ClientNode[]): ClientNode | undefined {
    if (typeof v !== 'string') return v;
    return nodes.find(n => n.id === v);
  }

  function makeClientLayout() {
    const nodes = simulationNodes.filter(n => n.nodeType !== 'edge').map((n) => ({
      id: n.id, nodeType: n.nodeType, name: n.name, description: n.description, image: n.image,
      role: n.role, credentials: n.credentials ?? [], color: n.color,
      x: Math.round(n.x), y: Math.round(n.y), scale: n.scale ?? 1, fixed: n.fx != null
    }));

    const links: any[] = [];
    simulationNodes.filter(n => n.nodeType === 'edge').forEach(en => {
      if (en.sourceId && en.targetId) {
        links.push({ 
          source: en.sourceId, 
          target: en.targetId, 
          label: en.name, 
          color: en.color,
          x: Math.round(en.x),
          y: Math.round(en.y),
          fixed: en.fx != null
        });
      }
    });

    return { transform, nodes, links };
  }

  async function handleSave() {
    const layout = makeClientLayout();
    await graphStore.saveFile(`251121/260122-presentation/data/presentation.jsonld`, JSON.stringify(layout, null, 2));
    alert("Presentation board saved!");
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const resizeHandle = target.closest('.resize-handle');
    const card = target.closest('.node-card');

    if (e.shiftKey && card) {
      const id = card.getAttribute('data-id');
      linkingSource = simulationNodes.find(n => n.id === id) ?? null;
      linkingTargetPos = { x: (e.clientX - transform.x) / transform.k, y: (e.clientY - transform.y) / transform.k };
    } else if (resizeHandle && card) {
      const id = card.getAttribute('data-id');
      resizingNode = simulationNodes.find((n) => n.id === id) ?? null;
    } else if (card) {
      const id = card.getAttribute('data-id');
      const node = simulationNodes.find((n) => n.id === id);
      if (!node) return;
      draggingNode = node;
      dragStartPointer = { x: e.clientX, y: e.clientY };
      dragStartNodePos = { x: node.x, y: node.y };
      node.fx = node.x;
      node.fy = node.y;
      simulation?.alphaTarget(0.3).restart();
    } else {
      isDraggingCanvas = true;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (linkingSource) {
      linkingTargetPos = { x: (e.clientX - transform.x) / transform.k, y: (e.clientY - transform.y) / transform.k };
    } else if (resizingNode) {
      const delta = (e.movementX + e.movementY) / 200;
      resizingNode.scale = Math.min(Math.max((resizingNode.scale ?? 1) + delta, 0.3), 3);
    } else if (draggingNode) {
      const dx = (e.clientX - dragStartPointer.x) / transform.k;
      const dy = (e.clientY - dragStartPointer.y) / transform.k;
      draggingNode.fx = dragStartNodePos.x + dx;
      draggingNode.fy = dragStartNodePos.y + dy;
      simulation?.tick();
      simulationNodes = [...simulationNodes];
      simulationLinks = [...simulationLinks];
    } else if (isDraggingCanvas) {
      transform.x += e.movementX;
      transform.y += e.movementY;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (linkingSource) {
      const target = e.target as HTMLElement;
      const card = target.closest('.node-card');
      if (card) {
        const targetId = card.getAttribute('data-id');
        if (targetId && targetId !== linkingSource.id) {
          const newIdx = simulationNodes.filter(n => n.nodeType === 'edge').length;
          const edgeId = `edge-${newIdx}-${Date.now()}`;
          const edgeNode: ClientNode = {
            id: edgeId, nodeType: 'edge', name: 'new relation', color: '#999',
            sourceId: linkingSource.id, targetId: targetId, x: linkingTargetPos.x, y: linkingTargetPos.y, scale: 0.8
          };
          simulationNodes = [...simulationNodes, edgeNode];
          simulationLinks = [...simulationLinks, 
            { source: linkingSource.id, target: edgeId, color: '#999' },
            { source: edgeId, target: targetId, color: '#999' }
          ];
          simulation?.nodes(simulationNodes);
          const linkForce = simulation?.force('link') as d3.ForceLink<any, any>;
          linkForce.links(simulationLinks);
          simulation?.alpha(0.3).restart();
        }
      }
      linkingSource = null;
    }

    if (draggingNode) {
      if (!draggingNode.fixed) {
        draggingNode.fx = null;
        draggingNode.fy = null;
      }
    }
    draggingNode = null;
    resizingNode = null;
    isDraggingCanvas = false;
    simulation?.alphaTarget(0);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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

  function toggleFix(node: ClientNode, e: Event) {
    e.stopPropagation();
    node.fixed = !node.fixed;
    if (node.fixed) { node.fx = node.x; node.fy = node.y; }
    else { node.fx = null; node.fy = null; }
    simulation?.alpha(0.2).restart();
  }

  onMount(() => {
    loadBoard();
    return () => simulation?.stop();
  });

  const layoutPretty = $derived(JSON.stringify(makeClientLayout(), null, 2));
  function openEditor() { jsonDraft = layoutPretty; showEditor = true; }
</script>

<div class="presentation-view">
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
          {@const s = asNode(link.source, simulationNodes)}
          {@const t = asNode(link.target, simulationNodes)}
          {#if s && t}
            <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={link.color || '#999'} stroke-width="2" stroke-opacity="0.2" />
          {/if}
        {/each}
        {#if linkingSource}
          <line x1={linkingSource.x} y1={linkingSource.y} x2={linkingTargetPos.x} y2={linkingTargetPos.y} stroke="#0071e3" stroke-width="3" stroke-dasharray="5,5" />
        {/if}
      </svg>

      <div class="nodes-layer">
        {#each simulationNodes as node (node.id)}
          <div
            class="node-card {node.nodeType}-card"
            class:fixed={node.fx != null}
            style="left: {node.x}px; top: {node.y}px; --accent: {node.color}; transform: translate(-50%, -50%) scale({node.scale ?? 1});"
            data-id={node.id}
          >
            {#if node.nodeType !== 'edge'}
              <div class="resize-handle"></div>
              <button class="pin-btn" onclick={(e) => toggleFix(node, e)} title="Pin">
                {#if node.fx != null}<Pin size={14} fill="currentColor" />{:else}<PinOff size={14} />{/if}
              </button>
            {/if}

            {#if node.nodeType === 'char'}
              {#if node.image}<div class="image-box"><img src={node.image.replace('/static/images/', '/images/')} alt={node.name} /></div>{/if}
              <div class="info">
                <div class="name">{node.name}</div>
                <div class="role">{node.role}</div>
                <div class="creds">{#each node.credentials ?? [] as cred}<span class="cred-tag">{cred}</span>{/each}</div>
                <p class="desc">{node.description}</p>
              </div>
            {:else if node.nodeType === 'concept'}
              <div class="concept-content {node.id}-content">
                <div class="concept-icon">
                  {#if conceptIconById[node.id]}
                    {@const Icon = conceptIconById[node.id]}
                    <Icon size={32} color={node.color ?? '#111'} />
                  {:else}
                    <Ghost size={32} color={node.color ?? '#111'} />
                  {/if}
                </div>
                <div class="info">
                  <div class="name" style="color: {node.color}">{node.name}</div>
                  <p class="desc">{node.description}</p>
                </div>
              </div>
            {:else if node.nodeType === 'ep'}
              <div class="ep-content">
                <div class="ep-title">{node.name}</div>
                <div class="ep-theme">{node.description}</div>
              </div>
            {:else if node.nodeType === 'edge'}
              <div class="edge-node-content">
                <Share2 size={16} color={node.color || '#999'} />
                <span>{node.name || ''}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <div class="controls">
      <button type="button" onclick={handleSave}><Save size={16} /> Save</button>
      <button type="button" onclick={openEditor}><FileJson size={16} /> JSON-LD</button>
      <button type="button" onclick={loadBoard}><RotateCcw size={16} /> Reload</button>
      <button type="button" class:active={showDebug} onclick={() => (showDebug = !showDebug)} title="Debug"><Bug size={16} /></button>
    </div>

    <div class="help-hint">
      Shift + Drag: リンクを作成
    </div>

    {#if showDebug}
      <div class="debug">
        <div>Nodes: {simulationNodes.length} | Zoom: {transform.k.toFixed(2)}</div>
      </div>
    {/if}

    {#if showEditor}
      <button class="modal-backdrop" type="button" aria-label="Close editor" onclick={() => (showEditor = false)}></button>
      <div class="modal" role="dialog" aria-label="JSON-LD editor">
        <div class="modal-head">
          <div class="modal-title">Presentation JSON-LD</div>
          <button class="icon-btn" type="button" onclick={() => (showEditor = false)}>×</button>
        </div>
        <textarea bind:value={jsonDraft} spellcheck="false"></textarea>
        <div class="modal-actions">
          <button type="button" onclick={async () => {
            await graphStore.saveFile(`251121/260122-presentation/data/presentation.jsonld`, jsonDraft);
            showEditor = false;
            loadBoard();
          }}><Save size={16} /> Save JSON</button>
          <button type="button" onclick={() => (jsonDraft = layoutPretty)}><RotateCcw size={16} /> Reset draft</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&family=Noto+Sans+JP:wght@400;700;900&family=Poppins:wght@400;700;900&display=swap');
  
  .presentation-view {
    width: 100%;
    height: 100%;
    background: #fff;
    color: #333;
    font-family: 'Poppins', 'Noto Sans JP', sans-serif;
    overflow: hidden;
    position: relative;
  }

  .viewport { width: 100%; height: 100%; position: relative; overflow: hidden; }
  .canvas { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
  .bg-grid { position: absolute; width: 20000px; height: 20000px; top: -10000px; left: -10000px; background-image: radial-gradient(circle, #eee 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; }
  .links-layer { position: absolute; width: 20000px; height: 20000px; top: -10000px; left: -10000px; pointer-events: none; }
  .node-card { position: absolute; background: #fff; padding: 15px; border: 1px solid #ddd; box-shadow: 0 10px 30px rgba(0,0,0,0.05); user-select: none; pointer-events: auto; transform-origin: center center; }
  .node-card.fixed { border-color: var(--accent); border-width: 2px; }
  .resize-handle { position: absolute; right: 0; bottom: 0; width: 20px; height: 20px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, #ccc 50%); opacity: 0; transition: opacity 0.2s; }
  .node-card:hover .resize-handle { opacity: 1; }
  .char-card { width: 240px; border-top: 4px solid var(--accent); border-radius: 4px; overflow: hidden; }
  .char-card.fixed { border: 2px solid var(--accent); border-top-width: 6px; }
  .image-box { width: 100%; height: 240px; background: #f0f0f0; margin-bottom: 10px; overflow: hidden; }
  .image-box img { width: 100%; height: 100%; object-fit: cover; }
  .name { font-weight: 900; font-size: 18px; color: #111; }
  .role { font-size: 12px; color: var(--accent); font-weight: 800; margin-bottom: 8px; }
  .cred-tag { font-size: 9px; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-weight: 700; color: #666; }
  .desc { font-size: 11px; color: #666; margin-top: 8px; line-height: 1.4; }
  .concept-card { width: 320px; border-radius: 60px; display: flex; align-items: center; gap: 15px; padding: 20px 26px; border: 2px solid var(--accent); background: #fff; }
  .concept-card.fixed { background: rgba(255,255,255,0.9); box-shadow: 0 0 0 4px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.1); }
  .sip-card { border-radius: 30px; border-width: 3px; }
  .ghost-card { border-radius: 100px; border-style: dashed; }
  .concept-content { display: flex; align-items: center; gap: 15px; }
  .concept-icon { flex-shrink: 0; }
  .concept-card .info { flex: 1; }
  .concept-card .name { font-size: 16px; margin-bottom: 2px; }
  .concept-card .desc { font-size: 10px; margin-top: 0; }
  
  .ghost-content {
    background: #fff;
    border: 2px solid #ff3b30;
    border-radius: 20px;
    padding: 15px;
    position: relative;
  }
  .ghost-content::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 20px;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid #ff3b30;
  }
  
  .sip-content {
    background: #fff;
    border: 2px solid #0071e3;
    border-radius: 40px;
    padding: 20px 30px;
  }
  .ep-card { width: 220px; text-align: left; border-radius: 10px; border-left: 4px solid var(--accent); background: #fff; padding: 12px 16px; }
  .ep-title { font-weight: 900; font-size: 14px; color: #111; margin-bottom: 2px; }
  .ep-theme { font-size: 11px; color: #666; font-weight: 700; }
  .ep-content { position: relative; }
  .ep-content::after { content: '📍'; position: absolute; top: -10px; right: -10px; font-size: 12px; filter: grayscale(1); opacity: 0.5; }
  .fixed .ep-content::after { filter: none; opacity: 1; color: var(--accent); }
  .edge-card { padding: 8px 15px; border-radius: 20px; background: #fff; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .edge-node-content { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #666; white-space: nowrap; }
  .pin-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ddd; cursor: pointer; }
  .fixed .pin-btn { color: var(--accent); }
  .hud { position: absolute; top: 40px; left: 40px; pointer-events: none; z-index: 10; background: rgba(255,255,255,0.8); padding: 20px; border-radius: 8px; backdrop-filter: blur(4px); }
  .glitch-container { display: flex; flex-direction: column; }
  .glitch-logo { position: relative; font-family: 'Courier Prime', monospace; font-size: 80px; font-weight: 700; line-height: 0.85; color: #111; text-transform: uppercase; letter-spacing: -2px; }
  .glitch-logo::before, .glitch-logo::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
  .glitch-logo::before { left: 4px; text-shadow: -3px 0 #ff00ff; color: transparent; opacity: 0.7; }
  .glitch-logo::after { left: -4px; text-shadow: 3px 0 #00ffff; color: transparent; opacity: 0.7; }
  .subtitle { font-size: 18px; color: #999; font-weight: 700; margin-top: 10px; letter-spacing: 5px; border-top: 1px solid #eee; padding-top: 10px; }
  .controls { position: absolute; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 20; }
  .controls button { background: #fff; border: 1px solid #ddd; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; color: #333; }
  .controls button:hover { border-color: #111; }
  .debug { position: absolute; bottom: 18px; right: 18px; background: #000; color: #0f0; padding: 10px; font-size: 11px; font-family: monospace; z-index: 30; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 40; border: none; width: 100%; height: 100%; }
  .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(920px, 92vw); height: min(620px, 86vh); background: #fff; border: 1px solid #ddd; border-radius: 14px; z-index: 50; display: flex; flex-direction: column; box-shadow: 0 30px 80px rgba(0,0,0,0.25); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #eee; }
  .modal-title { font-weight: 700; color: #111; }
  textarea { flex: 1; width: 100%; border: none; padding: 14px; font-family: monospace; font-size: 12px; outline: none; resize: none; color: #333; background: #fff; }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 14px; border-top: 1px solid #eee; }
  .help-hint { position: absolute; bottom: 20px; left: 20px; font-size: 12px; color: #999; font-weight: 700; background: rgba(255,255,255,0.8); padding: 5px 10px; border-radius: 4px; }
  
  .concept-content { display: flex; align-items: center; gap: 15px; }
  .ep-title { font-weight: 900; font-size: 14px; color: #111; margin-bottom: 4px; }
  .ep-theme { font-size: 10px; color: #888; }
</style>
