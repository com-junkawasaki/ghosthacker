<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import * as d3 from 'd3-force';
  import { Eye, Ghost, Lock, Pin, PinOff, Save, RotateCcw, Download, FileJson, Bug, Share2, Plus } from 'lucide-svelte';

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

  // --- Initial Data ---
  const initialBaseNodes: ClientNode[] = (data.board.nodes ?? []).map((n: any) => {
    const x = ensureNumbers(n.x, 0);
    const y = ensureNumbers(n.y, 0);
    return { ...n, x, y, scale: n.scale ?? 1, fx: n.fixed ? x : null, fy: n.fixed ? y : null };
  });

  const initialEdgeNodes: ClientNode[] = (data.board.links ?? []).map((l: any, i: number) => ({
    id: `edge-${i}`, nodeType: 'edge', name: l.label, color: l.color, sourceId: l.source, targetId: l.target, x: 0, y: 0, scale: 0.8,
    fixed: !!l.fixed, fx: l.fixed ? (l.x || 0) : null, fy: l.fixed ? (l.y || 0) : null
  }));

  const initialLinks: any[] = [];
  (data.board.links ?? []).forEach((l: any, i: number) => {
    const edgeId = `edge-${i}`;
    initialLinks.push({ source: l.source, target: edgeId, color: l.color });
    initialLinks.push({ source: edgeId, target: l.target, color: l.color });
  });

  // --- State ---
  let transform = $state(structuredClone(data.board.transform));
  let simulationNodes = $state<ClientNode[]>([...initialBaseNodes, ...initialEdgeNodes]);
  let simulationLinks = $state<ClientLink[]>(initialLinks);
  let simulation: d3.Simulation<ClientNode, any> | null = null;

  let draggingNode = $state<ClientNode | null>(null);
  let resizingNode = $state<ClientNode | null>(null);
  let editingNode = $state<ClientNode | null>(null);
  let linkingSource = $state<ClientNode | null>(null);
  let linkingTargetPos = $state({ x: 0, y: 0 });
  let isDraggingCanvas = $state(false);
  let dragStartPointer = { x: 0, y: 0 };
  let dragStartNodePos = { x: 0, y: 0 };

  let showDebug = $state(false);
  let showEditor = $state(false);
  let jsonDraft = $state('');

  function asNode(v: any, nodes: ClientNode[]): ClientNode | undefined {
    if (!v) return undefined;
    if (typeof v === 'object' && v.id) {
      // If it's already an object, find the latest state from simulationNodes
      return nodes.find(n => n.id === v.id);
    }
    if (typeof v === 'string') {
      return nodes.find(n => n.id === v);
    }
    return undefined;
  }

  function makeClientLayout() {
    const nodes = simulationNodes.filter(n => n.nodeType !== 'edge').map((n) => ({
      id: n.id, nodeType: n.nodeType, name: n.name, description: n.description, image: n.image,
      role: n.role, credentials: n.credentials ?? [], color: n.color,
      x: Math.round(n.x), y: Math.round(n.y), scale: n.scale ?? 1, fixed: n.fx != null
    }));

    // Reconstruct original links from simulation links (A -> EdgeNode -> B)
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

  const layoutToSave = $derived(JSON.stringify(makeClientLayout()));
  const layoutPretty = $derived(JSON.stringify(makeClientLayout(), null, 2));

  onMount(() => {
    if ((transform?.x ?? 0) === 0 && (transform?.y ?? 0) === 0) {
      transform.x = window.innerWidth / 2;
      transform.y = window.innerHeight / 2;
    }

    simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength((d: any) => d.nodeType === 'edge' ? -400 : -3000))
      .force('x', d3.forceX(0).strength(0.01))
      .force('y', d3.forceY(0).strength(0.01))
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
    const connectHandle = target.closest('.connect-handle');
    const card = target.closest('.node-card');

    if (e.shiftKey && card) {
      const id = card.getAttribute('data-id');
      linkingSource = simulationNodes.find(n => n.id === id) ?? null;
      linkingTargetPos = { x: (e.clientX - transform.x) / transform.k, y: (e.clientY - transform.y) / transform.k };
    } else if (connectHandle && card) {
      const id = card.getAttribute('data-id');
      linkingSource = simulationNodes.find(n => n.id === id) ?? null;
      linkingTargetPos = { x: (e.clientX - transform.x) / transform.k, y: (e.clientY - transform.y) / transform.k };
    } else if (resizeHandle && card) {
      const id = card.getAttribute('data-id');
      resizingNode = simulationNodes.find((n) => n.id === id) ?? null;
    } else if (card) {
      const id = card.getAttribute('data-id');
      draggingNode = simulationNodes.find((n) => n.id === id) ?? null;
      if (draggingNode) {
        dragStartPointer = { x: e.clientX, y: e.clientY };
        dragStartNodePos = { x: draggingNode.x, y: draggingNode.y };
        draggingNode.fx = draggingNode.x;
        draggingNode.fy = draggingNode.y;
        simulation?.alphaTarget(0.3).restart();
      }
    } else {
      // Check for double click on canvas to add text node
      if (e.detail === 2) {
        const x = (e.clientX - transform.x) / transform.k;
        const y = (e.clientY - transform.y) / transform.k;
        const newNode: ClientNode = {
          id: `text-${Date.now()}`,
          nodeType: 'text',
          name: 'New Text',
          description: '',
          x,
          y,
          scale: 1,
          color: '#333'
        };
        simulationNodes = [...simulationNodes, newNode];
        if (simulation) {
          simulation.nodes(simulationNodes);
          simulation.alpha(0.3).restart();
        }
        editingNode = newNode;
      } else {
        isDraggingCanvas = true;
      }
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (linkingSource) {
      linkingTargetPos = { 
        x: (e.clientX - transform.x) / transform.k, 
        y: (e.clientY - transform.y) / transform.k 
      };
      // Force UI update for the drag line
      simulationNodes = [...simulationNodes];
    } else if (resizingNode) {
      const delta = (e.movementX + e.movementY) / 200;
      resizingNode.scale = Math.min(Math.max((resizingNode.scale ?? 1) + delta, 0.3), 3);
    } else if (draggingNode) {
      const dx = (e.clientX - dragStartPointer.x) / transform.k;
      const dy = (e.clientY - dragStartPointer.y) / transform.k;
      draggingNode.fx = dragStartNodePos.x + dx;
      draggingNode.fy = dragStartNodePos.y + dy;
      
      // Update the node's current x, y immediately for visual feedback
      draggingNode.x = draggingNode.fx;
      draggingNode.y = draggingNode.fy;

      // Force tick and simulation update
      simulation?.alphaTarget(0.3).restart();
      simulationNodes = [...simulationNodes];
      simulationLinks = [...simulationLinks];
    } else if (isDraggingCanvas) {
      transform.x += e.movementX;
      transform.y += e.movementY;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (linkingSource) {
      const targetElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      const card = targetElement?.closest('.node-card');
      if (card) {
        const targetId = card.getAttribute('data-id');
        if (targetId && targetId !== linkingSource.id) {
          const edgeId = `edge-${Date.now()}`;
          const edgeNode: ClientNode = {
            id: edgeId, nodeType: 'edge', name: '', color: '#999',
            sourceId: linkingSource.id, targetId: targetId, x: linkingTargetPos.x, y: linkingTargetPos.y, scale: 0.8,
            fixed: true, fx: linkingTargetPos.x, fy: linkingTargetPos.y
          };
          simulationNodes = [...simulationNodes, edgeNode];
          simulationLinks = [...simulationLinks, 
            { source: linkingSource.id, target: edgeId, color: '#999' },
            { source: edgeId, target: targetId, color: '#999' }
          ];
          
          if (simulation) {
            simulation.nodes(simulationNodes);
            (simulation.force('link') as d3.ForceLink<any, any>).links(simulationLinks);
            simulation.alpha(0.3).restart();
          }
          
          setTimeout(() => {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }, 100);
        }
      }
      linkingSource = null;
    }

    if (draggingNode) {
      draggingNode.x = draggingNode.fx ?? draggingNode.x;
      draggingNode.y = draggingNode.fy ?? draggingNode.y;

      if (!draggingNode.fixed) {
        draggingNode.fx = null;
        draggingNode.fy = null;
      }
      
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }, 0);
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
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    }, 100);
  }

  function resetFromDisk() { window.location.reload(); }
  function openEditor() { jsonDraft = layoutPretty; showEditor = true; }

  function autofocus(node: HTMLTextAreaElement) {
    node.focus();
    node.style.height = 'auto';
    node.style.height = node.scrollHeight + 'px';
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
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="25" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
        </marker>
        <marker id="arrowhead-active" viewBox="0 0 10 10" refX="25" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0071e3" />
        </marker>
      </defs>
      {#each simulationLinks as link}
        {@const s = asNode(link.source, simulationNodes)}
        {@const t = asNode(link.target, simulationNodes)}
        {#if s && t}
          <line 
            x1={s.x} y1={s.y} x2={t.x} y2={t.y} 
            stroke={link.color || '#333'} 
            stroke-width="4" 
            stroke-opacity="1" 
            marker-end={t.nodeType !== 'edge' ? "url(#arrowhead)" : ""}
          />
        {/if}
      {/each}
      {#if linkingSource}
        <line 
          x1={linkingSource.x} y1={linkingSource.y} 
          x2={linkingTargetPos.x} y2={linkingTargetPos.y} 
          stroke="#0071e3" stroke-width="6" stroke-dasharray="10,5" 
          marker-end="url(#arrowhead-active)"
        />
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
            <button
              class="connect-handle"
              onpointerdown={(e) => {
                // Handled by handlePointerDown
              }}
              title="Connect"
            >
              <Plus size={14} />
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
              <Share2 size={14} color={node.color || '#999'} />
              <input
                type="text"
                class="edge-label-input"
                bind:value={node.name}
                onchange={() => {
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }}
                placeholder="relation..."
              />
            </div>
          {:else if node.nodeType === 'text'}
            <div class="text-node-content">
              {#if editingNode?.id === node.id}
                <textarea
                  class="text-node-input"
                  bind:value={node.name}
                  onblur={() => {
                    editingNode = null;
                    const form = document.querySelector('form');
                    if (form) form.requestSubmit();
                  }}
                  oninput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                  onkeydown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                      ev.preventDefault();
                      (ev.target as HTMLTextAreaElement).blur();
                    }
                  }}
                  use:autofocus
                ></textarea>
              {:else}
                <div 
                  role="button"
                  tabindex="0"
                  class="text-display" 
                  ondblclick={(e) => {
                    e.stopPropagation();
                    editingNode = node;
                  }}
                >
                  {node.name || 'Click to edit...'}
                </div>
              {/if}
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
  .canvas { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; z-index: 1; }
  .bg-grid { position: absolute; width: 40000px; height: 40000px; top: -20000px; left: -20000px; background-image: radial-gradient(circle, #eee 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; z-index: -1; }
  .links-layer { position: absolute; width: 40000px; height: 40000px; top: -20000px; left: -20000px; pointer-events: none; z-index: 0; overflow: visible; }
  .nodes-layer { position: absolute; top: 0; left: 0; z-index: 10; pointer-events: none; }
  .node-card { position: absolute; background: #fff; padding: 15px; border: 1px solid #ddd; box-shadow: 0 10px 30px rgba(0,0,0,0.05); user-select: none; pointer-events: auto; transform-origin: center center; z-index: 11; }
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
  .edge-card { padding: 6px 12px; border-radius: 20px; background: #fff; border: 2px solid #333; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 5; }
  .edge-node-content { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #000; white-space: nowrap; }
  .edge-label-input { border: none; background: transparent; font-size: 11px; font-weight: 800; color: #000; width: 90px; outline: none; padding: 0; text-align: center; }
  .edge-label-input::placeholder { color: #bbb; font-weight: 400; }
  .text-card { min-width: 100px; max-width: 300px; border-radius: 4px; padding: 10px; background: rgba(255,255,255,0.9); border: 1px dashed #ccc; }
  .text-node-content { width: 100%; }
  .text-node-input { width: 100%; border: none; background: transparent; font-family: inherit; font-size: 14px; padding: 0; outline: none; resize: none; min-height: 1.2em; overflow: hidden; }
  .text-display { font-size: 14px; line-height: 1.4; white-space: pre-wrap; cursor: text; min-height: 1.2em; }
  .pin-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ddd; cursor: pointer; }
  .connect-handle { position: absolute; bottom: 10px; right: 10px; background: #fff; border: 1px solid #ddd; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #999; cursor: crosshair; transition: all 0.2s; z-index: 20; }
  .connect-handle:hover { border-color: var(--accent); color: var(--accent); transform: scale(1.1); }
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
  .help-hint { position: fixed; bottom: 20px; left: 20px; font-size: 12px; color: #999; font-weight: 700; background: rgba(255,255,255,0.8); padding: 5px 10px; border-radius: 4px; }
</style>
