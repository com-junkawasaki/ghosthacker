<script lang="ts">
	import { onMount } from 'svelte';
	import { getEpisodes, getEpisodePanels, storyboardClient } from '$lib/client/storyboard-client';
	import StoryboardPage from './StoryboardPage.svelte';
	import MangaEditor from './MangaEditor.svelte';
	import type { PanelData, Panel } from '$lib/gen/proto/storyboard_pb';

	let episodes: Array<{ id: string; title: string; totalPages: number }> = [];
	let selectedEpisode = '';
	let panels: Panel[] = [];
	let loading = false;
	let error = '';
	let selectedPage = 1;

	const storyboardPath = '';

	onMount(async () => {
		console.log('[StoryboardEditor] onMount: component mounted, loading episodes');
		try {
			await loadEpisodes();
		} catch (err) {
			console.error('[StoryboardEditor] onMount: error loading episodes', err);
		}
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
			
			// Load all pages by passing pageNumber = 0
			const panelsList = await getEpisodePanels(
				storyboardPath,
				selectedEpisode,
				0 // 0 means all pages
			);
			
			console.log('[StoryboardEditor] loadPanels: all panels loaded', panelsList.length);
			
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

	// Only load panels when an episode is selected (not empty string)
	$: if (selectedEpisode && selectedEpisode.trim() !== '') {
		console.log('[StoryboardEditor] Reactive: selectedEpisode changed, loading all panels', selectedEpisode);
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
		<div class="episode-info">
			{#if selectedEpisode && episodes.length > 0}
				{@const episode = episodes.find((e) => e.id === selectedEpisode)}
				{#if episode}
					<span class="total-pages">{episode.totalPages} pages</span>
				{/if}
			{/if}
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if panels.length > 0}
		<div class="editor-content">
			<div class="storyboard-view">
				<StoryboardPage
					{panels}
					episodeId={selectedEpisode}
					storyboardPath={storyboardPath}
					on:update={({ detail }) =>
						handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
					on:pageChange={({ detail }) => {
						console.log('[StoryboardEditor] pageChange event received:', detail);
						selectedPage = detail;
					}}
				/>
			</div>
			<div class="manga-view">
				<MangaEditor
					{panels}
					episodeId={selectedEpisode}
					{storyboardPath}
					bind:selectedPage
					on:update={({ detail }) =>
						handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
				/>
			</div>
		</div>
	{:else if episodes.length === 0 && !loading}
		<div class="empty-state">
			<p>No episodes available. Check console for details.</p>
			<button on:click={loadEpisodes}>Retry</button>
		</div>
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

	.editor-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.storyboard-view {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border-right: 1px solid #ddd;
	}

	.manga-view {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
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

	.episode-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #666;
		font-size: 0.9rem;
	}

	.total-pages {
		font-weight: 500;
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

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: #666;
	}

	.empty-state button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
	}

	.empty-state button:hover {
		background: #f5f5f5;
	}
</style>
