<script lang="ts">
	import { onMount } from 'svelte';
	import { getEpisodes, getEpisodePanels, storyboardClient, streamUpdates } from '$lib/client/storyboard-client';
	import StoryboardPage from './StoryboardPage.svelte';
	import MangaEditor from './MangaEditor.svelte';
	import ScriptView from './ScriptView.svelte';
	import ShootingView from './ShootingView.svelte';
	import NodeTree from './NodeTree.svelte';
	import ChatPanel from './ChatPanel.svelte';
	import type { PanelData, Panel } from '$lib/gen/proto/storyboard_pb';

	let episodes: Array<{ id: string; title: string; totalPages: number }> = $state([]);
	let selectedEpisode = $state('');
	let panels: Panel[] = $state([]);
	let loading = $state(false);
	let error = $state('');
	let selectedPage = $state(1);
	let selectedPanelIndex = $state(1);
	let selectedPanelData = $state<PanelData | undefined>(undefined);
	let viewMode = $state<'storyboard' | 'manga' | 'script' | 'shooting'>('storyboard');
	
	// Chat Panel reference
	let chatPanel = $state<any>(undefined);

	function openChatWithAgent(agent: any, prompt?: string) {
		if (chatPanel) {
			chatPanel.triggerAgent(agent, prompt);
		}
	}

	function addContextToChat(type: string, data: any) {
		if (chatPanel) {
			chatPanel.addContext(type, data);
		}
	}
	
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
					} else if (update.updateType === 'chat_message') {
						// Forward to chat panel
						if (chatPanel && update.chatMessage) {
							chatPanel.addMessage({
								role: update.chatMessage.role,
								agent: update.chatMessage.agentMode,
								content: update.chatMessage.content
							});
						}
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

	function handleApplyPatches(patches: any[]) {
		console.log('[StoryboardEditor] Applying patches:', patches);
		// For now, we handle simple panel data updates
		// In a real implementation, this would be more complex
		for (const patch of patches) {
			// Example path: /gh:episodes/0/gh:pages/0/gh:panels/0/dialogue/0/text
			// This is a placeholder for a real JSON-LD patch application
			console.log('[StoryboardEditor] Patch logic pending for:', patch.path);
		}
		alert(`AI suggested ${patches.length} changes. Patch application logic is being developed.`);
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
		</div>

		<div class="view-switcher">
			<button 
				class:active={viewMode === 'storyboard'} 
				onclick={() => viewMode = 'storyboard'}
			>Storyboard</button>
			<button 
				class:active={viewMode === 'manga'} 
				onclick={() => viewMode = 'manga'}
			>Manga</button>
			<button 
				class:active={viewMode === 'script'} 
				onclick={() => viewMode = 'script'}
			>Script</button>
			<button 
				class:active={viewMode === 'shooting'} 
				onclick={() => viewMode = 'shooting'}
			>Shooting</button>
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
		>
			<aside class="left-sidebar">
				<NodeTree 
					{panels} 
					{selectedEpisode} 
					onSelect={(panel) => {
						selectedPanelIndex = panel.panel;
						selectedPanelData = panel.data;
					}}
					onContextAdd={(type, data) => addContextToChat(type, data)}
				/>
			</aside>

			<main class="main-content">
				<div class="active-view">
					{#if viewMode === 'storyboard'}
						<StoryboardPage
							{panels}
							episodeId={selectedEpisode}
							storyboardPath={storyboardPath}
							on:update={({ detail }) =>
								handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
							on:pageChange={({ detail }) => {
								selectedPage = detail;
							}}
							on:panelSelect={({ detail }) => {
								selectedPanelIndex = detail.panel;
								selectedPanelData = detail.data;
							}}
					on:agentTrigger={({ detail }) => {
						openChatWithAgent(detail.agent);
					}}
						/>
					{:else if viewMode === 'manga'}
						<MangaEditor
							{panels}
							episodeId={selectedEpisode}
							{storyboardPath}
							bind:selectedPage
							on:update={({ detail }) =>
								handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
						/>
					{:else if viewMode === 'script'}
						<ScriptView 
							{panels} 
							episodeId={selectedEpisode} 
							{storyboardPath}
							on:update={({ detail }) =>
								handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
						/>
					{:else if viewMode === 'shooting'}
						<ShootingView 
							{panels} 
							episodeId={selectedEpisode} 
							{storyboardPath}
						/>
					{/if}
				</div>
			</main>

			<aside class="right-sidebar">
				<ChatPanel 
					bind:this={chatPanel} 
					{selectedEpisode} 
					{storyboardPath} 
					onApplyPatches={handleApplyPatches}
				/>
			</aside>
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
		background: #1e1e1e;
	}

	.left-sidebar {
		width: 260px;
		flex-shrink: 0;
		border-right: 1px solid #333;
		display: flex;
		flex-direction: column;
	}

	.right-sidebar {
		width: 350px;
		flex-shrink: 0;
		border-left: 1px solid #333;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		flex: 1;
		display: flex;
		position: relative;
		overflow: hidden;
		background: #fff;
	}

	.active-view {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
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
