<script lang="ts">
	import { onMount } from 'svelte';
	import { getEpisodes, getEpisodePanels, storyboardClient, streamUpdates } from '$lib/client/storyboard-client';
	import StoryboardPage from './StoryboardPage.svelte';
	import MangaEditor from './MangaEditor.svelte';
	import ScenarioAgent from './Agents/ScenarioAgent.svelte';
	import EpisodeAgent from './Agents/EpisodeAgent.svelte';
	import CharacterAgent from './Agents/CharacterAgent.svelte';
	import CinematicAgent from './Agents/CinematicAgent.svelte';
	import DialogueAgent from './Agents/DialogueAgent.svelte';
	import StoryEditorView from './StoryEditorView.svelte';
	import type { PanelData, Panel } from '$lib/gen/proto/storyboard_pb';

	let episodes: Array<{ id: string; title: string; totalPages: number }> = $state([]);
	let selectedEpisode = $state('');
	let panels: Panel[] = $state([]);
	let loading = $state(false);
	let error = $state('');
	let selectedPage = $state(1);
	let selectedPanelIndex = $state(1);
	let selectedPanelData = $state<PanelData | undefined>(undefined);
	let activeAgent = $state<'scenario' | 'episode' | 'character' | 'cinematic' | 'dialogue' | undefined>(undefined);
	let viewMode = $state<'manga' | 'story'>('manga');
	
	// Resizable split view state
	let storyboardWidthPercent = $state(50);
	let isResizing = $state(false);

	function startResizing(e: MouseEvent) {
		isResizing = true;
		e.preventDefault();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isResizing) return;
		
		const container = document.querySelector('.editor-content');
		if (!container) return;
		
		const containerRect = container.getBoundingClientRect();
		// Adjust for agent sidebar if it's open
		const sidebar = document.querySelector('.agent-sidebar');
		const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 0;
		
		const relativeX = e.clientX - containerRect.left - sidebarWidth;
		const totalWidth = containerRect.width - sidebarWidth;
		
		const newPercent = (relativeX / totalWidth) * 100;
		// Constrain between 20% and 80%
		storyboardWidthPercent = Math.max(20, Math.min(80, newPercent));
	}

	function stopResizing() {
		isResizing = false;
	}
	
	const sessionId = Math.random().toString(36).substring(2, 15);

	const storyboardPath = '';

	onMount(async () => {
		console.log('[StoryboardEditor] onMount: component mounted, loading episodes, sessionId:', sessionId);
		try {
			await loadEpisodes();
		} catch (err) {
			console.error('[StoryboardEditor] onMount: error loading episodes', err);
		}
	});

	$effect(() => {
		if (!selectedEpisode) return;

		console.log('[StoryboardEditor] Effect: setting up stream for', selectedEpisode);
		let unsubscribe: (() => void) | undefined;
		
		// Use a small timeout to avoid rapid re-connections during state transitions
		const timer = setTimeout(() => {
			unsubscribe = streamUpdates(
				storyboardPath,
				sessionId,
				(update) => {
					console.log('[StoryboardEditor] Stream update received:', update);
					if (update.updateType === 'panel_updated' && update.episodeId === selectedEpisode) {
						// Update panel in local state
						panels = panels.map(p => {
							if (p.pageNumber === update.pageNumber && p.panel === update.panel) {
								// Use the panel's data directly from the update
								const newPanel = { ...p };
								if (update.panelData) {
									newPanel.data = update.panelData;
								}
								return newPanel;
							}
							return p;
						});
					}
				},
				(err) => {
					console.error('[StoryboardEditor] Stream error:', err);
				}
			);
		}, 100);

		return () => {
			console.log('[StoryboardEditor] Effect cleanup: unsubscribing stream');
			clearTimeout(timer);
			if (unsubscribe) unsubscribe();
		};
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
		
		// Optimistic local update
		panels = panels.map(p => {
			if (p.pageNumber === pageNumber && p.panel === panel) {
				return { ...p, data };
			}
			return p;
		});

		try {
			await storyboardClient.updatePanel({
				filePath: storyboardPath,
				episodeId: selectedEpisode,
				pageNumber,
				panel,
				panelData: data,
				sessionId: sessionId
			});
			// No need to reload everything if we updated local state correctly
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update panel';
			console.error('Failed to update panel:', err);
			await loadPanels(); // Reload on error to ensure consistency
		}
	}

	// Only load panels when an episode is selected (not empty string)
	$effect(() => {
		if (selectedEpisode && selectedEpisode.trim() !== '') {
			console.log('[StoryboardEditor] Effect: selectedEpisode changed, loading all panels', selectedEpisode);
			loadPanels();
		}
	});
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
			
			<div class="episode-agent-controls">
				<button 
					class="agent-btn scenario-btn" 
					onclick={() => activeAgent = 'scenario'}
					title="Scenario Writer AI"
				>
					Scenario AI
				</button>
				<button 
					class="agent-btn episode-btn" 
					onclick={() => activeAgent = 'episode'}
					title="Episode Generator AI"
				>
					Episode AI
				</button>
				<button 
					class="agent-btn character-btn" 
					onclick={() => activeAgent = 'character'}
					title="Character Refinement AI"
				>
					Character AI
				</button>
			</div>
		</div>

		<div class="view-switcher">
			<button 
				class:active={viewMode === 'manga'} 
				onclick={() => viewMode = 'manga'}
			>Manga View</button>
			<button 
				class:active={viewMode === 'story'} 
				onclick={() => viewMode = 'story'}
			>Story Editor</button>
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
		<div 
			class="editor-content" 
			class:resizing={isResizing}
			onmousemove={handleMouseMove}
			onmouseup={stopResizing}
			onmouseleave={stopResizing}
		>
			{#if activeAgent}
				<aside class="agent-sidebar">
					<div class="agent-sidebar-header">
						<span class="agent-title">{activeAgent.toUpperCase()} AGENT</span>
						<button class="close-sidebar" onclick={() => activeAgent = undefined}>×</button>
					</div>
					<div class="agent-panel-container">
						{#if activeAgent === 'scenario'}
							<ScenarioAgent {storyboardPath} />
						{:else if activeAgent === 'episode'}
							<EpisodeAgent {selectedEpisode} {storyboardPath} />
						{:else if activeAgent === 'character'}
							<CharacterAgent {selectedEpisode} {storyboardPath} />
						{:else if activeAgent === 'cinematic'}
							<CinematicAgent 
								{selectedEpisode} 
								{storyboardPath} 
								pageNumber={selectedPage} 
								panelIndex={selectedPanelIndex} 
							/>
						{:else if activeAgent === 'dialogue'}
							<DialogueAgent 
								{selectedEpisode} 
								{storyboardPath} 
								pageNumber={selectedPage} 
								panelIndex={selectedPanelIndex}
								panelData={selectedPanelData}
								on:generated={(e) => {
									if (selectedPanelData) {
										const newData = { ...selectedPanelData, dialogue: e.detail.dialogue };
										handlePanelUpdate(selectedPage, selectedPanelIndex, newData);
									}
								}}
							/>
						{/if}
					</div>
				</aside>
			{/if}
			
			{#if viewMode === 'manga'}
				<div class="storyboard-view" style="width: {storyboardWidthPercent}%">
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
						on:panelSelect={({ detail }) => {
							selectedPanelIndex = detail.panel;
							selectedPanelData = detail.data;
						}}
						on:agentTrigger={({ detail }) => {
							activeAgent = detail.agent;
						}}
					/>
				</div>

				<div 
					class="resizer" 
					onmousedown={startResizing}
					role="separator"
					aria-valuenow={storyboardWidthPercent}
					aria-valuemin="20"
					aria-valuemax="80"
					tabindex="0"
				></div>

				<div class="manga-view" style="width: {100 - storyboardWidthPercent}%">
					<MangaEditor
						{panels}
						episodeId={selectedEpisode}
						{storyboardPath}
						bind:selectedPage
						on:update={({ detail }) =>
							handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
					/>
				</div>
			{:else}
				<StoryEditorView 
					{panels} 
					episodeId={selectedEpisode} 
					{storyboardPath}
					on:update={({ detail }) =>
						handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
				/>
			{/if}
		</div>
	{:else if episodes.length === 0 && !loading}
		<div class="empty-state">
			<p>No episodes available. Check console for details.</p>
			<button onclick={loadEpisodes}>Retry</button>
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
		position: relative;
	}

	.editor-content.resizing {
		cursor: col-resize;
		user-select: none;
	}

	.agent-sidebar {
		width: 300px;
		background: #f9f9f9;
		border-right: 1px solid #ddd;
		display: flex;
		flex-direction: column;
		box-shadow: 2px 0 5px rgba(0,0,0,0.05);
	}

	.agent-sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #eee;
		border-bottom: 1px solid #ddd;
	}

	.agent-title {
		font-size: 0.75rem;
		font-weight: 800;
		color: #555;
		letter-spacing: 0.05em;
	}

	.close-sidebar {
		background: none;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
		color: #888;
	}

	.agent-panel-container {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.storyboard-view {
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border-right: 1px solid #ddd;
	}

	.resizer {
		width: 8px;
		background: #eee;
		cursor: col-resize;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		z-index: 20;
		border-left: 1px solid #ddd;
		border-right: 1px solid #ddd;
	}

	.resizer:hover, .editor-content.resizing .resizer {
		background: #4a90e2;
	}

	.resizer::after {
		content: '⋮';
		color: #888;
		font-weight: bold;
	}

	.manga-view {
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

	.episode-agent-controls {
		display: flex;
		gap: 0.5rem;
		margin-left: 1rem;
	}

	.agent-btn {
		padding: 0.4rem 0.8rem;
		border: none;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		color: white;
		transition: opacity 0.2s;
	}

	.agent-btn:hover {
		opacity: 0.9;
	}

	.view-switcher {
		display: flex;
		background: #eee;
		padding: 3px;
		border-radius: 6px;
		margin: 0 1rem;
	}

	.view-switcher button {
		padding: 0.4rem 1rem;
		border: none;
		background: transparent;
		border-radius: 4px;
		font-size: 0.85rem;
		font-weight: 600;
		color: #666;
		cursor: pointer;
		transition: all 0.2s;
	}

	.view-switcher button.active {
		background: #fff;
		color: #4a90e2;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.scenario-btn { background: #4a90e2; }
	.episode-btn { background: #2ecc71; }
	.character-btn { background: #9b59b6; }

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
