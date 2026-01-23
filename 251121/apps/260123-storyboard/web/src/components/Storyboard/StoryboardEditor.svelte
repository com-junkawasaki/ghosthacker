<script lang="ts">
	import { onMount } from 'svelte';
	import { storyboardClient } from '$lib/client/storyboard-client';
	import StoryboardPage from './StoryboardPage.svelte';
	import type { PanelData, Panel } from '$lib/gen/proto/storyboard_pb';

	let episodes: Array<{ id: string; title: string; totalPages: number }> = [];
	let selectedEpisode = '';
	let currentPage = 1;
	let panels: Panel[] = [];
	let loading = false;
	let error = '';

	const storyboardPath = '';

	onMount(async () => {
		await loadEpisodes();
	});

	async function loadEpisodes() {
		try {
			console.log('loadEpisodes: starting fetch from', storyboardPath);
			loading = true;
			error = '';
			const response = await storyboardClient.getEpisodes({
				filePath: storyboardPath
			});
			console.log('loadEpisodes: response received', response);
			episodes = response.episodes.map((e) => ({
				id: e.id,
				title: e.title,
				totalPages: e.totalPages,
			}));
			console.log('loadEpisodes: parsed episodes', episodes);
			if (episodes.length > 0 && !selectedEpisode) {
				const firstEpisode = episodes[0];
				if (firstEpisode) {
					selectedEpisode = firstEpisode.id;
					await loadPanels();
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load episodes';
			console.error('Failed to load episodes:', err);
		} finally {
			loading = false;
		}
	}

	async function loadPanels() {
		if (!selectedEpisode) return;
		try {
			loading = true;
			error = '';
			const response = await storyboardClient.getEpisodePanels({
				filePath: storyboardPath,
				episodeId: selectedEpisode,
				pageNumber: currentPage
			});
			panels = response.panels;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load panels';
			console.error('Failed to load panels:', err);
		} finally {
			loading = false;
		}
	}

	async function handlePanelUpdate(
		pageNumber: number,
		panel: number,
		data: PanelData
	) {
		if (!selectedEpisode) return;
		try {
			await storyboardClient.updatePanel({
				filePath: storyboardPath,
				episodeId: selectedEpisode,
				pageNumber,
				panel,
				panelData: data
			});
			await loadPanels(); // Reload to reflect changes
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update panel';
			console.error('Failed to update panel:', err);
		}
	}

	$: if (selectedEpisode) {
		loadPanels();
	}

	$: if (currentPage) {
		loadPanels();
	}
</script>

<div class="storyboard-editor">
	<header class="editor-header">
		<div class="episode-selector">
			<label for="episode-select">Episode:</label>
			<select
				id="episode-select"
				bind:value={selectedEpisode}
				on:change={() => {
					currentPage = 1;
				}}
			>
				{#each episodes as episode}
					<option value={episode.id}>{episode.title}</option>
				{/each}
			</select>
		</div>
		<div class="page-controls">
			<button
				on:click={() => {
					if (currentPage > 1) currentPage--;
				}}
				disabled={currentPage <= 1}
			>
				← Prev
			</button>
			<span>Page {currentPage}</span>
			<button
				on:click={() => {
					currentPage++;
				}}
			>
				Next →
			</button>
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if panels.length > 0}
		<StoryboardPage
			{panels}
			{currentPage}
			on:update={({ detail }) =>
				handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
		/>
	{/if}
</div>

<style>
	.storyboard-editor {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #f5f5f0;
		font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: #fff;
		border-bottom: 2px solid #ddd;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.episode-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.episode-selector label {
		font-weight: 600;
	}

	.episode-selector select {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
	}

	.page-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.page-controls button {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
	}

	.page-controls button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error {
		padding: 1rem;
		background: #fee;
		color: #c00;
		border: 1px solid #fcc;
		margin: 1rem;
		border-radius: 4px;
	}

	.loading {
		padding: 2rem;
		text-align: center;
		color: #666;
	}
</style>
