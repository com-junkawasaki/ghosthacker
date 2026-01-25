<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Panel } from '$lib/gen/proto/storyboard_pb';
	import { MangaTextSchema, PanelDataSchema } from '$lib/gen/proto/storyboard_pb';
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

	// Find the layout for this specific panel from the page-level mangaLayout
	$: panelLayout = mangaLayout?.panels?.find(p => p.panelIndex === panel.panel);

	$: imageStyle = panelLayout ? `
		object-position: ${panelLayout.imageX}% ${panelLayout.imageY}%;
		transform: scale(${panelLayout.imageScale || 1.0});
	` : '';

	type SelectionMode = 'panel' | 'image' | 'text';
	let selectionMode: SelectionMode = 'panel';

	function handleImageMouseDown(event: MouseEvent) {
		if (selectionMode !== 'image' || !panelLayout) return;
		
		const startX = event.clientX;
		const startY = event.clientY;
		const initialX = panelLayout.imageX;
		const initialY = panelLayout.imageY;

		const onMouseMove = (moveEvent: MouseEvent) => {
			const dx = ((moveEvent.clientX - startX) / 300) * 100; // Approx panel width
			const dy = ((moveEvent.clientY - startY) / 400) * 100; // Approx panel height
			
			updateImagePosition(initialX - dx, initialY - dy);
		};

		const onMouseUp = () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
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

	function handleZoom(delta: number) {
		if (selectionMode !== 'image' || !mangaLayout || !panelLayout) return;

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

	function handleDragEnd(event: DragEvent, textIndex: number) {
		if (selectionMode !== 'text') return;
		const rect = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
		if (!rect) return;

		// Use clientX/Y which are relative to the viewport, then subtract rect.left/top
		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;

		updateTextPosition(textIndex, x, y);
	}

	function handleDialogueDragEnd(event: DragEvent, dialogueIndex: number) {
		if (selectionMode !== 'text') return;
		const rect = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
		if (!rect) return;

		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;

		// Convert this dialogue to a mangaText entry
		const dialogue = dialogues[dialogueIndex];
		if (!dialogue) return;

		const newText = create(MangaTextSchema, {
			text: dialogue.text,
			type: 'dialogue',
			x,
			y,
			fontSize: 16,
			style: 'vertical'
		});

		const newTexts = mangaLayout?.texts ? [...mangaLayout.texts, newText] : [newText];

		const updatedData = create(PanelDataSchema, {
			...panel.data,
			mangaLayout: {
				...mangaLayout,
				texts: newTexts
			}
		});

		dispatch('update', updatedData);
	}

	function updateTextPosition(index: number, x: number, y: number) {
		if (!panel.data) return;
		
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

	function addMangaText(type: 'dialogue' | 'sfx') {
		if (!panel.data) return;

		const newText = create(MangaTextSchema, {
			text: type === 'dialogue' ? 'New Dialogue' : 'SFX',
			type,
			x: 50,
			y: 50,
			fontSize: type === 'dialogue' ? 16 : 32,
			style: 'vertical'
		});

		const newTexts = mangaLayout?.texts ? [...mangaLayout.texts, newText] : [newText];

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
	class:mode-image={selectionMode === 'image'}
	class:mode-text={selectionMode === 'text'}
	class:mode-panel={selectionMode === 'panel'}
	on:mousedown={handleImageMouseDown}
	on:wheel={(e) => {
		if (selectionMode === 'image') {
			e.preventDefault();
			handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
		}
	}}
>
	{#if currentImageUrl}
		<img 
			src={currentImageUrl} 
			alt="Panel {panel.panel}" 
			class="panel-image" 
			style={imageStyle}
		/>
	{:else}
		<div class="panel-placeholder">
			Panel {panel.panel}
		</div>
	{/if}

	<div class="panel-overlay">
		{#if mangaLayout?.texts && mangaLayout.texts.length > 0}
			{#each mangaLayout.texts as text, i}
				<div 
					class="manga-text {text.type}"
					style="left: {text.x}%; top: {text.y}%; font-size: {text.fontSize}px;"
					draggable={selectionMode === 'text'}
					on:dragend={(e) => handleDragEnd(e, i)}
				>
					{text.text}
				</div>
			{/each}
		{/if}
		
		{#each dialogues as dialogue, i}
			<!-- Only show if not already positioned in mangaLayout.texts -->
			{#if !mangaLayout?.texts?.find(t => t.text === dialogue.text)}
				<div 
					class="dialogue-bubble"
					draggable={selectionMode === 'text'}
					on:dragend={(e) => handleDialogueDragEnd(e, i)}
				>
					{dialogue.text}
				</div>
			{/if}
		{/each}
	</div>

	<div class="panel-tools">
		<div class="mode-selector">
			<button 
				class:active={selectionMode === 'panel'} 
				on:click={() => selectionMode = 'panel'}
				title="Edit Panel Layout"
			>
				Pnl
			</button>
			<button 
				class:active={selectionMode === 'image'} 
				on:click={() => selectionMode = 'image'}
				title="Move/Zoom Image"
			>
				Img
			</button>
			<button 
				class:active={selectionMode === 'text'} 
				on:click={() => selectionMode = 'text'}
				title="Edit Text/Dialogue"
			>
				Txt
			</button>
		</div>
		<div class="action-buttons">
			<button on:click={() => addMangaText('dialogue')}>+T</button>
			<button on:click={() => addMangaText('sfx')}>+S</button>
		</div>
	</div>
</div>

<style>
	.manga-panel {
		position: relative;
		border: 2px solid #000;
		overflow: hidden;
		background: #eee;
		aspect-ratio: 3 / 4;
		cursor: default;
	}

	.manga-panel.moving-image {
		cursor: move;
		border-color: #007bff;
	}

	.panel-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.1s ease-out;
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
		/* Default position for now */
		top: 20%;
		left: 10%;
	}

	.manga-text {
		position: absolute;
		pointer-events: auto;
		color: #000;
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
		gap: 2px;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.manga-panel:hover .panel-tools {
		opacity: 1;
	}

	.panel-tools button {
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		border: none;
		border-radius: 2px;
		padding: 2px 5px;
		font-size: 0.7rem;
		cursor: pointer;
	}

	.panel-tools button:hover {
		background: rgba(0, 0, 0, 0.8);
	}

	.panel-tools button.active {
		background: #007bff;
		color: #fff;
	}
</style>
