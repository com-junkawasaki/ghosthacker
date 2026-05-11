<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import { MangaTextSchema, PanelDataSchema, DialogueSchema, MangaLayoutSchema } from '$lib/gen/proto/storyboard_pb';
	import { create } from '@bufbuild/protobuf';

	// Svelte 5 props
	let { panel, onupdate, onpanelSelect } = $props<{
		panel: Panel;
		episodeId?: string;
		storyboardPath?: string;
		onupdate?: (data: PanelData) => void;
		onpanelSelect?: (panel: Panel) => void;
	}>();

	const dispatch = createEventDispatcher();
	function emitUpdate(data: PanelData) {
		if (onupdate) onupdate(data);
		else dispatch('update', data);
	}
	function emitPanelSelect(p: Panel) {
		if (onpanelSelect) onpanelSelect(p);
		else dispatch('panelSelect', p);
	}

	// Derived states for easy access
	let generatedImages = $derived(panel.data?.generatedImages ?? []);
	let currentImageIndex = $derived(panel.data?.currentImageIndex ?? (generatedImages.length > 0 ? generatedImages.length - 1 : -1));

	// Resolve image URLs through the SvelteKit /api/images/ proxy so they work
	// regardless of the Go backend's port / origin (StoryboardPanel & KindleView
	// use the same proxy — MangaPanel previously hit :8081 cross-origin and
	// would silently break outside the local Vite dev setup).
	function resolveImageUrl(rawUrl: string): string {
		const url = (rawUrl ?? '').trim();
		if (!url) return '';
		if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
		const marker = '/resources/images/';
		const markerIndex = url.indexOf(marker);
		if (markerIndex >= 0) return `/api/images/${url.slice(markerIndex + marker.length)}`;
		if (url.startsWith('/images/')) return `/api/images/${url.slice('/images/'.length)}`;
		if (url.startsWith('/')) return `/api/images${url}`;
		return `/api/images/${url}`;
	}

	let currentImageUrl = $derived(
		currentImageIndex >= 0 && currentImageIndex < generatedImages.length
			? resolveImageUrl(generatedImages[currentImageIndex]?.imageUrl ?? '')
			: ''
	);

	let imageLoadFailed = $state(false);
	$effect(() => {
		// Reset failure flag whenever the URL we're trying to display changes
		void currentImageUrl;
		imageLoadFailed = false;
	});

	function selectVersion(index: number) {
		if (!panel.data) return;
		if (index < 0 || index >= generatedImages.length) return;
		if (index === currentImageIndex) return;
		// IMPORTANT: build a plain object, NOT create(PanelDataSchema, ...).
		// Proto's `create()` converts int64 fields (generatedAt) into BigInt,
		// which makes JSON.stringify() throw inside the API client and silently
		// drop the request — so the episode JSON-LD would never get written.
		// The /api/panels/update handler reads the same shape as $lib/types
		// PanelData (numbers everywhere), so a plain spread is sufficient.
		const sanitizedImages = generatedImages.map((img: any) => ({
			imageUrl: img?.imageUrl ?? '',
			imagePrompt: img?.imagePrompt ?? '',
			generatedAt: typeof img?.generatedAt === 'bigint' ? Number(img.generatedAt) : (img?.generatedAt ?? 0),
			model: img?.model ?? '',
		}));
		const updatedData = {
			...panel.data,
			generatedImages: sanitizedImages,
			currentImageIndex: index,
			generatedImageUrl: sanitizedImages[index]?.imageUrl ?? panel.data.generatedImageUrl,
		} as PanelData;
		emitUpdate(updatedData);
	}

	function navigateVersion(direction: 'prev' | 'next') {
		if (generatedImages.length === 0) return;
		const len = generatedImages.length;
		const cur = currentImageIndex < 0 ? 0 : currentImageIndex;
		const next = direction === 'prev' ? (cur - 1 + len) % len : (cur + 1) % len;
		selectVersion(next);
	}

	let dialogues = $derived(panel.data?.dialogue ?? []);
	let visualNote = $derived(panel.data?.visualNote ?? '');
	let mangaLayout = $derived(panel.data?.mangaLayout);
	let panelLayout = $derived(mangaLayout?.panels?.find((p: any) => p.panelIndex === panel.panel));

	let imageStyle = $derived(panelLayout ? `
		object-position: ${panelLayout.imageX}% ${panelLayout.imageY}%;
		transform: scale(${panelLayout.imageScale || 1.0});
	` : '');

	// Drag state
	let draggingElement = $state<{ type: 'image' | 'dialogue' | 'sfx', index: number } | null>(null);
	let dragStartPos = { x: 0, y: 0 };
	let initialElementPos = { x: 0, y: 0 };
	let containerRect: DOMRect | null = null;

	function handlePointerDown(event: PointerEvent, type: 'image' | 'dialogue' | 'sfx', index: number = 0) {
		const target = event.currentTarget as HTMLElement;
		containerRect = target.closest('.manga-panel')?.getBoundingClientRect() || null;
		if (!containerRect) return;

		if (type !== 'image') {
			event.stopPropagation();
		}

		draggingElement = { type, index };
		dragStartPos = { x: event.clientX, y: event.clientY };

		if (type === 'image') {
			initialElementPos = { x: panelLayout?.imageX ?? 50, y: panelLayout?.imageY ?? 50 };
		} else if (type === 'dialogue') {
			const d = dialogues[index];
			initialElementPos = { x: d?.mangaLayout?.x ?? 10, y: d?.mangaLayout?.y ?? 20 };
		} else if (type === 'sfx') {
			const s = mangaLayout?.texts[index];
			initialElementPos = { x: s?.x ?? 50, y: s?.y ?? 50 };
		}

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
		target.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!draggingElement || !containerRect) return;

		const dx = ((event.clientX - dragStartPos.x) / containerRect.width) * 100;
		const dy = ((event.clientY - dragStartPos.y) / containerRect.height) * 100;

		if (draggingElement.type === 'image') {
			updateImagePositionLocal(initialElementPos.x - dx, initialElementPos.y - dy);
		} else if (draggingElement.type === 'dialogue') {
			updateDialoguePositionLocal(draggingElement.index, initialElementPos.x + dx, initialElementPos.y + dy);
		} else if (draggingElement.type === 'sfx') {
			updateSFXPositionLocal(draggingElement.index, initialElementPos.x + dx, initialElementPos.y + dy);
		}
	}

	function handlePointerUp(event: PointerEvent) {
		if (draggingElement) {
			saveCurrentState();
		}
		draggingElement = null;
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
		
		try {
			const target = event.target as HTMLElement;
			if (target && target.releasePointerCapture) {
				target.releasePointerCapture(event.pointerId);
			}
		} catch (e) {
			// Ignore
		}
	}

	function updateImagePositionLocal(x: number, y: number) {
		if (!mangaLayout || !panelLayout || !panel.data) return;
		const newPanels = mangaLayout.panels.map((p: any) => {
			if (p.panelIndex === panel.panel) {
				return create(p.constructor as any, { 
					...p, 
					imageX: Math.max(0, Math.min(100, x)), 
					imageY: Math.max(0, Math.min(100, y)) 
				});
			}
			return p;
		});
		
		const updatedData = create(PanelDataSchema, { 
			...panel.data, 
			mangaLayout: create(MangaLayoutSchema, {
				panels: newPanels as any[],
				texts: mangaLayout.texts as any[]
			})
		} as any);
		
		emitUpdate(updatedData);
	}

	function updateDialoguePositionLocal(index: number, x: number, y: number) {
		if (!panel.data) return;
		const currentDialogues = panel.data.dialogue;
		const newDialogues = [...currentDialogues];
		const d = newDialogues[index];
		if (d) {
			newDialogues[index] = create(DialogueSchema, {
				...d,
				mangaLayout: create(MangaTextSchema, {
					text: d.text, type: 'dialogue',
					x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)),
					fontSize: d.mangaLayout?.fontSize || 16, style: d.mangaLayout?.style || 'vertical'
				} as any)
			});
		}

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			dialogue: newDialogues as any[]
		} as any);
		emitUpdate(updatedData);
	}

	function updateSFXPositionLocal(index: number, x: number, y: number) {
		if (!mangaLayout || !panel.data) return;
		const newTexts = mangaLayout.texts.map((t: any, i: number) => {
			if (i === index) {
				return create(t.constructor as any, {
					...t,
					x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y))
				});
			}
			return t;
		});
		const updatedData = create(PanelDataSchema, { 
			...panel.data, 
			mangaLayout: create(MangaLayoutSchema, {
				panels: mangaLayout.panels as any[],
				texts: newTexts as any[]
			})
		} as any);
		
		emitUpdate(updatedData);
	}

	function saveCurrentState() {
		emitUpdate(panel.data);
	}

	function handleZoom(event: WheelEvent) {
		if (!mangaLayout || !panelLayout || !panel.data) return;
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.1 : 0.1;
		const newScale = Math.max(0.1, Math.min(5.0, (panelLayout.imageScale || 1.0) + delta));

		const newPanels = mangaLayout.panels.map((p: any) => {
			if (p.panelIndex === panel.panel) {
				return create(p.constructor as any, { ...p, imageScale: newScale });
			}
			return p;
		});

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			mangaLayout: create(MangaLayoutSchema, {
				panels: newPanels as any[],
				texts: mangaLayout.texts as any[]
			})
		} as any);
		
		emitUpdate(updatedData);
	}

	function addSFX() {
		if (!panel.data || !mangaLayout) return;
		const newSFX = create(MangaTextSchema, {
			text: 'SFX', type: 'sfx', x: 50, y: 50, fontSize: 32, style: 'vertical'
		});
		const newTexts = [...mangaLayout.texts, newSFX];
		const updatedData = create(PanelDataSchema, {
			...panel.data,
			mangaLayout: create(MangaLayoutSchema, {
				panels: mangaLayout.panels as any[],
				texts: newTexts as any[]
			})
		} as any);
		emitUpdate(updatedData);
	}

	function defaultDialogueX(index: number): number {
		return Math.min(78, 8 + index * 22);
	}
