<script lang="ts">
	import type { Panel } from '$lib/gen/proto/storyboard_pb';
	import MangaPage from './MangaPage.svelte';
	import { storyboardClient } from '$lib/client/storyboard-client';
	import type { PanelData } from '$lib/gen/proto/storyboard_pb';

	export let panels: Panel[] = [];
	export let episodeId: string = '';
	export let storyboardPath: string = '';
	export let selectedPage: number = 1;

	$: {
		console.log('[MangaEditor] selectedPage prop updated:', selectedPage);
	}

	async function handlePanelUpdate(
		pageNumber: number,
		panel: number,
		data: PanelData
	) {
		if (!episodeId) return;
		try {
			await storyboardClient.updatePanel({
				filePath: storyboardPath,
				episodeId: episodeId,
				pageNumber,
				panel,
				panelData: data
			});
			// The parent component will reload panels via reactive selectedEpisode
		} catch (err) {
			console.error('Failed to update panel from MangaEditor:', err);
		}
	}

	// Group panels by page number
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
