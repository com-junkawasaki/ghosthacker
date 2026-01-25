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

	function handleUpdate(panelNumber: number, data: PanelData) {
		dispatch('update', {
			pageNumber,
			panel: panelNumber,
			data
		});
	}
</script>

<div class="manga-page">
	<div class="manga-page-content">
		{#each sortedPanels as panel (panel.panel)}
			<MangaPanel
				{panel}
				{episodeId}
				{storyboardPath}
				on:update={(e) => handleUpdate(panel.panel, e.detail)}
			/>
		{/each}
	</div>
	<div class="page-footer">
		{pageNumber}
	</div>
</div>

<style>
	.manga-page {
		width: 600px; /* B5 size ratio roughly */
		min-height: 848px;
		background: #fff;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
		padding: 40px;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.manga-page-content {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		flex: 1;
	}

	.page-footer {
		text-align: center;
		padding-top: 20px;
		color: #888;
		font-size: 0.8rem;
	}
</style>
