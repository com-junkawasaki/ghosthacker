<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import * as d3 from 'd3-force';
  import type { PageData } from './$types';
  import { Eye, Ghost, Lock, Pin, PinOff, Save, RotateCcw, Download, FileJson, Bug } from 'lucide-svelte';

  type ClientNode = {
    id: string;
    nodeType: 'char' | 'concept' | 'ep' | string;
    name?: string;
    description?: string;
    image?: string;
    role?: string;
    credentials?: string[];
    color?: string;
    x?: number;
    y?: number;
    fixed?: boolean;
    // d3 runtime fields
    fx?: number | null;
    fy?: number | null;
  };

  type ClientLink = {
    source: string | ClientNode;
    target: string | ClientNode;
    label?: string;
    color?: string;
  };

  const { data } = $props<{ data: PageData }>();

  const conceptIconById: Record<string, any> = {
    aria: Eye,
    ghost: Ghost,
    sip: Lock
  };

  let transform = $state(structuredClone(data.board.transform));
  let simulationNodes = $state<ClientNode[]>([]);
  let simulationLinks = $state<ClientLink[]>([]);
  let simulation: d3.Simulation<ClientNode, undefined> | null = null;

  let draggingNode = $state<ClientNode | null>(null);
  let isDraggingCanvas = $state(false);

  let showDebug = $state(false);
  let showEditor = $state(false);
  let jsonDraft = $state('');

  function ensureNumbers(n: number | undefined, fallback: number) {
    return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  }

  function makeClientLayout() {
    const nodes = simulationNodes.map((n) => ({
      id: n.id,
      nodeType: n.nodeType,
      name: n.name,
      description: n.description,
      image: n.image,
      role: n.role,
      credentials: n.credentials ?? [],
      color: n.color,
      x: Math.round(ensureNumbers(n.x, 0)),
      y: Math.round(ensureNumbers(n.y, 0)),
      fixed: n.fx != null
    }));

    const links = data.board.links.map((l) => ({
      source: typeof l.source === 'string' ? l.source : (l.source as any).id,
      target: typeof l.target === 'string' ? l.target : (l.target as any).id,
      label: l.label,
      color: l.color
    }));

    return {
      transform,
      nodes,
      links
    };
  }

  const layoutToSave = $derived(JSON.stringify(makeClientLayout()));
  const layoutPretty = $derived(JSON.stringify(makeClientLayout(), null, 2));

  onMount(() => {
    // If transform is not set, center roughly
    if ((transform?.x ?? 0) === 0 && (transform?.y ?? 0) === 0) {
      transform.x = window.innerWidth / 2;
      transform.y = window.innerHeight / 2;
    }

    simulationNodes = data.board.nodes.map((n: any) => {
      const x = ensureNumbers(n.x, (Math.random() - 0.5) * 900);
      const y = ensureNumbers(n.y, (Math.random() - 0.5) * 900);
      const fixed = !!n.fixed;
      return {
        ...n,
        x,
        y,
        fx: fixed ? x : null,
        fy: fixed ? y : null
      } satisfies ClientNode;
    });

    simulationLinks = data.board.links.map((l: any) => ({ ...l })) as ClientLink[];

    simulation = d3
      .forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks as any).id((d: any) => d.id).distance(260))
      .force('charge', d3.forceManyBody().strength(-2200))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius((d: any) => (d.nodeType === 'ep' ? 110 : 160)))
      .on('tick', () => {
        simulationNodes = [...simulationNodes];
        simulationLinks = [...simulationLinks];
      });

    return () => simulation?.stop();
  });

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const card = target.closest('.node-card');
    if (card) {
      const id = card.getAttribute('data-id');
      const node = simulationNodes.find((n) => n.id === id);
      if (!node) return;
      draggingNode = node;
      draggingNode.fx = ensureNumbers(draggingNode.x, 0);
      draggingNode.fy = ensureNumbers(draggingNode.y, 0);
    } else {
      isDraggingCanvas = true;
    }
    // @ts-ignore
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (draggingNode) {
      draggingNode.fx = ensureNumbers(draggingNode.fx ?? draggingNode.x, 0) + e.movementX / transform.k;
      draggingNode.fy = ensureNumbers(draggingNode.fy ?? draggingNode.y, 0) + e.movementY / transform.k;
      simulation?.alphaTarget(0.3).restart();
    } else if (isDraggingCanvas) {
      transform.x += e.movementX;
      transform.y += e.movementY;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    draggingNode = null;
    isDraggingCanvas = false;
    simulation?.alphaTarget(0);
    // @ts-ignore
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
      node.fx = ensureNumbers(node.x, 0);
      node.fy = ensureNumbers(node.y, 0);
    }
    simulation?.alpha(0.25).restart();
  }

  function resetFromDisk() {
    window.location.reload();
  }

  function openEditor() {
    jsonDraft = layoutPretty;
    showEditor = true;
  }
