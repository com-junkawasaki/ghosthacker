<script lang="ts">
	import { onMount } from 'svelte';
	import { getEpisodes, getEpisodePanels, storyboardClient } from '$lib/client/storyboard-client';
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
			console.log('[StoryboardEditor] loadEpisodes: starting', { storyboardPath });
			loading = true;
			error = '';
			
			// Use type-safe wrapper with runtime validation
			const episodesList = await getEpisodes(storyboardPath);
			console.log('[StoryboardEditor] loadEpisodes: episodes received', episodesList);
			console.log('[StoryboardEditor] loadEpisodes: episodes count', episodesList.length);
			
			// TypeScript ensures episodesList is an array at compile time
			// Runtime validation in getEpisodes ensures it's an array at runtime
			episodes = episodesList.map((e) => {
				const episode = {
					id: e.id ?? '',
					title: e.title ?? '',
					totalPages: e.totalPages ?? 0,
				};
				console.log('[StoryboardEditor] loadEpisodes: mapped episode', episode);
				return episode;
			});
			
			console.log('[StoryboardEditor] loadEpisodes: parsed episodes', episodes);
			
			if (episodes.length > 0 && !selectedEpisode) {
				const firstEpisode = episodes[0];
				if (firstEpisode) {
					selectedEpisode = firstEpisode.id;
					await loadPanels();
				}
			} else if (episodes.length === 0) {
				console.warn('[StoryboardEditor] loadEpisodes: No episodes found');
				error = 'No episodes found in storyboard';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load episodes';
			console.error('[StoryboardEditor] Failed to load episodes:', err);
			if (err instanceof Error) {
				console.error('[StoryboardEditor] Error stack:', err.stack);
			}
			episodes = [];
		} finally {
			loading = false;
		}
	}

	async function loadPanels() {
		if (!selectedEpisode) {
			console.warn('[StoryboardEditor] loadPanels: No episode selected');
			return;
		}
		try {
			loading = true;
			error = '';
			
			// Use type-safe wrapper with runtime validation
			const panelsList = await getEpisodePanels(
				storyboardPath,
				selectedEpisode,
				currentPage
			);
			
			console.log('[StoryboardEditor] loadPanels: panels received', panelsList);
			console.log('[StoryboardEditor] loadPanels: panels count', panelsList.length);
			
			panels = panelsList;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load panels';
			console.error('[StoryboardEditor] Failed to load panels:', err);
			if (err instanceof Error) {
				console.error('[StoryboardEditor] Error stack:', err.stack);
			}
			panels = [];
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
				{#if episodes.length === 0}
					<option value="" disabled>No episodes available</option>
				{:else}
					{#each episodes as episode}
						<option value={episode.id}>{episode.title}</option>
					{/each}
				{/if}
			</select>
			{#if episodes.length === 0 && !loading}
				<span class="debug-info" title="Debug: episodes array is empty">⚠️</span>
			{/if}
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

	.debug-info {
		margin-left: 0.5rem;
		color: #f90;
		font-size: 1.2rem;
		cursor: help;
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
