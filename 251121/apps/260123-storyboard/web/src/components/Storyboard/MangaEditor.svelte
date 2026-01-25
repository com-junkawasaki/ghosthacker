<script lang="ts">
	import MangaPage from './MangaPage.svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import type { LayoutTemplate } from '$lib/manga-layouts';
	import { MANGA_TEMPLATES, applyTemplate } from '$lib/manga-layouts';
	import { PanelDataSchema, MangaLayoutSchema } from '$lib/gen/proto/storyboard_pb';
	import { create } from '@bufbuild/protobuf';
	import { createEventDispatcher } from 'svelte';

	export let panels: Panel[] = [];
	export let episodeId: string = '';
	export let storyboardPath: string = '';
	export let selectedPage: number = 1;

	const dispatch = createEventDispatcher();

	$: {
		console.log('[MangaEditor] selectedPage prop updated:', selectedPage);
	}

	$: pagesMap = panels.reduce((acc, panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) {
			acc[pageNum] = [];
		}
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>);

	// Get sorted page numbers
	$: pageNumbers = Object.keys(pagesMap)
		.map(Number)
		.sort((a, b) => a - b);

	$: currentPagePanels = pagesMap[selectedPage] || [];
	$: templates = MANGA_TEMPLATES[currentPagePanels.length] || [];

	async function handleApplyTemplate(template: LayoutTemplate) {
		if (currentPagePanels.length === 0) return;

		const newPanelLayouts = applyTemplate(currentPagePanels, template);
		
		// Update the first panel of the page with the new layout for the whole page
		const firstPanel = currentPagePanels[0];
		if (!firstPanel) return;

		const updatedData = create(PanelDataSchema, {
			...firstPanel.data,
			mangaLayout: create(MangaLayoutSchema, {
				panels: newPanelLayouts,
				texts: firstPanel.data?.mangaLayout?.texts || []
			})
		});

		dispatch('update', {
			pageNumber: firstPanel.pageNumber,
			panel: firstPanel.panel,
			data: updatedData
		});
	}

	function handlePanelUpdate(
		pageNumber: number,
		panel: number,
		data: PanelData
	) {
		dispatch('update', {
			pageNumber,
			panel,
			data
		});
	}
</script>

<div class="manga-editor">
	<div class="manga-toolbar">
		<div class="page-nav">
			<label for="manga-page-select">Page:</label>
			<select id="manga-page-select" bind:value={selectedPage}>
				{#each pageNumbers as pageNum}
					<option value={pageNum}>Page {pageNum}</option>
				{/each}
			</select>
		</div>
		<div class="tools">
			{#if templates.length > 0}
				<div class="template-selector">
					<span>Layout:</span>
					{#each templates as template}
						<button class="tool-btn" on:click={() => handleApplyTemplate(template)}>
							{template.name}
						</button>
					{/each}
				</div>
			{/if}
			<button class="tool-btn">Add Text</button>
			<button class="tool-btn">Add SFX</button>
		</div>
	</div>

	<div class="manga-preview-container">
		{#if currentPagePanels.length > 0}
			<MangaPage
				panels={currentPagePanels}
				pageNumber={selectedPage}
				{episodeId}
				{storyboardPath}
				on:update={(e) => handlePanelUpdate(e.detail.pageNumber, e.detail.panel, e.detail.data)}
			/>
		{:else}
			<div class="empty-page">No panels for this page</div>
		{/if}
	</div>
</div>

<style>
	.manga-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #333;
		color: #fff;
		border-left: 1px solid #444;
	}

	.manga-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background: #222;
		border-bottom: 1px solid #444;
	}

	.template-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-right: 1rem;
		padding-right: 1rem;
		border-right: 1px solid #444;
	}

	.template-selector span {
		font-size: 0.8rem;
		color: #888;
	}

	.page-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-nav select {
		background: #444;
		color: #fff;
		border: 1px solid #555;
		padding: 0.25rem;
		border-radius: 4px;
	}

	.tools {
		display: flex;
		gap: 0.5rem;
	}

	.tool-btn {
		background: #555;
		color: #fff;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.tool-btn:hover {
		background: #666;
	}

	.manga-preview-container {
		flex: 1;
		overflow: auto;
		padding: 2rem;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	.empty-page {
		padding: 2rem;
		color: #888;
	}
</style>
