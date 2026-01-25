<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Panel, Dialogue } from '$lib/gen/proto/storyboard_pb';
	import { MangaTextSchema, PanelDataSchema, DialogueSchema } from '$lib/gen/proto/storyboard_pb';
	import { create } from '@bufbuild/protobuf';

	export let panel: Panel;
	export let episodeId: string = '';
	export let storyboardPath: string = '';

	const dispatch = createEventDispatcher();

	$: generatedImages = panel.data?.generatedImages ?? [];
	$: currentImageIndex = panel.data?.currentImageIndex ?? (generatedImages.length > 0 ? generatedImages.length - 1 : -1);

	$: currentImageUrl = currentImageIndex >= 0 && currentImageIndex < generatedImages.length 
		? (() => {
			const url = generatedImages[currentImageIndex]?.imageUrl ?? '';
			if (!url) return '';
			if (url.startsWith('http') || url.startsWith('data:')) {
				return url;
			}
			const baseUrl = typeof window !== 'undefined' 
				? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin)
				: 'http://localhost:8081';
			return baseUrl + url;
		})()
		: '';

	$: dialogues = panel.data?.dialogue ?? [];
	$: mangaLayout = panel.data?.mangaLayout;
	$: panelLayout = mangaLayout?.panels?.find(p => p.panelIndex === panel.panel);

	$: imageStyle = panelLayout ? `
		object-position: ${panelLayout.imageX}% ${panelLayout.imageY}%;
		transform: scale(${panelLayout.imageScale || 1.0});
	` : '';

	let isDraggingImage = false;

	function handleImageMouseDown(event: MouseEvent) {
		// Only drag if clicking the background image, not a bubble or tool
		if ((event.target as HTMLElement).classList.contains('panel-image') || (event.target as HTMLElement).classList.contains('panel-overlay')) {
			isDraggingImage = true;
			const startX = event.clientX;
			const startY = event.clientY;
			const initialX = panelLayout?.imageX ?? 50;
			const initialY = panelLayout?.imageY ?? 50;

			const onMouseMove = (moveEvent: MouseEvent) => {
				const dx = ((moveEvent.clientX - startX) / 300) * 100;
				const dy = ((moveEvent.clientY - startY) / 400) * 100;
				updateImagePosition(initialX - dx, initialY - dy);
			};

			const onMouseUp = () => {
				isDraggingImage = false;
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('mouseup', onMouseUp);
			};

			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		}
	}

	function updateImagePosition(x: number, y: number) {
		if (!mangaLayout || !panelLayout) return;

		const newPanels = mangaLayout.panels.map(p => {
			if (p.panelIndex === panel.panel) {
				return {
					...p,
					imageX: Math.max(0, Math.min(100, x)),
					imageY: Math.max(0, Math.min(100, y))
				};
			}
			return p;
		});

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			mangaLayout: {
				...mangaLayout,
				panels: newPanels
			}
		});

		dispatch('update', updatedData);
	}

	function handleZoom(event: WheelEvent) {
		if (!mangaLayout || !panelLayout) return;
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.1 : 0.1;
		const newScale = Math.max(0.1, Math.min(5.0, (panelLayout.imageScale || 1.0) + delta));

		const newPanels = mangaLayout.panels.map(p => {
			if (p.panelIndex === panel.panel) {
				return {
					...p,
					imageScale: newScale
				};
			}
			return p;
		});

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			mangaLayout: {
				...mangaLayout,
				panels: newPanels
			}
		});

		dispatch('update', updatedData);
	}

	function handleDialogueDragEnd(event: DragEvent, index: number) {
		const rect = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
		if (!rect) return;

		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;

		const newDialogues = [...dialogues];
		const d = newDialogues[index];
		if (d) {
			newDialogues[index] = create(DialogueSchema, {
				...d,
				mangaLayout: create(MangaTextSchema, {
					...(d.mangaLayout || {}),
					text: d.text,
					type: 'dialogue',
					x,
					y,
					fontSize: d.mangaLayout?.fontSize || 16,
					style: d.mangaLayout?.style || 'vertical'
				})
			});
		}

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			dialogue: newDialogues
		});

		dispatch('update', updatedData);
	}

	function addSFX() {
		if (!panel.data) return;
		// SFX are special dialogues or we can keep using mangaLayout.texts for non-dialogue elements
		const newSFX = create(MangaTextSchema, {
			text: 'SFX',
			type: 'sfx',
			x: 50,
			y: 50,
			fontSize: 32,
			style: 'vertical'
		});

		const newTexts = mangaLayout?.texts ? [...mangaLayout.texts, newSFX] : [newSFX];

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			mangaLayout: {
				...mangaLayout,
				texts: newTexts
			}
		});

		dispatch('update', updatedData);
	}

	function handleSFXDragEnd(event: DragEvent, index: number) {
		const rect = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
		if (!rect) return;

		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;

		const newTexts = mangaLayout?.texts ? [...mangaLayout.texts] : [];
		if (newTexts[index]) {
			newTexts[index] = create(MangaTextSchema, {
				...newTexts[index],
				x,
				y
			});
		}

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			mangaLayout: {
				...mangaLayout,
				texts: newTexts
			}
		});

		dispatch('update', updatedData);
	}
</script>

<div 
	class="manga-panel" 
	class:dragging={isDraggingImage}
	on:mousedown={handleImageMouseDown}
	on:wheel={handleZoom}
>
	{#if currentImageUrl}
		<img 
			src={currentImageUrl} 
			alt="Panel {panel.panel}" 
			class="panel-image" 
			style={imageStyle}
			draggable="false"
		/>
	{:else}
		<div class="panel-placeholder">
			Panel {panel.panel}
		</div>
	{/if}

	<div class="panel-overlay">
		{#each dialogues as dialogue, i}
			<div 
				class="dialogue-bubble"
				style="
					left: {dialogue.mangaLayout?.x ?? 10}%; 
					top: {dialogue.mangaLayout?.y ?? 20}%;
					font-size: {dialogue.mangaLayout?.fontSize ?? 16}px;
				"
				draggable="true"
				on:dragend={(e) => handleDialogueDragEnd(e, i)}
			>
				{dialogue.text}
			</div>
		{/each}

		{#if mangaLayout?.texts}
			{#each mangaLayout.texts as text, i}
				<div 
					class="manga-text {text.type}"
					style="left: {text.x}%; top: {text.y}%; font-size: {text.fontSize}px;"
					draggable="true"
					on:dragend={(e) => handleSFXDragEnd(e, i)}
				>
					{text.text}
				</div>
			{/each}
		{/if}
	</div>

	<div class="panel-tools">
		<button on:click={addSFX} title="Add SFX">+S</button>
	</div>
</div>

<style>
	.manga-panel {
		position: relative;
		border: 2px solid #000;
		overflow: hidden;
		background: #eee;
		aspect-ratio: 3 / 4;
		cursor: crosshair;
	}

	.manga-panel.dragging {
		cursor: move;
	}

	.panel-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: auto;
	}

	.panel-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		color: #ccc;
		font-weight: bold;
	}

	.panel-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.dialogue-bubble {
		position: absolute;
		background: #fff;
		border: 2px solid #000;
		border-radius: 50%;
		padding: 10px;
		font-size: 0.8rem;
		color: #000;
		max-width: 80%;
		pointer-events: auto;
		cursor: grab;
		outline: 2px dashed #28a745;
		z-index: 10;
	}

	.manga-text {
		position: absolute;
		pointer-events: auto;
		color: #000;
		cursor: grab;
		outline: 2px dashed #ffc107;
		z-index: 11;
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
