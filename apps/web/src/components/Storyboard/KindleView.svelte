<script lang="ts">
	/**
	 * Kindle EPUB Editor — A4 graphic novel.
	 * 1-9 panels per page. Draggable bubbles + image pan/zoom.
	 * All positions persisted to JSONLD via gRPC.
	 */
	import { storyboardClient } from '$lib/client/storyboard-client';
	import type { Panel } from '$lib/types/storyboard';

	let {
		panels = [],
		episodeId = '',
		storyboardPath = ''
	} = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
	}>();

	let isSyncing = $state(false);
	const sessionId = Math.random().toString(36).slice(2, 12);
	let syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

	// ---- Drag states ----
	let bubbleDrag = $state<{
		panelKey: string; di: number;
		startX: number; startY: number;
		origX: number; origY: number;
	} | null>(null);

	let imgDrag = $state<{
		panelKey: string;
		startX: number; startY: number;
		origX: number; origY: number;
	} | null>(null);

	let imgOverrides = $state<Map<string, { x: number; y: number; scale: number }>>(new Map());

	// ---- Panel DnD between pages ----
	let panelDragSource = $state<{ pageNumber: number; panel: number } | null>(null);
	let dropTargetPage = $state<number | null>(null);

	function onPanelDragStart(e: DragEvent, panel: Panel) {
		if (!e.dataTransfer) return;
		panelDragSource = { pageNumber: panel.pageNumber, panel: panel.panel };
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', pk(panel));
	}

	function onPageDragOver(e: DragEvent, pageNumber: number) {
		if (!panelDragSource) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropTargetPage = pageNumber;
	}

	function onPageDragLeave() {
		dropTargetPage = null;
	}

	async function onPageDrop(e: DragEvent, targetPageNumber: number) {
		e.preventDefault();
		dropTargetPage = null;
		if (!panelDragSource || !episodeId) return;

		// Don't move to same page
		if (panelDragSource.pageNumber === targetPageNumber) {
			panelDragSource = null;
			return;
		}

		const targetPage = pages.find(p => p.pageNumber === targetPageNumber);
		const insertIdx = targetPage ? targetPage.panels.length : 0;

		isSyncing = true;
		try {
			await storyboardClient.movePanel({
				filePath: storyboardPath,
				episodeId,
				sourcePage: panelDragSource.pageNumber,
				sourcePanel: panelDragSource.panel,
				targetPage: targetPageNumber,
				targetPanelIndex: insertIdx,
				sessionId
			});
			// Reload panels from parent (will trigger via stream updates or manual refresh)
		} catch (err) {
			console.error('[GN] move panel error:', err);
		} finally {
			isSyncing = false;
			panelDragSource = null;
		}
	}

	// ---- Group by page ----
	let pages = $derived.by(() => {
		const sorted = [...panels].sort((a, b) => a.pageNumber - b.pageNumber || a.panel - b.panel);
		const map = new Map<number, Panel[]>();
		for (const p of sorted) {
			const hasContent = (p.data?.generatedImages ?? []).length > 0 ||
				(p.data?.dialogue ?? []).some(d => d.text);
			if (!hasContent) continue;
			if (!map.has(p.pageNumber)) map.set(p.pageNumber, []);
			map.get(p.pageNumber)!.push(p);
		}
		return [...map.entries()].map(([pageNumber, pnls]) => ({ pageNumber, panels: pnls }));
	});

	// ---- Helpers ----

	function pk(panel: Panel): string { return `${panel.pageNumber}-${panel.panel}`; }

	function panelImgUrl(panel: Panel): string {
		const images = panel.data?.generatedImages ?? [];
		if (images.length === 0) return '';
		const idx = panel.data?.currentImageIndex ?? images.length - 1;
		const raw = (images[Math.max(0, Math.min(idx, images.length - 1))]?.imageUrl ?? '').trim();
		if (!raw) return '';
		if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
		// Route through SvelteKit API
		const marker = '/resources/images/';
		const m = raw.indexOf(marker);
		if (m >= 0) return `/api/images/${raw.slice(m + marker.length)}`;
		if (raw.startsWith('/')) return `/api/images${raw}`;
		return `/api/images/${raw}`;
	}

	function findPanel(key: string): Panel | undefined {
		for (const page of pages) for (const p of page.panels) if (pk(p) === key) return p;
		return undefined;
	}

	// ---- Image position ----
	// x,y = object-position (0-100%), scale = size multiplier (1=100%, 2=200%)
	// Larger scale → image overflows cell → object-position pans within it

	function getImgPos(panel: Panel): { x: number; y: number; scale: number } {
		const ov = imgOverrides.get(pk(panel));
		if (ov) return ov;
		const ml = panel.data?.mangaLayout?.panels?.[0];
		return { x: ml?.imageX ?? 50, y: ml?.imageY ?? 50, scale: ml?.imageScale || 1 };
	}

	function imgStyle(panel: Panel): string {
		const { x, y, scale } = getImgPos(panel);
		const pct = scale * 100;
		return `width:${pct}%;height:${pct}%;object-position:${x}% ${y}%`;
	}

	// ---- Bubble position ----

	function bx(panel: Panel, di: number): number {
		return panel.data?.dialogue?.[di]?.mangaLayout?.x ?? (10 + (di % 3) * 25);
	}
	function by(panel: Panel, di: number): number {
		return panel.data?.dialogue?.[di]?.mangaLayout?.y ?? (8 + di * 15);
	}

	// ---- Bubble drag ----

	function onBubbleDown(e: MouseEvent | TouchEvent, panel: Panel, di: number) {
		e.preventDefault();
		e.stopPropagation();
		const pt = 'touches' in e ? e.touches[0]! : e;
		bubbleDrag = { panelKey: pk(panel), di, startX: pt.clientX, startY: pt.clientY, origX: bx(panel, di), origY: by(panel, di) };
	}

	// ---- Image drag ----

	function onImgDown(e: MouseEvent, panel: Panel) {
		if (e.button !== 0) return;
		e.preventDefault();
		const pos = getImgPos(panel);
		imgDrag = { panelKey: pk(panel), startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
	}

	function onWheel(e: WheelEvent, panel: Panel) {
		e.preventDefault();
		const pos = getImgPos(panel);
		const d = e.deltaY > 0 ? -0.1 : 0.1;
		const s = Math.max(1, Math.min(4, pos.scale + d));
		imgOverrides = new Map(imgOverrides).set(pk(panel), { ...pos, scale: s });
		scheduleSave('img', panel);
	}

	// ---- Pointer move/end ----

	function onMove(e: MouseEvent | TouchEvent) {
		const pt = 'touches' in e ? e.touches[0]! : e;

		if (bubbleDrag) {
			const cell = document.querySelector(`[data-pk="${bubbleDrag.panelKey}"]`);
			if (!cell) return;
			const r = cell.getBoundingClientRect();
			const dx = ((pt.clientX - bubbleDrag.startX) / r.width) * 100;
			const dy = ((pt.clientY - bubbleDrag.startY) / r.height) * 100;
			const el = cell.querySelector(`[data-di="${bubbleDrag.di}"]`) as HTMLElement;
			if (el) {
				el.style.left = `${Math.max(0, Math.min(85, bubbleDrag.origX + dx))}%`;
				el.style.top = `${Math.max(0, Math.min(90, bubbleDrag.origY + dy))}%`;
			}
			return;
		}

		if (imgDrag) {
			const cell = document.querySelector(`[data-pk="${imgDrag.panelKey}"]`);
			if (!cell) return;
			const r = cell.getBoundingClientRect();
			// Pan: drag right → object-position x decreases (shows more of left side)
			const dx = ((pt.clientX - imgDrag.startX) / r.width) * 100;
			const dy = ((pt.clientY - imgDrag.startY) / r.height) * 100;
			const panel = findPanel(imgDrag.panelKey);
			if (!panel) return;
			const pos = getImgPos(panel);
			imgOverrides = new Map(imgOverrides).set(imgDrag.panelKey, {
				...pos,
				x: Math.max(0, Math.min(100, imgDrag.origX - dx)),
				y: Math.max(0, Math.min(100, imgDrag.origY - dy))
			});
		}
	}

	function onUp() {
		if (bubbleDrag) {
			const cell = document.querySelector(`[data-pk="${bubbleDrag.panelKey}"]`);
			const el = cell?.querySelector(`[data-di="${bubbleDrag.di}"]`) as HTMLElement | null;
			if (el) {
				const panel = findPanel(bubbleDrag.panelKey);
				if (panel) saveBubblePos(panel, bubbleDrag.di, parseFloat(el.style.left), parseFloat(el.style.top));
			}
			bubbleDrag = null;
		}
		if (imgDrag) {
			const panel = findPanel(imgDrag.panelKey);
			if (panel) saveImgPos(panel);
			imgDrag = null;
		}
	}

	// ---- Save ----

	function scheduleSave(prefix: string, panel: Panel) {
		const key = `${prefix}-${pk(panel)}`;
		if (syncTimers.has(key)) clearTimeout(syncTimers.get(key)!);
		syncTimers.set(key, setTimeout(() => saveImgPos(panel), 1000));
	}

	async function saveImgPos(panel: Panel) {
		const pos = getImgPos(panel);
		const el = panel.data?.mangaLayout;
		isSyncing = true;
		try {
			await storyboardClient.updatePanel({
				episodeId, pageNumber: panel.pageNumber, panel: panel.panel,
				panelData: {
					...panel.data,
					mangaLayout: {
						panels: [{
							panelIndex: panel.panel,
							x: el?.panels?.[0]?.x ?? 0, y: el?.panels?.[0]?.y ?? 0,
							width: el?.panels?.[0]?.width ?? 100, height: el?.panels?.[0]?.height ?? 100,
							shape: '', zIndex: 0,
							imageX: pos.x, imageY: pos.y, imageScale: pos.scale
						}],
						texts: el?.texts ?? []
					}
				}
			});
		} catch (err) { console.error('[GN] img save error:', err); }
		finally { isSyncing = false; }
	}

	async function saveBubblePos(panel: Panel, di: number, x: number, y: number) {
		const dlgs = panel.data?.dialogue ?? [];
		const updated = dlgs.map((d, i) => {
			const ml = d.mangaLayout;
			const layout = i === di
				? { text: ml?.text ?? d.text, type: ml?.type ?? 'dialogue', x, y, fontSize: ml?.fontSize ?? 12, style: ml?.style ?? 'horizontal' }
				: ml ? { ...ml } : undefined;
			return { ...d, mangaLayout: layout };
		});
		isSyncing = true;
		try {
			await storyboardClient.updatePanel({ episodeId, pageNumber: panel.pageNumber, panel: panel.panel, panelData: { ...panel.data, dialogue: updated } });
		} catch (err) { console.error('[GN] bubble save error:', err); }
		finally { isSyncing = false; }
	}

	function parseDialogue(text: string): { speaker: string; text: string } {
		const m = text.match(/^([^:]+):\s*(.+)$/s);
		return m ? { speaker: m[1]!.trim(), text: m[2]!.trim() } : { speaker: '', text: text.trim() };
	}

	function onTextEdit(panel: Panel) {
		const key = `txt-${pk(panel)}`;
		if (syncTimers.has(key)) clearTimeout(syncTimers.get(key)!);
		syncTimers.set(key, setTimeout(() => syncText(panel), 1500));
	}

	async function syncText(panel: Panel) {
		const cell = document.querySelector(`[data-pk="${pk(panel)}"]`);
		if (!cell) return;
		const els = cell.querySelectorAll('.bubble-text');
		const dlgs = panel.data?.dialogue ?? [];
		const updated = dlgs.map((d, i) => {
			const el = els[i] as HTMLElement | undefined;
			const raw = el ? el.innerText.trim() : `${d.speaker}: ${d.text}`;
			const p = parseDialogue(raw);
			return { ...d, speaker: p.speaker || d.speaker, text: p.text || d.text };
		});
		const o = dlgs.map(d => `${d.speaker}:${d.text}`).join('|');
		const n = updated.map(d => `${d.speaker}:${d.text}`).join('|');
		if (o === n) return;
		isSyncing = true;
		try {
			await storyboardClient.updatePanel({ episodeId, pageNumber: panel.pageNumber, panel: panel.panel, panelData: { ...panel.data, dialogue: updated } });
		} catch (err) { console.error('[GN] text save error:', err); }
		finally { isSyncing = false; }
	}

	// ---- Grid layout for 1-9 panels ----

	function gridStyle(count: number): string {
		// Graphic novel layouts optimized for 1-9 panels per page
		switch (count) {
			case 1: return 'grid-template-columns:1fr;grid-template-rows:1fr';
			case 2: return 'grid-template-columns:1fr 1fr;grid-template-rows:1fr';
			case 3: return 'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr';
			case 4: return 'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr';
			case 5: return 'grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr';
			case 6: return 'grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr';
			case 7: return 'grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr 1fr';
			case 8: return 'grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr 1fr';
			case 9: return 'grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr 1fr';
			default: return 'grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr)';
		}
	}

	// First panel of 3-panel layout spans full width
	function cellStyle(count: number, index: number): string {
		if (count === 3 && index === 0) return 'grid-column:1/-1';
		if (count === 5 && index < 2) return ''; // top 2 normal
		if (count === 5 && index === 2) return ''; // bottom 3 on 3-col row
		if (count === 7 && index === 0) return 'grid-column:1/-1'; // hero panel
		if (count === 8 && index < 2) return 'grid-column:span 1'; // top row: 2 panels need adjustment
		return '';
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="gn-scroll" onmousemove={onMove} onmouseup={onUp} ontouchmove={onMove} ontouchend={onUp}>
	{#if isSyncing}<div class="gn-sync"></div>{/if}

	<div class="gn-book">
		{#each pages as page (page.pageNumber)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<section class="gn-page"
				class:gn-drop-target={dropTargetPage === page.pageNumber}
				ondragover={(e) => onPageDragOver(e, page.pageNumber)}
				ondragleave={onPageDragLeave}
				ondrop={(e) => onPageDrop(e, page.pageNumber)}
			>
				<div class="gn-page-num">{page.pageNumber}</div>
				<div class="gn-grid" style={gridStyle(page.panels.length)}>
					{#each page.panels as panel, idx (panel.panel)}
						{@const url = panelImgUrl(panel)}
						{@const dlgs = (panel.data?.dialogue ?? []).filter(d => d.text)}

						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="gn-cell" data-pk="{panel.pageNumber}-{panel.panel}"
							style={cellStyle(page.panels.length, idx)}
							draggable="true"
							ondragstart={(e) => onPanelDragStart(e, panel)}
							ondragend={() => { panelDragSource = null; dropTargetPage = null; }}
							onmousedown={(e) => onImgDown(e, panel)}
							onwheel={(e) => onWheel(e, panel)}
						>
							{#if url}
								<img class="gn-img" src={url} alt="" loading="lazy" style={imgStyle(panel)} draggable="false" />
							{/if}

							<!-- Drag handle -->
							<div class="gn-drag-handle" title="Drag to another page">&#x2630;</div>

							{#each dlgs as d, di}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="bubble" data-di={di}
									style="left:{bx(panel, di)}%;top:{by(panel, di)}%"
									onmousedown={(e) => onBubbleDown(e, panel, di)}
									ontouchstart={(e) => onBubbleDown(e, panel, di)}
								>
									<div class="bubble-tail"></div>
									<div class="bubble-text" contenteditable="true"
										oninput={() => onTextEdit(panel)}
										onblur={() => onTextEdit(panel)}
										onmousedown={(e) => e.stopPropagation()}
										ontouchstart={(e) => e.stopPropagation()}
									>{d.speaker}: {d.text}</div>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>

<style>
	@reference 'tailwindcss';

	.gn-scroll { @apply relative flex-1 overflow-y-auto; background: #d0cabe; }
	.gn-sync { @apply fixed right-4 top-4 z-50 h-2 w-2 rounded-full animate-pulse; background: #c4a96a; }
	.gn-book { max-width: 780px; margin: 0 auto; padding: 20px 16px; }

	.gn-page {
		width: 100%; aspect-ratio: 210 / 297; background: #fff;
		margin: 0 0 20px; padding: 6px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; break-after: page;
	}

	.gn-grid { width: 100%; height: 100%; display: grid; gap: 3px; }

	.gn-page-num {
		position: absolute; top: 2px; left: 6px;
		font-size: 8px; color: #bbb; z-index: 2; pointer-events: none;
	}

	.gn-drop-target {
		outline: 3px dashed #4a90d9;
		outline-offset: -3px;
		background: rgba(74, 144, 217, 0.05);
	}

	.gn-cell {
		position: relative; overflow: hidden; border-radius: 1px;
		background: #111; cursor: grab; min-height: 0;
	}
	.gn-cell:active { cursor: grabbing; }

	.gn-drag-handle {
		position: absolute; top: 3px; right: 3px; z-index: 15;
		background: rgba(0,0,0,0.5); color: #fff;
		width: 20px; height: 20px; border-radius: 4px;
		display: flex; align-items: center; justify-content: center;
		font-size: 10px; cursor: grab; opacity: 0;
		transition: opacity 0.15s;
	}
	.gn-cell:hover > .gn-drag-handle { opacity: 1; }
	.gn-drag-handle:active { cursor: grabbing; }

	.gn-img {
		/* width/height/object-position set by inline style */
		min-width: 100%; min-height: 100%;
		display: block; object-fit: cover;
		position: absolute;
		top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
		user-select: none;
	}

	/* ---- Bubbles ---- */
	.bubble {
		position: absolute; z-index: 10; cursor: grab;
		max-width: 50%; user-select: none;
	}
	.bubble:active { cursor: grabbing; }

	.bubble-text {
		background: #fff; border-radius: 14px; padding: 5px 10px;
		font-family: 'Noto Sans JP', 'Helvetica Neue', Arial, sans-serif;
		font-size: 10px; line-height: 1.45; color: #111;
		box-shadow: 0 1px 3px rgba(0,0,0,0.15);
		outline: none; cursor: text; user-select: text;
		word-break: break-word; min-width: 30px;
	}
	.bubble-text:focus {
		box-shadow: 0 0 0 2px rgba(59,130,246,0.4), 0 1px 3px rgba(0,0,0,0.15);
	}

	.bubble-tail {
		position: absolute; bottom: -5px; left: 14px;
		width: 10px; height: 10px; background: #fff;
		clip-path: polygon(0 0, 100% 0, 50% 100%);
	}

	@media print {
		.gn-scroll { background: white; overflow: visible; }
		.gn-sync { display: none; }
		.gn-book { max-width: none; padding: 0; margin: 0; }
		.gn-page { box-shadow: none; margin: 0; padding: 5mm; width: 210mm; height: 297mm; aspect-ratio: auto; break-after: page; }
		.gn-cell { cursor: default; }
		.bubble { cursor: default; }
		.bubble-text { box-shadow: 0 0 0 0.5px rgba(0,0,0,0.1); }
	}
</style>
