<script lang="ts">
	/**
	 * Kindle EPUB Editor — A4 graphic novel with draggable speech bubbles.
	 * Bubble positions stored in dialogue.mangaLayout (x%, y%) → JSONLD via gRPC.
	 */
	import { storyboardClient } from '$lib/client/storyboard-client';
	import { create } from '@bufbuild/protobuf';
	import { PanelDataSchema, DialogueSchema, MangaTextSchema } from '$lib/gen/proto/storyboard_pb';
	import type { Panel } from '$lib/gen/proto/storyboard_pb';

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

	// ---- Drag state ----
	let dragging = $state<{ panelKey: string; di: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

	// ---- Group by page ----
	type PageGroup = { pageNumber: number; panels: Panel[] };

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
		return [...map.entries()].map(([pageNumber, panels]) => ({ pageNumber, panels }));
	});

	// ---- Image URL ----

	function imgBase(): string {
		if (typeof window !== 'undefined' && window.location.port === '1421')
			return 'http://localhost:8081';
		return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
	}

	function panelImgUrl(panel: Panel): string {
		const images = panel.data?.generatedImages ?? [];
		if (images.length === 0) return '';
		const idx = panel.data?.currentImageIndex ?? images.length - 1;
		const raw = (images[Math.max(0, Math.min(idx, images.length - 1))]?.imageUrl ?? '').trim();
		if (!raw) return '';
		if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
		const m = raw.indexOf('/resources/images/');
		if (m >= 0) return `${imgBase()}/images/${raw.slice(m + '/resources/images/'.length)}`;
		return `${imgBase()}/${raw.startsWith('/') ? raw.slice(1) : raw}`;
	}

	// ---- Bubble position helpers ----

	function bubbleX(panel: Panel, di: number): number {
		return panel.data?.dialogue?.[di]?.mangaLayout?.x ?? defaultX(di);
	}

	function bubbleY(panel: Panel, di: number): number {
		return panel.data?.dialogue?.[di]?.mangaLayout?.y ?? defaultY(di);
	}

	function defaultX(di: number): number {
		// Stagger bubbles diagonally
		return 10 + (di % 3) * 25;
	}

	function defaultY(di: number): number {
		return 10 + di * 18;
	}

	// ---- Drag ----

	function onDragStart(e: MouseEvent | TouchEvent, panel: Panel, di: number) {
		e.preventDefault();
		const pt = 'touches' in e ? e.touches[0]! : e;
		const key = `${panel.pageNumber}-${panel.panel}`;
		dragging = {
			panelKey: key, di,
			startX: pt.clientX, startY: pt.clientY,
			origX: bubbleX(panel, di), origY: bubbleY(panel, di)
		};
	}

	function onDragMove(e: MouseEvent | TouchEvent) {
		if (!dragging) return;
		const pt = 'touches' in e ? e.touches[0]! : e;
		const cell = document.querySelector(`[data-panel-key="${dragging.panelKey}"]`);
		if (!cell) return;
		const rect = cell.getBoundingClientRect();
		const dx = ((pt.clientX - dragging.startX) / rect.width) * 100;
		const dy = ((pt.clientY - dragging.startY) / rect.height) * 100;
		const bubble = cell.querySelector(`[data-di="${dragging.di}"]`) as HTMLElement;
		if (bubble) {
			const nx = Math.max(0, Math.min(85, dragging.origX + dx));
			const ny = Math.max(0, Math.min(90, dragging.origY + dy));
			bubble.style.left = `${nx}%`;
			bubble.style.top = `${ny}%`;
		}
	}

	function onDragEnd() {
		if (!dragging) return;
		const cell = document.querySelector(`[data-panel-key="${dragging.panelKey}"]`);
		if (!cell) { dragging = null; return; }
		const bubble = cell.querySelector(`[data-di="${dragging.di}"]`) as HTMLElement;
		if (!bubble) { dragging = null; return; }
		const nx = parseFloat(bubble.style.left);
		const ny = parseFloat(bubble.style.top);

		// Find the panel and save position
		for (const page of pages) {
			for (const panel of page.panels) {
				if (`${panel.pageNumber}-${panel.panel}` === dragging.panelKey) {
					saveBubblePosition(panel, dragging.di, nx, ny);
					break;
				}
			}
		}
		dragging = null;
	}

	// ---- Write-back ----

	function parseDialogue(text: string): { speaker: string; text: string } {
		const m = text.match(/^([^:]+):\s*(.+)$/s);
		return m ? { speaker: m[1]!.trim(), text: m[2]!.trim() } : { speaker: '', text: text.trim() };
	}

	let syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

	function onTextEdit(panel: Panel, di: number, el: HTMLElement) {
		const key = `${panel.pageNumber}-${panel.panel}`;
		if (syncTimers.has(key)) clearTimeout(syncTimers.get(key)!);
		syncTimers.set(key, setTimeout(() => syncPanelDialogue(panel), 1500));
	}

	async function saveBubblePosition(panel: Panel, di: number, x: number, y: number) {
		const dialogues = panel.data?.dialogue ?? [];
		const updated = dialogues.map((d, i) => {
			const ml = d.mangaLayout;
			if (i === di) {
				return create(DialogueSchema, {
					speaker: d.speaker, text: d.text,
					delivery: d.delivery, subtext: d.subtext, emotion: d.emotion,
					pauseBeforeMs: d.pauseBeforeMs, pauseAfterMs: d.pauseAfterMs,
					mangaLayout: create(MangaTextSchema, {
						text: ml?.text ?? d.text,
						type: ml?.type ?? 'dialogue',
						x, y,
						fontSize: ml?.fontSize ?? 12,
						style: ml?.style ?? 'horizontal'
					})
				});
			}
			return create(DialogueSchema, {
				speaker: d.speaker, text: d.text,
				delivery: d.delivery, subtext: d.subtext, emotion: d.emotion,
				pauseBeforeMs: d.pauseBeforeMs, pauseAfterMs: d.pauseAfterMs,
				mangaLayout: ml ? create(MangaTextSchema, { ...ml }) : undefined
			});
		});

		isSyncing = true;
		try {
			await storyboardClient.updatePanel({
				filePath: storyboardPath, episodeId,
				pageNumber: panel.pageNumber, panel: panel.panel,
				panelData: create(PanelDataSchema, { ...panel.data, dialogue: updated }),
				sessionId
			});
		} catch (err) { console.error('[Kindle] save position error:', err); }
		finally { isSyncing = false; }
	}

	async function syncPanelDialogue(panel: Panel) {
		const cell = document.querySelector(`[data-panel-key="${panel.pageNumber}-${panel.panel}"]`);
		if (!cell) return;
		const bubbleEls = cell.querySelectorAll('.bubble-text');
		const dialogues = panel.data?.dialogue ?? [];

		const updated = dialogues.map((d, i) => {
			const el = bubbleEls[i] as HTMLElement | undefined;
			const newText = el ? el.innerText.trim() : d.text;
			const parsed = parseDialogue(newText || `${d.speaker}: ${d.text}`);
			return create(DialogueSchema, {
				speaker: parsed.speaker || d.speaker,
				text: parsed.text || d.text,
				delivery: d.delivery, subtext: d.subtext, emotion: d.emotion,
				pauseBeforeMs: d.pauseBeforeMs, pauseAfterMs: d.pauseAfterMs,
				mangaLayout: d.mangaLayout ? create(MangaTextSchema, { ...d.mangaLayout }) : undefined
			});
		});

		const orig = dialogues.map(d => ({ speaker: d.speaker, text: d.text }));
		const newD = updated.map(d => ({ speaker: d.speaker, text: d.text }));
		if (JSON.stringify(orig) === JSON.stringify(newD)) return;

		isSyncing = true;
		try {
			await storyboardClient.updatePanel({
				filePath: storyboardPath, episodeId,
				pageNumber: panel.pageNumber, panel: panel.panel,
				panelData: create(PanelDataSchema, { ...panel.data, dialogue: updated }),
				sessionId
			});
		} catch (err) { console.error('[Kindle] sync error:', err); }
		finally { isSyncing = false; }
	}

	function gridClass(count: number): string {
		if (count === 1) return 'gn-grid-1';
		if (count === 2) return 'gn-grid-2';
		if (count === 3) return 'gn-grid-3';
		return 'gn-grid-4';
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="gn-scroll"
	onmousemove={onDragMove}
	onmouseup={onDragEnd}
	ontouchmove={onDragMove}
	ontouchend={onDragEnd}
>
	{#if isSyncing}
		<div class="gn-sync-dot"></div>
	{/if}

	<div class="gn-book">
		{#each pages as page (page.pageNumber)}
			<section class="gn-page">
				<div class="gn-grid {gridClass(page.panels.length)}">
					{#each page.panels as panel (panel.panel)}
						{@const url = panelImgUrl(panel)}
						{@const dialogues = (panel.data?.dialogue ?? []).filter(d => d.text)}

						<div class="gn-cell" data-panel-key="{panel.pageNumber}-{panel.panel}">
							<!-- Image fills cell -->
							{#if url}
								<img class="gn-img" src={url} alt="" loading="lazy" />
							{/if}

							<!-- Speech bubbles overlaid on image -->
							{#each dialogues as d, di}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="bubble"
									data-di={di}
									style="left:{bubbleX(panel, di)}%;top:{bubbleY(panel, di)}%"
									onmousedown={(e) => onDragStart(e, panel, di)}
									ontouchstart={(e) => onDragStart(e, panel, di)}
								>
									<div class="bubble-tail"></div>
									<div
										class="bubble-text"
										contenteditable="true"
										oninput={() => onTextEdit(panel, di, document.activeElement as HTMLElement)}
										onblur={() => onTextEdit(panel, di, document.activeElement as HTMLElement)}
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

	.gn-scroll {
		@apply relative flex-1 overflow-y-auto;
		background: #d0cabe;
		-webkit-overflow-scrolling: touch;
	}

	.gn-sync-dot {
		@apply fixed right-4 top-4 z-50 h-2 w-2 rounded-full animate-pulse;
		background: #c4a96a;
	}

	.gn-book {
		max-width: 780px;
		margin: 0 auto;
		padding: 20px 16px;
	}

	/* ---- A4 Page ---- */
	.gn-page {
		width: 100%;
		aspect-ratio: 210 / 297;
		background: #fff;
		margin: 0 0 20px;
		padding: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		break-after: page;
	}

	/* ---- Grid ---- */
	.gn-grid {
		width: 100%;
		height: 100%;
		display: grid;
		gap: 4px;
	}
	.gn-grid-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
	.gn-grid-2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
	.gn-grid-3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
	.gn-grid-3 > .gn-cell:first-child { grid-column: 1 / -1; }
	.gn-grid-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

	/* ---- Panel cell ---- */
	.gn-cell {
		position: relative;
		overflow: hidden;
		border-radius: 2px;
		background: #111;
	}

	/* ---- Image ---- */
	.gn-img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		position: absolute;
		inset: 0;
	}

	/* ---- Speech Bubble ---- */
	.bubble {
		position: absolute;
		z-index: 10;
		cursor: grab;
		max-width: 55%;
		user-select: none;
	}

	.bubble:active {
		cursor: grabbing;
	}

	.bubble-text {
		background: #fff;
		border-radius: 14px;
		padding: 6px 12px;
		font-family: 'Noto Sans JP', 'Helvetica Neue', Arial, sans-serif;
		font-size: 11px;
		line-height: 1.5;
		color: #111;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
		outline: none;
		cursor: text;
		user-select: text;
		word-break: break-word;
		min-width: 40px;
	}

	.bubble-text:focus {
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4), 0 1px 4px rgba(0, 0, 0, 0.15);
	}

	.bubble-tail {
		position: absolute;
		bottom: -6px;
		left: 16px;
		width: 12px;
		height: 12px;
		background: #fff;
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
	}

	/* ---- Print ---- */
	@media print {
		.gn-scroll { background: white; overflow: visible; }
		.gn-sync-dot { display: none; }
		.gn-book { max-width: none; padding: 0; margin: 0; }
		.gn-page {
			box-shadow: none; margin: 0; padding: 6mm;
			width: 210mm; height: 297mm; aspect-ratio: auto;
			break-after: page;
		}
		.bubble { cursor: default; }
		.bubble-text { box-shadow: 0 0 0 0.5px rgba(0,0,0,0.1); }
	}
</style>