</script>

<div
  class="viewport"
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
  on:wheel={handleWheel}
>
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
        {#if link.source && link.target && typeof link.source === 'object' && typeof link.target === 'object'}
          <g>
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke={link.color || '#999'}
              stroke-width="2"
              stroke-opacity="0.25"
            />
            {#if link.label}
              <text
                x={(link.source.x + link.target.x) / 2}
                y={(link.source.y + link.target.y) / 2}
                fill={link.color || '#999'}
                font-size="12"
                text-anchor="middle"
                dy="-10"
                class="link-label"
              >
                {link.label}
              </text>
            {/if}
          </g>
        {/if}
      {/each}
    </svg>

    <div class="nodes-layer">
      {#each simulationNodes as node (node.id)}
        <div
          class="node-card {node.nodeType}-card"
          class:fixed={node.fx != null}
          style="left: {node.x}px; top: {node.y}px; --accent: {node.color}"
          data-id={node.id}
        >
          <button class="pin-btn" on:click={(e) => toggleFix(node, e)} title="Pin">
            {#if node.fx != null}
              <Pin size={14} fill="currentColor" />
            {:else}
              <PinOff size={14} />
            {/if}
          </button>

          {#if node.nodeType === 'char'}
            {#if node.image}
              <div class="image-box"><img src={node.image} alt={node.name} /></div>
            {/if}
            <div class="info">
              <div class="name">{node.name}</div>
              <div class="role">{node.role}</div>
              <div class="creds">
                {#each node.credentials ?? [] as cred}<span class="cred-tag">{cred}</span>{/each}
              </div>
              <p class="desc">{node.description}</p>
            </div>
          {:else if node.nodeType === 'concept'}
            <div class="concept-content">
              <div class="concept-icon">
                {#if conceptIconById[node.id]}
                  <svelte:component this={conceptIconById[node.id]} size={32} color={node.color} />
                {:else}
                  <Ghost size={32} color={node.color} />
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
          {:else}
            <div class="info">
              <div class="name">{node.name}</div>
              <p class="desc">{node.description}</p>
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

    <button type="button" on:click={openEditor}><FileJson size={16} /> JSON-LD</button>
    <button type="button" on:click={resetFromDisk}><RotateCcw size={16} /> Reload</button>
    <button type="button" class:active={showDebug} on:click={() => (showDebug = !showDebug)} title="Debug">
      <Bug size={16} />
    </button>
  </div>

  {#if showDebug}
    <div class="debug">
      <div>Nodes: {simulationNodes.length}</div>
      <div>Links: {simulationLinks.length}</div>
      <div>Zoom: {transform.k.toFixed(2)}</div>
    </div>
  {/if}

  {#if showEditor}
    <div class="modal-backdrop" on:click={() => (showEditor = false)} />
    <div class="modal" role="dialog" aria-label="JSON-LD editor">
      <div class="modal-head">
        <div class="modal-title">`data/ghosthacker-board.jsonld` を編集して保存</div>
        <button class="icon-btn" type="button" on:click={() => (showEditor = false)}>×</button>
      </div>

      <form method="POST" action="?/save" use:enhance>
        <textarea name="layout" bind:value={jsonDraft} spellcheck="false" />
        <div class="modal-actions">
          <button type="submit"><Save size={16} /> Save JSON</button>
          <button type="button" on:click={() => (jsonDraft = layoutPretty)}><RotateCcw size={16} /> Reset draft</button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&family=Noto+Sans+JP:wght@400;700;900&family=Poppins:wght@400;700;900&display=swap');

  :global(body) { margin: 0; background: #fff; color: #333; font-family: 'Poppins', 'Noto Sans JP', sans-serif; overflow: hidden; }

  .viewport { width: 100vw; height: 100vh; position: relative; overflow: hidden; background: #fff; }
  .canvas { position: absolute; transform-origin: 0 0; will-change: transform; }

  .bg-grid {
    position: absolute;
    width: 20000px;
    height: 20000px;
    top: -10000px;
    left: -10000px;
    background-image: radial-gradient(circle, #eee 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
  }

  .links-layer { position: absolute; width: 20000px; height: 20000px; top: -10000px; left: -10000px; pointer-events: none; }
  .link-label { font-weight: 700; paint-order: stroke; stroke: #fff; stroke-width: 4px; pointer-events: none; }

  .node-card {
    position: absolute;
    transform: translate(-50%, -50%);
    background: #fff;
    padding: 15px;
    border: 1px solid #ddd;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    user-select: none;
    pointer-events: auto;
  }
  .node-card.fixed { border-color: var(--accent); border-width: 2px; }

  .char-card { width: 240px; border-top: 4px solid var(--accent); }
  .image-box { width: 100%; height: 240px; background: #f0f0f0; margin-bottom: 10px; overflow: hidden; }
  .image-box img { width: 100%; height: 100%; object-fit: cover; }

  .name { font-weight: 900; font-size: 18px; }
  .role { font-size: 12px; color: var(--accent); font-weight: 800; margin-bottom: 8px; }
  .cred-tag { font-size: 9px; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-weight: 700; color: #666; }
  .desc { font-size: 11px; color: #666; margin-top: 8px; line-height: 1.4; }

  .concept-card { width: 320px; border-radius: 60px; display: flex; align-items: center; gap: 15px; padding: 20px 26px; border: 2px solid var(--accent); }
  .concept-content { display: flex; align-items: center; gap: 15px; }

  .ep-card { width: 220px; text-align: center; border-radius: 10px; border-bottom: 3px solid #ddd; background: #fafafa; }
  .ep-title { font-size: 13px; font-weight: 900; color: #111; }
  .ep-theme { font-size: 11px; color: #777; margin-top: 6px; }

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
  .controls button, .btn {
    background: #fff;
    border: 1px solid #ddd;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #333;
    text-decoration: none;
  }
  .controls button:hover, .btn:hover { border-color: #111; }
  .controls button.active { border-color: #111; }

  .debug { position: fixed; bottom: 18px; right: 18px; background: #000; color: #0f0; padding: 10px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; z-index: 30; }

  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 40; }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(920px, 92vw);
    height: min(620px, 86vh);
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 14px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    box-shadow: 0 30px 80px rgba(0,0,0,0.25);
  }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #eee; }
  .modal-title { font-weight: 900; font-size: 12px; color: #333; }
  .icon-btn { border: 1px solid #ddd; background: #fff; border-radius: 8px; padding: 4px 10px; cursor: pointer; }
  textarea {
    flex: 1;
    width: 100%;
    border: none;
    padding: 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-size: 12px;
    outline: none;
    resize: none;
  }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 14px; border-top: 1px solid #eee; }
</style>
