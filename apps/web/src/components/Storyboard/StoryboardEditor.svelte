<script lang="ts">
	import { getEpisodes, getEpisodePanels, getArcs, getArcPanels, storyboardClient, streamUpdates, exportPdf, listProjects, switchProject, loadStoryboard } from '$lib/client/storyboard-client';
	import StoryboardPage from './StoryboardPage.svelte';
	import MangaEditor from './MangaEditor.svelte';
	import ScriptView from './ScriptView.svelte';
	import ShootingView from './ShootingView.svelte';
	import NodeTree from './NodeTree.svelte';
	import ChatPanel from './ChatPanel.svelte';
	import ImageGenStatus from './ImageGenStatus.svelte';
	// import { exportToPdf, type ExportMode } from '$lib/pdf-export';
	import type { PanelData, Panel } from '$lib/gen/proto/storyboard_pb';
	import { updateJob, removeJob } from '$lib/stores/job-store.svelte';

	let projects: Array<{ id: string; name: string; hasStoryboard: boolean }> = $state([]);
	let activeProject = $state('');
	let episodes: Array<{ id: string; title: string; totalPages: number }> = $state([]);
	let arcs: Array<{ id: string; title: string; description: string; episodeIds: string[] }> = $state([]);
	let selectedEpisode = $state('');
	let selectedArc = $state('');
	let editMode = $state<'episode' | 'arc'>('episode');
	let panels: Panel[] = $state([]);
	let loading = $state(false);
	let error = $state('');
	let selectedPage = $state(1);
	let selectedPanelIndex = $state(1);
	let selectedPanelData = $state<PanelData | undefined>(undefined);
	let viewMode = $state<'storyboard' | 'manga' | 'script' | 'shooting'>('storyboard');
	let projectCharacterIds: string[] = $state([]);
	let workspacePane = $state<'structure' | 'canvas' | 'assistant'>('canvas');
	
	// Chat Panel reference
	let chatPanel = $state<any>(undefined);

	function openChatWithAgent(agent: any, prompt?: string) {
		if (chatPanel) {
			chatPanel.triggerAgent(agent, prompt);
			workspacePane = 'assistant';
		}
	}

	function addContextToChat(type: string, data: any) {
		if (chatPanel) {
			chatPanel.addContext(type, data);
			workspacePane = 'assistant';
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

	// Remove unused variables found by svelte-check
	// let selectedPanelIndex = $state(1);
	// let selectedPanelData = $state<PanelData | undefined>(undefined);
	// let storyboardWidthPercent = $state(50);
	// let isResizing = $state(false);

	$effect(() => {
		console.log('StoryboardEditor state:', { 
			selectedPanelIndex, 
			selectedPanelData, 
			storyboardWidthPercent, 
			isResizing,
			startResizing,
			handleMouseMove,
			stopResizing
		});
	});
	
	const sessionId = Math.random().toString(36).substring(2, 15);

	const storyboardPath = '';

	async function loadProjects() {
		const response = await listProjects();
		projects = (response.projects ?? []).map((p) => ({
			id: p.id ?? '',
			name: p.name ?? '',
			hasStoryboard: p.hasStoryboard ?? false,
		}));
		activeProject = response.activeProject ?? '';
	}

	function normalizeCharacterId(id: string): string {
		if (!id) return id;
		if (!id.startsWith('character:')) return `character:${id}`;
		return id;
	}

	async function loadProjectCharacters() {
		try {
			const response = await loadStoryboard(storyboardPath);
			const json = JSON.parse(response.jsonldContent || '{}') as Record<string, any>;
			const chars = Array.isArray(json['gh:characters']) ? json['gh:characters'] : [];
			const ids = chars
				.map((c: any) => {
					if (typeof c === 'string') return c;
					if (c && typeof c === 'object') return c['@id'] ?? c.id ?? '';
					return '';
				})
				.filter((v: string) => !!v)
				.map((v: string) => normalizeCharacterId(v));
			projectCharacterIds = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
		} catch (err) {
			console.warn('[StoryboardEditor] loadProjectCharacters: failed, fallback to panel-derived list', err);
			projectCharacterIds = [];
		}
	}

	async function handleProjectSwitch(projectId: string) {
		if (projectId === activeProject) return;
		try {
			loading = true;
			error = '';
			await switchProject(projectId);
			activeProject = projectId;
			// Reset state and reload
			episodes = [];
			arcs = [];
			panels = [];
			selectedEpisode = '';
			selectedArc = '';
			selectedPage = 1;
			await Promise.all([loadEpisodes(), loadArcs(), loadProjectCharacters()]);
		} catch (err) {
			console.error('[StoryboardEditor] handleProjectSwitch error:', err);
			error = `Failed to switch project: ${err}`;
		} finally {
			loading = false;
		}
	}

	// Load initial data - use $effect for reliable initialization
	let initialized = false;
	$effect(() => {
		if (initialized) return;
		initialized = true;
		console.log('[StoryboardEditor] init: loading projects, episodes and arcs, sessionId:', sessionId);
		(async () => {
			try {
				await loadProjects();
				await Promise.all([loadEpisodes(), loadArcs(), loadProjectCharacters()]);
			} catch (err) {
				console.error('[StoryboardEditor] init: error loading initial data', err);
			}
		})();
	});

	$effect(() => {
		const currentId = editMode === 'episode' ? selectedEpisode : selectedArc;
		if (!currentId) return;

		console.log('[StoryboardEditor] Effect: setting up stream for', currentId);
		let unsubscribe: (() => void) | undefined;
		
		// Use a small timeout to avoid rapid re-connections during state transitions
		const timer = setTimeout(() => {
			unsubscribe = streamUpdates(
				storyboardPath,
				sessionId,
				(update) => {
					console.log('[StoryboardEditor] Stream update received:', update);
					const isRelevant = editMode === 'episode' 
						? update.episodeId === selectedEpisode 
						: arcs.find(a => a.id === selectedArc)?.episodeIds.includes(update.episodeId);

					if (update.updateType === 'panel_updated' && isRelevant) {
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
					} else if (update.updateType?.startsWith('job_')) {
						// Job progress/completion events
						if (update.jobId) {
							if (update.jobStatus === 'completed' || update.jobStatus === 'failed' || update.jobStatus === 'cancelled') {
								updateJob(update.jobId, {
									status: update.jobStatus,
									imageUrl: update.jobImageUrl || '',
									error: update.jobError || '',
								});
								// Reload panels to get the updated image
								if (update.jobStatus === 'completed' && isRelevant) {
									loadPanels();
								}
								// Remove from store after a brief delay
								setTimeout(() => removeJob(update.jobId!), 3000);
							} else {
								updateJob(update.jobId, {
									jobId: update.jobId,
									episodeId: update.episodeId,
									pageNumber: update.pageNumber,
									panel: update.panel,
									status: update.jobStatus || 'running',
									currentStep: update.jobCurrentStep,
									totalSteps: update.jobTotalSteps,
									etaMs: update.jobEtaMs,
								});
							}
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
			
			episodes = episodesList.map((e) => ({
				id: e.id ?? '',
				title: e.title ?? '',
				totalPages: e.totalPages ?? 0,
			}));
			
			if (episodes.length > 0 && !selectedEpisode && editMode === 'episode') {
				const firstEpisode = episodes[0];
				if (firstEpisode) {
					selectedEpisode = firstEpisode.id;
					await loadPanels();
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load episodes';
			console.error('[StoryboardEditor] Failed to load episodes:', err);
			episodes = [];
		} finally {
			loading = false;
		}
	}

	async function loadArcs() {
		try {
			console.log('[StoryboardEditor] loadArcs: starting', { storyboardPath });
			loading = true;
			error = '';
			
			const arcsList = await getArcs(storyboardPath);
			console.log('[StoryboardEditor] loadArcs: arcs received', arcsList);
			
			arcs = arcsList.map((a) => ({
				id: a.id ?? '',
				title: a.title ?? '',
				description: a.description ?? '',
				episodeIds: a.episodeIds ?? [],
			}));
			
			if (arcs.length > 0 && !selectedArc && editMode === 'arc') {
				const firstArc = arcs[0];
				if (firstArc) {
					selectedArc = firstArc.id;
					await loadArcPanelsData();
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load arcs';
			console.error('[StoryboardEditor] Failed to load arcs:', err);
			arcs = [];
		} finally {
			loading = false;
		}
	}

	async function loadPanels() {
		if (!selectedEpisode) return;
		try {
			loading = true;
			error = '';
			const panelsList = await getEpisodePanels(storyboardPath, selectedEpisode, 0);
			panels = panelsList;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load panels';
			panels = [];
		} finally {
			loading = false;
		}
	}

	async function loadArcPanelsData() {
		if (!selectedArc) return;
		try {
			loading = true;
			error = '';
			const panelsList = await getArcPanels(storyboardPath, selectedArc);
			panels = panelsList;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load arc panels';
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
		const episodeId = editMode === 'episode' ? selectedEpisode : (data as any).gh_episodeId || selectedEpisode;
		if (!episodeId) return;
		
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
				episodeId: episodeId,
				pageNumber,
				panel,
				panelData: data,
				sessionId: sessionId
			});
			// No need to reload everything if we updated local state correctly
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update panel';
			console.error('Failed to update panel:', err);
			if (editMode === 'episode') {
				await loadPanels();
			} else {
				await loadArcPanelsData();
			}
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

	let lastContextId = $state<string | null>(null);

	// Only load panels when an episode or arc is selected
	$effect(() => {
		const currentId = editMode === 'episode' ? selectedEpisode : selectedArc;
		if (!currentId || currentId.trim() === '') return;

		if (currentId !== lastContextId) {
			console.log('[StoryboardEditor] Effect: selection changed, loading panels for', currentId);
			lastContextId = currentId;
			
			if (editMode === 'episode') {
				loadPanels();
				addContextToChat('episode', { id: currentId });
			} else {
				loadArcPanelsData();
				addContextToChat('arc', { id: currentId });
			}
		}
	});

	// Handle initial selection
	$effect(() => {
		if (editMode === 'episode' && !selectedEpisode && episodes.length > 0) {
			const firstEpisode = episodes[0];
			if (firstEpisode) {
				selectedEpisode = firstEpisode.id;
			}
		} else if (editMode === 'arc' && !selectedArc && arcs.length > 0) {
			const firstArc = arcs[0];
			if (firstArc) {
				selectedArc = firstArc.id;
			}
		}
	});

	// PDF Export state
	let isExporting = $state(false);

	async function handleExportPdf() {
		if (isExporting || panels.length === 0) return;
		
		isExporting = true;
		try {
			const currentId = editMode === 'episode' ? selectedEpisode : selectedArc;
			const episodeId = editMode === 'episode' ? currentId : '';
			const arcId = editMode === 'arc' ? currentId : '';
			
			const response = await exportPdf(
				storyboardPath,
				episodeId,
				arcId,
				viewMode
			);

			if (response.pdfContent) {
				// Download the PDF
				const pdfBytes = response.pdfContent;
				const pdfBuffer = pdfBytes.buffer.slice(
					pdfBytes.byteOffset,
					pdfBytes.byteOffset + pdfBytes.byteLength
				) as ArrayBuffer;
				const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = response.filename || `storyboard_${currentId}.pdf`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			}
		} catch (err) {
			console.error('PDF export failed:', err);
			error = err instanceof Error ? err.message : 'PDF export failed';
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="storyboard-editor">
	<header class="editor-header">
		<div class="header-row header-row-primary">
			<div class="project-selector">
				<select
					value={activeProject}
					onchange={(e) => {
						const newProject = e.currentTarget.value;
						if (newProject !== activeProject) handleProjectSwitch(newProject);
					}}
					disabled={loading || projects.length === 0}
				>
					{#if projects.length === 0}
						<option value="" disabled>Loading projects...</option>
					{:else}
						{#each projects as project}
							<option value={project.id} selected={project.id === activeProject}>{project.name}{project.hasStoryboard ? '' : ' (no storyboard)'}</option>
						{/each}
					{/if}
				</select>
			</div>
			<div class="header-right-group">
				<ImageGenStatus />
				<div class="export-controls">
					<button
						class="export-btn"
						onclick={handleExportPdf}
						disabled={isExporting || panels.length === 0}
						title={`Export ${viewMode} as PDF`}
					>
						{#if isExporting}
							<span class="spinner"></span>
							Exporting...
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
								<polyline points="14 2 14 8 20 8"></polyline>
								<line x1="12" y1="18" x2="12" y2="12"></line>
								<line x1="9" y1="15" x2="15" y2="15"></line>
							</svg>
							PDF
						{/if}
					</button>
				</div>
			</div>
		</div>
		<div class="header-row header-row-secondary">
			<div class="edit-mode-selector compact-segment">
				<button
					class:active={editMode === 'episode'}
					onclick={() => editMode = 'episode'}
				>By Episode</button>
				<button
					class:active={editMode === 'arc'}
					onclick={() => editMode = 'arc'}
				>By Arc</button>
			</div>
			<div class="selection-controls compact-selection">
				{#if editMode === 'episode'}
					<div class="episode-selector">
						<label for="episode-select">Episode</label>
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
					</div>
				{:else}
					<div class="arc-selector">
						<label for="arc-select">Arc</label>
						<select
							id="arc-select"
							bind:value={selectedArc}
						>
							{#if arcs.length === 0}
								<option value="" disabled>No arcs available</option>
							{:else}
								{#each arcs as arc}
									<option value={arc.id}>{arc.title}</option>
								{/each}
							{/if}
						</select>
					</div>
				{/if}
			</div>
		</div>
		<div class="header-row">
			<div class="view-switcher compact-segment">
				<button 
					class:active={viewMode === 'storyboard'} 
					onclick={() => {
						viewMode = 'storyboard';
						workspacePane = 'canvas';
					}}
				>Storyboard</button>
				<button 
					class:active={viewMode === 'manga'} 
					onclick={() => {
						viewMode = 'manga';
						workspacePane = 'canvas';
					}}
				>Manga</button>
				<button 
					class:active={viewMode === 'script'} 
					onclick={() => {
						viewMode = 'script';
						workspacePane = 'canvas';
					}}
				>Script</button>
				<button 
					class:active={viewMode === 'shooting'} 
					onclick={() => {
						viewMode = 'shooting';
						workspacePane = 'canvas';
					}}
				>Shooting</button>
			</div>
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if panels.length > 0}
		<div class="editor-content">
			<aside class="left-sidebar" class:mobile-hidden={workspacePane !== 'structure'}>
				<NodeTree 
					{panels} 
					characterIds={projectCharacterIds}
					selectedId={editMode === 'episode' ? selectedEpisode : selectedArc} 
					onSelect={(panel) => {
						selectedPanelIndex = panel.panel;
						selectedPanelData = panel.data;
						addContextToChat('panel', panel);
					}}
					onContextAdd={(type, data) => addContextToChat(type, data)}
				/>
			</aside>

			<main class="main-content" class:mobile-hidden={workspacePane !== 'canvas'}>
				<div class="active-view">
					{#if viewMode === 'storyboard'}
						<StoryboardPage
							{panels}
							episodeId={editMode === 'episode' ? selectedEpisode : selectedArc}
							storyboardPath={storyboardPath}
							on:update={({ detail }) =>
								handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
							on:pageChange={({ detail }) => {
								selectedPage = detail;
							}}
							on:panelSelect={({ detail }) => {
								selectedPanelIndex = detail.panel;
								selectedPanelData = detail.data;
								addContextToChat('panel', detail);
							}}
							on:contextAdd={({ detail }) => {
								addContextToChat(detail.type, detail.data);
							}}
					on:agentTrigger={({ detail }) => {
						openChatWithAgent(detail.agent);
					}}
						/>
					{:else if viewMode === 'manga'}
						<MangaEditor
							{panels}
							episodeId={editMode === 'episode' ? selectedEpisode : selectedArc}
							{storyboardPath}
							bind:selectedPage
							on:update={({ detail }) =>
								handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
							on:panelSelect={({ detail }) => {
								selectedPanelIndex = detail.panel;
								selectedPanelData = detail.data;
								addContextToChat('panel', detail);
							}}
							on:contextAdd={({ detail }) => {
								addContextToChat(detail.type, detail.data);
							}}
						/>
					{:else if viewMode === 'script'}
						<ScriptView 
							{panels} 
							episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} 
							{storyboardPath}
							on:update={({ detail }) =>
								handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
							on:panelSelect={({ detail }) => {
								selectedPanelIndex = detail.panel;
								selectedPanelData = detail.data;
								addContextToChat('panel', detail);
							}}
							on:contextAdd={({ detail }) => {
								addContextToChat(detail.type, detail.data);
							}}
						/>
					{:else if viewMode === 'shooting'}
						<ShootingView 
							{panels} 
							episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} 
							{storyboardPath}
						/>
					{/if}
				</div>
			</main>

			<aside class="right-sidebar" class:mobile-hidden={workspacePane !== 'assistant'}>
				<ChatPanel 
					bind:this={chatPanel} 
					selectedEpisode={editMode === 'episode' ? selectedEpisode : selectedArc} 
					{storyboardPath} 
					onApplyPatches={handleApplyPatches}
				/>
			</aside>
		</div>
		<nav class="workspace-bottom-nav">
			<button
				class:active={workspacePane === 'structure'}
				onclick={() => workspacePane = 'structure'}
			>Structure</button>
			<button
				class:active={workspacePane === 'canvas'}
				onclick={() => workspacePane = 'canvas'}
			>Canvas</button>
			<button
				class:active={workspacePane === 'assistant'}
				onclick={() => workspacePane = 'assistant'}
			>Assistant</button>
		</nav>
	{:else if episodes.length === 0 && !loading}
		<div class="empty-state">
			<p>No episodes available. Check console for details.</p>
			<button onclick={loadEpisodes}>Retry</button>
		</div>
	{/if}
</div>

<style>
	@reference "tailwindcss";

	.storyboard-editor { @apply flex h-full flex-col bg-[#f2f2f7] text-zinc-900; }
	.editor-header { @apply sticky top-0 z-20 border-b border-zinc-200/70 bg-white/85 px-2.5 py-2 backdrop-blur-xl; }
	.header-row { @apply flex flex-wrap items-center gap-2; }
	.header-row-primary { @apply flex-nowrap; }
	.header-row-secondary { @apply flex-nowrap items-center; }
	.project-selector { @apply min-w-[180px] flex-1; }
	.project-selector select { @apply w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200; }
	.edit-mode-selector, .view-switcher, .workspace-bottom-nav { @apply flex rounded-xl border border-zinc-200 bg-zinc-100/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]; }
	.edit-mode-selector button, .view-switcher button, .workspace-bottom-nav button { @apply flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold text-zinc-500 transition; }
	.edit-mode-selector button.active, .view-switcher button.active, .workspace-bottom-nav button.active { @apply bg-white text-[#007aff] shadow-sm; }
	.selection-controls { @apply min-w-0 flex-1; }
	.episode-selector, .arc-selector { @apply flex w-full items-center gap-2; }
	.episode-selector label, .arc-selector label { @apply whitespace-nowrap text-[11px] font-semibold text-zinc-500; }
	.episode-selector select, .arc-selector select { @apply w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200; }
	.view-switcher { @apply w-full; }
	.compact-segment { @apply min-w-[112px] flex-none; }
	.compact-selection { @apply min-w-0; }
	.error { @apply m-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700; }
	.loading { @apply p-5 text-center text-sm text-zinc-600; }
	.empty-state { @apply p-5 text-center text-sm text-zinc-600; }
	.empty-state button { @apply mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50; }
	.header-right-group { @apply ml-auto flex items-center gap-2; }
	.export-controls { @apply flex items-center; }
	.export-btn { @apply inline-flex items-center gap-1 rounded-xl border border-[#007aff] bg-[#007aff] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-60; }
	.export-btn svg { @apply shrink-0; }
	.spinner { @apply inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent; }
	.editor-content { @apply relative mx-2 mb-2 flex flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm; }
	.left-sidebar, .main-content, .right-sidebar { @apply flex min-w-0 flex-1 flex-col bg-white; }
	.main-content { @apply overflow-hidden bg-[#f7f7fb]; }
	.active-view { @apply flex flex-1 flex-col overflow-hidden; }
	.mobile-hidden { @apply hidden; }
	.workspace-bottom-nav { @apply sticky bottom-0 z-10 mx-2 mb-2 border border-zinc-200 bg-white/95 px-2 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl; }
</style>
