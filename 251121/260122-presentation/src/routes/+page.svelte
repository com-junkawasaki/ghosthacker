<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import * as d3 from 'd3-force';
  import { Eye, Ghost, Lock, Pin, PinOff, Save, RotateCcw, Download, FileJson, Bug, Share2 } from 'lucide-svelte';

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

  const { data } = $props<{ data: any }>();

  const conceptIconById: Record<string, any> = {
    aria: Eye,
    ghost: Ghost,
    sip: Lock
  };

  function ensureNumbers(n: number | undefined, fallback: number) {
    return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  }

  function stripNodeId(id: string): string {
    return id.startsWith('gh:node/') ? id.slice('gh:node/'.length) : id;
  }

  // --- Initial Data Processing (works for both SSR and Client) ---
  const initialBaseNodes: ClientNode[] = (data.board.nodes ?? []).map((n: any) => {
    const x = ensureNumbers(n.x, 0);
    const y = ensureNumbers(n.y, 0);
    return {
      ...n,
      x,
      y,
      scale: n.scale ?? 1,
      fx: n.fixed ? x : null,
      fy: n.fixed ? y : null
    };
  });

  const initialEdgeNodes: ClientNode[] = (data.board.links ?? []).map((l: any, i: number) => {
    return {
      id: `edge-${i}`,
      nodeType: 'edge',
      name: l.label,
      color: l.color,
      sourceId: l.source,
      targetId: l.target,
      x: 0, y: 0, scale: 0.8
    };
  });

  const initialLinks: any[] = [];
  (data.board.links ?? []).forEach((l: any, i: number) => {
    initialLinks.push({ source: l.source, target: `edge-${i}`, color: l.color });
    initialLinks.push({ source: `edge-${i}`, target: l.target, color: l.color });
  });

  // --- State ---
  let transform = $state(structuredClone(data.board.transform));
  let simulationNodes = $state<ClientNode[]>([...initialBaseNodes, ...initialEdgeNodes]);
  let simulationLinks = $state<ClientLink[]>(initialLinks);
  let simulation: d3.Simulation<ClientNode, any> | null = null;

  let draggingNode = $state<ClientNode | null>(null);
  let resizingNode = $state<ClientNode | null>(null);
  let isDraggingCanvas = $state(false);
  let dragStartPointer = { x: 0, y: 0 };
  let dragStartNodePos = { x: 0, y: 0 };

  let showDebug = $state(false);
  let showEditor = $state(false);
  let jsonDraft = $state('');

  // --- Helpers ---
  function getNodeByIdMap(nodes: ClientNode[]) {
    const m = new Map<string, ClientNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }

  // In Svelte 5, $derived works best when used directly or in simple expressions.
  // We'll use a normal function for lookups to avoid "not a function" errors if $derived proxying gets in the way during SSR.
  function asNode(v: string | ClientNode, nodes: ClientNode[]): ClientNode | undefined {
    if (typeof v !== 'string') return v;
    return nodes.find(n => n.id === v);
  }

  function makeClientLayout() {
    const nodes = simulationNodes
      .filter(n => n.nodeType !== 'edge')
      .map((n) => ({
        id: n.id,
        nodeType: n.nodeType,
        name: n.name,
        description: n.description,
        image: n.image,
        role: n.role,
        credentials: n.credentials ?? [],
        color: n.color,
        x: Math.round(n.x),
        y: Math.round(n.y),
        scale: n.scale ?? 1,
        fixed: n.fx != null
      }));

    const links = data.board.links.map((l: any) => ({
      source: typeof l.source === 'string' ? l.source : (l.source as any).id,
      target: typeof l.target === 'string' ? l.target : (l.target as any).id,
      label: l.label,
      color: l.color
    }));

    return { transform, nodes, links };
  }

  const layoutToSave = $derived(JSON.stringify(makeClientLayout()));
  const layoutPretty = $derived(JSON.stringify(makeClientLayout(), null, 2));

  onMount(() => {
    if ((transform?.x ?? 0) === 0 && (transform?.y ?? 0) === 0) {
      transform.x = window.innerWidth / 2;
      transform.y = window.innerHeight / 2;
    }

    simulation = d3
      .forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength((d: any) => d.nodeType === 'edge' ? -400 : -3000))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius((d: any) => (d.nodeType === 'edge' ? 50 : 180)))
      .on('tick', () => {
        simulationNodes = [...simulationNodes];
        simulationLinks = [...simulationLinks];
      });

    return () => simulation?.stop();
  });

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const resizeHandle = target.closest('.resize-handle');
    const card = target.closest('.node-card');

    if (resizeHandle && card) {
      const id = card.getAttribute('data-id');
      resizingNode = simulationNodes.find((n) => n.id === id) ?? null;
    } else if (card) {
      const id = card.getAttribute('data-id');
      const node = simulationNodes.find((n) => n.id === id);
      if (!node) return;
      draggingNode = node;
      dragStartPointer = { x: e.clientX, y: e.clientY };
      dragStartNodePos = { x: node.x, y: node.y };
      draggingNode.fx = node.x;
      draggingNode.fy = node.y;
    } else {
      isDraggingCanvas = true;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (resizingNode) {
      const delta = (e.movementX + e.movementY) / 200;
      resizingNode.scale = Math.min(Math.max((resizingNode.scale ?? 1) + delta, 0.3), 3);
    } else if (draggingNode) {
      const dx = (e.clientX - dragStartPointer.x) / transform.k;
      const dy = (e.clientY - dragStartPointer.y) / transform.k;
      draggingNode.fx = dragStartNodePos.x + dx;
      draggingNode.fy = dragStartNodePos.y + dy;
      simulation?.alphaTarget(0.3).restart();
    } else if (isDraggingCanvas) {
      transform.x += e.movementX;
      transform.y += e.movementY;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (draggingNode && !data.board.nodes.find((n: any) => stripNodeId(n.id) === draggingNode?.id)?.fixed) {
      // If it wasn't originally fixed, unfix it after drag
      // (Unless the user manually pinned it during the drag, which is handled by toggleFix)
      // Actually, let's just keep it fixed if it was dragged, or use the 'fixed' property from data.
      // Better: if it's not pinned, let it flow again.
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
    if (node.fx != null) {
      node.fx = null;
      node.fy = null;
    } else {
      node.fx = node.x;
      node.fy = node.y;
    }
    simulation?.alpha(0.2).restart();
  }

  function resetFromDisk() { window.location.reload(); }
  function openEditor() { jsonDraft = layoutPretty; showEditor = true; }
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
        {@const s = asNode(link.source, simulationNodes)}
        {@const t = asNode(link.target, simulationNodes)}
        {#if s && t}
          <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={link.color || '#999'} stroke-width="2" stroke-opacity="0.2" />
        {/if}
      {/each}
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
            {#if node.image}<div class="image-box"><img src={node.image} alt={node.name} /></div>{/if}
            <div class="info">
              <div class="name">{node.name}</div>
              <div class="role">{node.role}</div>
              <div class="creds">{#each node.credentials ?? [] as cred}<span class="cred-tag">{cred}</span>{/each}</div>
              <p class="desc">{node.description}</p>
            </div>
          {:else if node.nodeType === 'concept'}
            <div class="concept-content">
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
    <form method="POST" action="?/save" use:enhance>
      <input type="hidden" name="layout" value={layoutToSave} />
      <button type="submit"><Save size={16} /> Save</button>
    </form>
    <a class="btn" href="/board.jsonld"><Download size={16} /> Download</a>
    <button type="button" onclick={openEditor}><FileJson size={16} /> JSON-LD</button>
    <button type="button" onclick={resetFromDisk}><RotateCcw size={16} /> Reload</button>
    <button type="button" class:active={showDebug} onclick={() => (showDebug = !showDebug)} title="Debug"><Bug size={16} /></button>
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
        <div class="modal-title">`data/presentation.jsonld` を直接編集</div>
        <button class="icon-btn" type="button" onclick={() => (showEditor = false)}>×</button>
      </div>
      <form method="POST" action="?/save" use:enhance>
        <textarea name="layout" bind:value={jsonDraft} spellcheck="false"></textarea>
        <div class="modal-actions">
          <button type="submit"><Save size={16} /> Save JSON</button>
          <button type="button" onclick={() => (jsonDraft = layoutPretty)}><RotateCcw size={16} /> Reset draft</button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&family=Noto+Sans+JP:wght@400;700;900&family=Poppins:wght@400;700;900&display=swap');
  :global(body) { margin: 0; background: #fff; color: #333; font-family: 'Poppins', 'Noto Sans JP', sans-serif; overflow: hidden; }
  .viewport { width: 100vw; height: 100vh; position: relative; overflow: hidden; background: #fff; }
  .canvas { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
  .bg-grid { position: absolute; width: 20000px; height: 20000px; top: -10000px; left: -10000px; background-image: radial-gradient(circle, #eee 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; }
  .links-layer { position: absolute; width: 20000px; height: 20000px; top: -10000px; left: -10000px; pointer-events: none; }
  .node-card { position: absolute; background: #fff; padding: 15px; border: 1px solid #ddd; box-shadow: 0 10px 30px rgba(0,0,0,0.05); user-select: none; pointer-events: auto; transform-origin: center center; }
  .node-card.fixed { border-color: var(--accent); border-width: 2px; }
  .resize-handle { position: absolute; right: 0; bottom: 0; width: 20px; height: 20px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, #ccc 50%); opacity: 0; transition: opacity 0.2s; }
  .node-card:hover .resize-handle { opacity: 1; }
  .char-card { width: 240px; border-top: 4px solid var(--accent); }
  .image-box { width: 100%; height: 240px; background: #f0f0f0; margin-bottom: 10px; overflow: hidden; }
  .image-box img { width: 100%; height: 100%; object-fit: cover; }
  .name { font-weight: 900; font-size: 18px; }
  .role { font-size: 12px; color: var(--accent); font-weight: 800; margin-bottom: 8px; }
  .cred-tag { font-size: 9px; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-weight: 700; color: #666; }
  .desc { font-size: 11px; color: #666; margin-top: 8px; line-height: 1.4; }
  .concept-card { width: 320px; border-radius: 60px; display: flex; align-items: center; gap: 15px; padding: 20px 26px; border: 2px solid var(--accent); }
  .ep-card { width: 220px; text-align: center; border-radius: 10px; border-bottom: 3px solid #ddd; background: #fafafa; }
  .edge-card { padding: 8px 15px; border-radius: 20px; background: #fff; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .edge-node-content { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #666; white-space: nowrap; }
  .pin-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ddd; cursor: pointer; }
  .fixed .pin-btn { color: var(--accent); }
  .hud { position: fixed; top: 40px; left: 40px; pointer-events: none; z-index: 10; }
  .glitch-container { display: flex; flex-direction: column; }
  .glitch-logo { position: relative; font-family: 'Courier Prime', monospace; font-size: 80px; font-weight: 700; line-height: 0.85; color: #111; text-transform: uppercase; letter-spacing: -2px; }
  .glitch-logo::before, .glitch-logo::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
  .glitch-logo::before { left: 4px; text-shadow: -3px 0 #ff00ff; color: transparent; opacity: 0.7; }
  .glitch-logo::after { left: -4px; text-shadow: 3px 0 #00ffff; color: transparent; opacity: 0.7; }
  .subtitle { font-size: 18px; color: #999; font-weight: 700; margin-top: 10px; letter-spacing: 5px; }
  .controls { position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 20; }
  .controls button, .btn { background: #fff; border: 1px solid #ddd; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; color: #333; text-decoration: none; }
  .controls button:hover, .btn:hover { border-color: #111; }
  .debug { position: fixed; bottom: 18px; right: 18px; background: #000; color: #0f0; padding: 10px; font-size: 11px; font-family: monospace; z-index: 30; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 40; border: none; width: 100%; height: 100%; }
  .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(920px, 92vw); height: min(620px, 86vh); background: #fff; border: 1px solid #ddd; border-radius: 14px; z-index: 50; display: flex; flex-direction: column; box-shadow: 0 30px 80px rgba(0,0,0,0.25); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #eee; }
  textarea { flex: 1; width: 100%; border: none; padding: 14px; font-family: monospace; font-size: 12px; outline: none; resize: none; }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 14px; border-top: 1px solid #eee; }
</style>
