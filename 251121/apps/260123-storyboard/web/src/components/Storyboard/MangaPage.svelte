<script lang="ts">
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import MangaPanel from './MangaPanel.svelte';
	import { createEventDispatcher } from 'svelte';

	export let panels: Panel[] = [];
	export let pageNumber: number = 1;
	export let episodeId: string = '';
	export let storyboardPath: string = '';

	const dispatch = createEventDispatcher();

	// Simple grid layout for now, can be customized later with MangaLayout
	$: sortedPanels = [...panels].sort((a, b) => a.panel - b.panel);

	$: pageLayout = panels[0]?.data?.mangaLayout;

	function handleUpdate(panelNumber: number, data: PanelData) {
		dispatch('update', {
			pageNumber,
			panel: panelNumber,
			data
		});
	}

	function handlePanelResize(panelIndex: number, delta: { x: number, y: number, w: number, h: number }) {
		if (!pageLayout) return;

		const newPanels = pageLayout.panels.map((p, i) => {
			if (i === panelIndex) {
				return {
					...p,
					x: Math.max(0, Math.min(100, p.x + delta.x)),
					y: Math.max(0, Math.min(100, p.y + delta.y)),
					width: Math.max(5, Math.min(100, p.width + delta.w)),
					height: Math.max(5, Math.min(100, p.height + delta.h))
				};
			}
			return p;
		});

		// Update only the first panel of the page with the new layout
		const firstPanel = panels[0];
		if (!firstPanel) return;

		const updatedData = {
			...firstPanel.data,
			mangaLayout: {
				...pageLayout,
				panels: newPanels
			}
		};
		handleUpdate(firstPanel.panel, updatedData as any);
	}
</script>

<div class="manga-page">
	<div class="manga-page-content">
		{#if pageLayout && pageLayout.panels && pageLayout.panels.length > 0}
			{#each sortedPanels as panel, i (panel.panel)}
				{@const layout = pageLayout.panels[i]}
				{#if layout}
					<div 
						class="layout-wrapper"
						style="
							position: absolute;
							left: {layout.x}%;
							top: {layout.y}%;
							width: {layout.width}%;
							height: {layout.height}%;
							z-index: {layout.zIndex || 0};
						"
					>
						<MangaPanel
							{panel}
							{episodeId}
							{storyboardPath}
							on:update={(e) => handleUpdate(panel.panel, e.detail)}
						/>
						<div class="resize-handle" on:mousedown={(e) => {
							const startX = e.clientX;
							const startY = e.clientY;
							const onMouseMove = (moveEvent: MouseEvent) => {
								const dx = ((moveEvent.clientX - startX) / 600) * 100;
								const dy = ((moveEvent.clientY - startY) / 848) * 100;
								handlePanelResize(i, { x: 0, y: 0, w: dx, h: dy });
							};
							const onMouseUp = () => {
								window.removeEventListener('mousemove', onMouseMove);
								window.removeEventListener('mouseup', onMouseUp);
							};
							window.addEventListener('mousemove', onMouseMove);
							window.addEventListener('mouseup', onMouseUp);
						}}></div>
					</div>
				{/if}
			{/each}
		{:else}
			<div class="default-grid">
				{#each sortedPanels as panel (panel.panel)}
					<MangaPanel
						{panel}
						{episodeId}
						{storyboardPath}
						on:update={(e) => handleUpdate(panel.panel, e.detail)}
					/>
				{/each}
			</div>
		{/if}
	</div>
	<div class="page-footer">
		{pageNumber}
	</div>
</div>

<style>
	.manga-page {
		width: 600px;
		min-height: 848px;
		background: #fff;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
		padding: 40px;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.manga-page-content {
		position: relative;
		flex: 1;
	}

	.default-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		height: 100%;
	}

	.layout-wrapper {
		border: 1px solid transparent;
		transition: border-color 0.2s;
	}

	.layout-wrapper:hover {
		border-color: #007bff;
	}

	.resize-handle {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 15px;
		height: 15px;
		background: rgba(0, 123, 255, 0.5);
		cursor: nwse-resize;
		display: none;
	}

	.layout-wrapper:hover .resize-handle {
		display: block;
	}

	.page-footer {
		text-align: center;
		padding-top: 20px;
		color: #888;
		font-size: 0.8rem;
	}
</style>