</script>

<div 
	class="manga-panel" 
	class:dragging={draggingElement?.type === 'image'}
	onpointerdown={(e) => handlePointerDown(e, 'image')}
	onwheel={handleZoom}
>
	{#if currentImageUrl && !imageLoadFailed}
		<img
			src={currentImageUrl}
			alt="Panel {panel.panel}"
			class="panel-image"
			style={imageStyle}
			draggable="false"
			onerror={() => { imageLoadFailed = true; }}
		/>
	{:else}
		<div class="panel-placeholder">
			Panel {panel.panel}
			{#if imageLoadFailed}
				<div class="panel-placeholder-sub">画像を読み込めませんでした</div>
			{/if}
		</div>
	{/if}

	{#if generatedImages.length > 1}
		<div class="version-controls" onpointerdown={(e) => e.stopPropagation()}>
			<button
				type="button"
				class="version-btn"
				title="前のバージョン"
				onclick={(e) => { e.stopPropagation(); navigateVersion('prev'); }}
			>‹</button>
			<select
				class="version-select"
				value={currentImageIndex}
				title="採用するバージョンを選択"
				onchange={(e) => selectVersion(Number((e.currentTarget as HTMLSelectElement).value))}
				onclick={(e) => e.stopPropagation()}
			>
				{#each generatedImages as img, idx}
					<option value={idx}>v{idx + 1}{img.model ? ` · ${img.model}` : ''}</option>
				{/each}
			</select>
			<button
				type="button"
				class="version-btn"
				title="次のバージョン"
				onclick={(e) => { e.stopPropagation(); navigateVersion('next'); }}
			>›</button>
			<span class="version-count">{currentImageIndex + 1}/{generatedImages.length}</span>
		</div>
	{/if}

	<div class="panel-overlay">
		{#if visualNote}
			<div class="visual-note-overlay">
				{visualNote}
			</div>
		{/if}

		{#each dialogues as dialogue, i}
			<div 
				class="dialogue-bubble"
				class:active={draggingElement?.type === 'dialogue' && draggingElement.index === i}
				style="
					left: {dialogue.mangaLayout?.x ?? defaultDialogueX(i)}%; 
					top: {dialogue.mangaLayout?.y ?? 12}%;
					font-size: {dialogue.mangaLayout?.fontSize ?? 16}px;
				"
				onpointerdown={(e) => handlePointerDown(e, 'dialogue', i)}
			>
				{#if dialogue.speaker}
					<div class="speaker-name">{dialogue.speaker}</div>
				{/if}
				{dialogue.text}
			</div>
		{/each}

		{#if mangaLayout?.texts}
			{#each mangaLayout.texts as text, i}
				<div 
					class="manga-text {text.type}"
					class:active={draggingElement?.type === 'sfx' && draggingElement.index === i}
					style="left: {text.x}%; top: {text.y}%; font-size: {text.fontSize}px;"
					onpointerdown={(e) => handlePointerDown(e, 'sfx', i)}
				>
					{text.text}
				</div>
			{/each}
		{/if}
	</div>

	<div class="panel-tools">
		<button onclick={(e) => { e.stopPropagation(); addSFX(); }} title="Add SFX">+S</button>
	</div>
</div>

<style>
	.manga-panel {
		position: relative;
		border: 2px solid #000;
		overflow: hidden;
		background: #eee;
		width: 100%;
		height: 100%;
		cursor: crosshair;
		touch-action: none;
	}

	.manga-panel.dragging {
		cursor: move;
	}

	.panel-image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
		user-select: none;
	}

	.panel-placeholder {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		color: #ccc;
		font-weight: bold;
		font-size: 0.9rem;
		gap: 4px;
	}

	.panel-placeholder-sub {
		font-size: 0.7rem;
		font-weight: normal;
		color: #b91c1c;
	}

	.version-controls {
		position: absolute;
		top: 5px;
		left: 5px;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px 6px;
		background: rgba(0, 0, 0, 0.55);
		border-radius: 6px;
		z-index: 50;
		pointer-events: auto;
	}

	.version-controls .version-btn {
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		color: #fff;
		font-size: 0.9rem;
		line-height: 1;
		padding: 1px 6px;
		cursor: pointer;
	}

	.version-controls .version-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.version-controls .version-select {
		background: #fff;
		color: #000;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		font-size: 0.7rem;
		padding: 1px 4px;
		max-width: 140px;
	}

	.version-controls .version-count {
		color: #fff;
		font-size: 0.65rem;
		opacity: 0.8;
	}

	.panel-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.visual-note-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		padding: 6px 10px;
		font-size: 0.75rem;
		pointer-events: none;
		z-index: 5;
		max-height: 40%;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.4;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.dialogue-bubble {
		position: absolute;
		background: #fff;
		border: 2px solid #000;
		border-radius: 12px;
		padding: 10px 14px;
		font-size: 0.9rem;
		color: #000;
		max-width: 80%;
		pointer-events: auto;
		cursor: grab;
		outline: 2px dashed #28a745;
		z-index: 20;
		user-select: none;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
		writing-mode: horizontal-tb;
		text-orientation: mixed;
	}

	.speaker-name {
		font-size: 0.65rem;
		color: #666;
		margin-bottom: 4px;
		font-weight: bold;
		border-bottom: 1px solid #eee;
		padding-bottom: 2px;
	}

	.dialogue-bubble.active {
		cursor: grabbing;
		outline: 3px solid #28a745;
		box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
	}

	.manga-text {
		position: absolute;
		pointer-events: auto;
		color: #000;
		cursor: grab;
		outline: 2px dashed #ffc107;
		z-index: 11;
		user-select: none;
	}

	.manga-text.active {
		cursor: grabbing;
		outline: 3px solid #ffc107;
		box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
	}

	.manga-text.sfx {
		font-family: 'Kaisotai', 'Hiragino Sans', sans-serif;
		font-weight: bold;
		-webkit-text-stroke: 1px #fff;
	}

	.panel-tools {
		position: absolute;
		bottom: 5px;
		right: 5px;
		display: flex;
		gap: 5px;
		z-index: 100;
	}

	.panel-tools button {
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.panel-tools button:hover {
		background: rgba(0, 0, 0, 0.8);
	}
</style>
