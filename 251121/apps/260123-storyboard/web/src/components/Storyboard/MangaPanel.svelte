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

	function handleDragEnd(event: DragEvent, textIndex: number) {
		if (!event.currentTarget) return;
		const rect = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
		if (!rect) return;

		const x = ((event.clientX - rect.left) / rect.width) * 100;
		const y = ((event.clientY - rect.top) / rect.height) * 100;

		updateTextPosition(textIndex, x, y);
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

<div class="manga-panel">
	{#if currentImageUrl}
		<img src={currentImageUrl} alt="Panel {panel.panel}" class="panel-image" />
	{:else}
		<div class="panel-placeholder">
			Panel {panel.panel}
		</div>
	{/if}

	<div class="panel-overlay">
		{#if mangaLayout?.texts}
			{#each mangaLayout.texts as text, i}
				<div 
					class="manga-text {text.type}"
					style="left: {text.x}%; top: {text.y}%; font-size: {text.fontSize}px;"
					draggable="true"
					on:dragend={(e) => handleDragEnd(e, i)}
				>
					{text.text}
				</div>
			{/each}
		{:else}
			{#each dialogues as dialogue}
				<div class="dialogue-bubble">
					{dialogue.text}
				</div>
			{/each}
		{/if}
	</div>

	<div class="panel-tools">
		<button on:click={() => addMangaText('dialogue')}>+T</button>
		<button on:click={() => addMangaText('sfx')}>+S</button>
	</div>
</div>

<style>
	.manga-panel {
		position: relative;
		border: 2px solid #000;
		overflow: hidden;
		background: #eee;
		aspect-ratio: 3 / 4;
	}

	.panel-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
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
</style>
