<script lang="ts">
	import { getEpisodes, getEpisodePanels, getArcs, getArcPanels, storyboardClient, streamUpdates, exportPdf, listProjects, switchProject, loadStoryboard } from '$lib/client/storyboard-client';
	import StoryboardPage from './StoryboardPage.svelte';
	import MangaEditor from './MangaEditor.svelte';
	import ScriptView from './ScriptView.svelte';
	import WebtoonView from './WebtoonView.svelte';
	import ShootingView from './ShootingView.svelte';
	import KindleView from './KindleView.svelte';
	import NodeTree from './NodeTree.svelte';
	import ChatPanel from './ChatPanel.svelte';
	import ImageGenStatus from './ImageGenStatus.svelte';
	import type { PanelData, Panel } from '$lib/gen/proto/storyboard_pb';
	import { updateJob, removeJob } from '$lib/stores/job-store.svelte';
	import { FileDown, LayoutGrid, PenTool, MessageCircle } from 'lucide-svelte';
	const validViews = ['storyboard', 'webtoon', 'kindle', 'manga', 'script', 'shooting'];

	// ---- URL ↔ State ----
	// URL pattern: /{projectId}/episodes/{episodeId}/{view}
	//              /{projectId}/arcs/{arcId}/{view}
	//              /{projectId}  → default episode + storyboard
	//              /             → active project default

	interface UrlState {
		projectId: string;
		editMode: 'episode' | 'arc';
		resourceId: string;  // episodeId or arcId
		view: string;
	}

	function parseUrl(): UrlState {
		if (typeof window === 'undefined') return { projectId: '', editMode: 'episode', resourceId: '', view: 'storyboard' };
		const segments = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
		const state: UrlState = { projectId: '', editMode: 'episode', resourceId: '', view: 'storyboard' };

		if (segments.length >= 1) state.projectId = decodeURIComponent(segments[0]!);
		if (segments.length >= 3 && (segments[1] === 'episodes' || segments[1] === 'arcs')) {
			state.editMode = segments[1] === 'arcs' ? 'arc' : 'episode';
			state.resourceId = decodeURIComponent(segments[2]!);
		}
		if (segments.length >= 4 && validViews.includes(segments[3]!)) {
			state.view = segments[3]!;
		} else if (segments.length === 2 && validViews.includes(segments[1]!)) {
			// /{projectId}/{view} shorthand
			state.view = segments[1]!;
		}
		return state;
	}

	function buildUrl(projectId: string, mode: string, resourceId: string, view: string): string {
		if (!projectId) return '/';
		const base = `/${encodeURIComponent(projectId)}`;
		const resource = mode === 'arc' ? 'arcs' : 'episodes';
		if (!resourceId) return view === 'storyboard' ? base : `${base}/${view}`;
		const viewSuffix = view === 'storyboard' ? '' : `/${view}`;
		return `${base}/${resource}/${encodeURIComponent(resourceId)}${viewSuffix}`;
	}

	function pushUrl() {
		if (typeof window === 'undefined') return;
		const target = buildUrl(activeProject, editMode, editMode === 'episode' ? selectedEpisode : selectedArc, viewMode);
		if (window.location.pathname !== target) {
			history.pushState({}, '', target);
		}
	}

	function replaceUrl() {
		if (typeof window === 'undefined') return;
		const target = buildUrl(activeProject, editMode, editMode === 'episode' ? selectedEpisode : selectedArc, viewMode);
		if (window.location.pathname !== target) {
			history.replaceState({}, '', target);
		}
	}

	const initialUrl = parseUrl();

	let projects: Array<{ id: string; name: string; hasStoryboard: boolean }> = $state([]);
	let activeProject = $state(initialUrl.projectId);
	let episodes: Array<{ id: string; title: string; totalPages: number }> = $state([]);
	let arcs: Array<{ id: string; title: string; description: string; episodeIds: string[] }> = $state([]);
	let selectedEpisode = $state(initialUrl.editMode === 'episode' ? initialUrl.resourceId : '');
	let selectedArc = $state(initialUrl.editMode === 'arc' ? initialUrl.resourceId : '');
	let editMode = $state<string>(initialUrl.editMode);
	let panels: Panel[] = $state([]);
	let loading = $state(false);
	let error = $state('');
	let selectedPage = $state(1);
	let selectedPanelIndex = $state(1);
	let selectedPanelData = $state<PanelData | undefined>(undefined);
	let viewMode = $state<string>(initialUrl.view);
	let projectCharacterIds: string[] = $state([]);
	let workspacePane = $state<string>('canvas');

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

	let storyboardWidthPercent = $state(50);
	let isResizing = $state(false);

	function startResizing(e: MouseEvent) { isResizing = true; e.preventDefault(); }
	function handleMouseMove(e: MouseEvent) {
		if (!isResizing) return;
		const container = document.querySelector('.editor-content');
		if (!container) return;
		const containerRect = container.getBoundingClientRect();
		const sidebar = document.querySelector('.agent-sidebar');
		const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 0;
		const relativeX = e.clientX - containerRect.left - sidebarWidth;
		const totalWidth = containerRect.width - sidebarWidth;
		storyboardWidthPercent = Math.max(20, Math.min(80, (relativeX / totalWidth) * 100));
	}
	function stopResizing() { isResizing = false; }

	$effect(() => {
		console.log('StoryboardEditor state:', { selectedPanelIndex, selectedPanelData, storyboardWidthPercent, isResizing, startResizing, handleMouseMove, stopResizing });
	});

	const sessionId = Math.random().toString(36).substring(2, 15);
	const storyboardPath = '';

	async function loadProjects() {
		const response = await listProjects();
		projects = (response.projects ?? []).map((p) => ({ id: p.id ?? '', name: p.name ?? '', hasStoryboard: p.hasStoryboard ?? false }));
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
			const ids = chars.map((c: any) => { if (typeof c === 'string') return c; if (c && typeof c === 'object') return c['@id'] ?? c.id ?? ''; return ''; }).filter((v: string) => !!v).map((v: string) => normalizeCharacterId(v));
			projectCharacterIds = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
		} catch (err) {
			console.warn('[StoryboardEditor] loadProjectCharacters failed', err);
			projectCharacterIds = [];
		}
	}

	async function handleProjectSwitch(projectId: string) {
		if (projectId === activeProject) return;
		try {
			loading = true; error = '';
			await switchProject(projectId);
			activeProject = projectId;
			episodes = []; arcs = []; panels = []; selectedEpisode = ''; selectedArc = ''; selectedPage = 1;
			await Promise.all([loadEpisodes(), loadArcs(), loadProjectCharacters()]);
			pushUrl();
		} catch (err) {
			error = `Failed to switch project: ${err}`;
		} finally { loading = false; }
	}

	// Sync viewMode ↔ URL
	function setViewMode(v: string) {
		viewMode = v;
		workspacePane = 'canvas';
		pushUrl();
	}

	function setEpisode(id: string) {
		selectedEpisode = id;
		pushUrl();
	}

	function setArc(id: string) {
		selectedArc = id;
		pushUrl();
	}

	function setEditMode(mode: string) {
		editMode = mode;
		pushUrl();
	}

	// Browser back/forward
	$effect(() => {
		if (typeof window === 'undefined') return;
		const handlePopState = () => {
			const s = parseUrl();
			if (s.projectId && s.projectId !== activeProject) {
				handleProjectSwitch(s.projectId);
			}
			if (s.editMode !== editMode) editMode = s.editMode;
			if (s.resourceId) {
				if (s.editMode === 'episode' && s.resourceId !== selectedEpisode) selectedEpisode = s.resourceId;
				if (s.editMode === 'arc' && s.resourceId !== selectedArc) selectedArc = s.resourceId;
			}
			if (s.view !== viewMode) {
				viewMode = s.view;
				workspacePane = 'canvas';
			}
		};
		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	});

	let initialized = false;
	$effect(() => {
		if (initialized) return;
		initialized = true;
		(async () => {
			try {
				await loadProjects();
				// If URL specified a project, switch to it
				if (initialUrl.projectId && initialUrl.projectId !== activeProject) {
					const found = projects.find(p => p.id === initialUrl.projectId);
					if (found) {
						await switchProject(found.id);
						activeProject = found.id;
					}
				}
				await Promise.all([loadEpisodes(), loadArcs(), loadProjectCharacters()]);
				// If URL specified a resource, select it
				if (initialUrl.resourceId) {
					if (initialUrl.editMode === 'episode') selectedEpisode = initialUrl.resourceId;
					else selectedArc = initialUrl.resourceId;
				}
				// Set canonical URL after data is loaded
				replaceUrl();
			} catch (err) { console.error('[StoryboardEditor] init error', err); }
		})();
	});

	$effect(() => {
		const currentId = editMode === 'episode' ? selectedEpisode : selectedArc;
		if (!currentId) return;
		let unsubscribe: (() => void) | undefined;
		const timer = setTimeout(() => {
			unsubscribe = streamUpdates(storyboardPath, sessionId,
				(update) => {
					const isRelevant = editMode === 'episode' ? update.episodeId === selectedEpisode : arcs.find(a => a.id === selectedArc)?.episodeIds.includes(update.episodeId);
					if (update.updateType === 'panel_updated' && isRelevant) {
						panels = panels.map(p => { if (p.pageNumber === update.pageNumber && p.panel === update.panel) { const np = { ...p }; if (update.panelData) np.data = update.panelData; return np; } return p; });
					} else if (update.updateType === 'chat_message') {
						if (chatPanel && update.chatMessage) chatPanel.addMessage({ role: update.chatMessage.role, agent: update.chatMessage.agentMode, content: update.chatMessage.content });
					} else if (update.updateType?.startsWith('job_')) {
						if (update.jobId) {
							if (['completed', 'failed', 'cancelled'].includes(update.jobStatus ?? '')) {
								updateJob(update.jobId, { status: update.jobStatus, imageUrl: update.jobImageUrl || '', error: update.jobError || '' });
								if (update.jobStatus === 'completed' && isRelevant) loadPanels();
								setTimeout(() => removeJob(update.jobId!), 3000);
							} else {
								updateJob(update.jobId, { jobId: update.jobId, episodeId: update.episodeId, pageNumber: update.pageNumber, panel: update.panel, status: update.jobStatus || 'running', currentStep: update.jobCurrentStep, totalSteps: update.jobTotalSteps, etaMs: update.jobEtaMs });
							}
						}
					}
				},
				(err) => console.error('[StoryboardEditor] Stream error:', err)
			);
		}, 100);
		return () => { clearTimeout(timer); if (unsubscribe) unsubscribe(); };
	});

	async function loadEpisodes() {
		try { loading = true; error = '';
			const list = await getEpisodes(storyboardPath);
			episodes = list.map((e) => ({ id: e.id ?? '', title: e.title ?? '', totalPages: e.totalPages ?? 0 }));
			if (episodes.length > 0 && !selectedEpisode && editMode === 'episode') { const f = episodes[0]; if (f) { selectedEpisode = f.id; await loadPanels(); } }
		} catch (err) { error = err instanceof Error ? err.message : 'Failed to load episodes'; episodes = []; } finally { loading = false; }
	}

	async function loadArcs() {
		try { loading = true; error = '';
			const list = await getArcs(storyboardPath);
			arcs = list.map((a) => ({ id: a.id ?? '', title: a.title ?? '', description: a.description ?? '', episodeIds: a.episodeIds ?? [] }));
			if (arcs.length > 0 && !selectedArc && editMode === 'arc') { const f = arcs[0]; if (f) { selectedArc = f.id; await loadArcPanelsData(); } }
		} catch (err) { error = err instanceof Error ? err.message : 'Failed to load arcs'; arcs = []; } finally { loading = false; }
	}

	async function loadPanels() {
		if (!selectedEpisode) return;
		try { loading = true; error = ''; panels = await getEpisodePanels(storyboardPath, selectedEpisode, 0); } catch (err) { error = err instanceof Error ? err.message : 'Failed to load panels'; panels = []; } finally { loading = false; }
	}

	async function loadArcPanelsData() {
		if (!selectedArc) return;
		try { loading = true; error = ''; panels = await getArcPanels(storyboardPath, selectedArc); } catch (err) { error = err instanceof Error ? err.message : 'Failed to load arc panels'; panels = []; } finally { loading = false; }
	}

	async function handlePanelUpdate(pageNumber: number, panel: number, data: PanelData) {
		const episodeId = editMode === 'episode' ? selectedEpisode : (data as any).gh_episodeId || selectedEpisode;
		if (!episodeId) return;
		panels = panels.map(p => (p.pageNumber === pageNumber && p.panel === panel) ? { ...p, data } : p);
		try {
			await storyboardClient.updatePanel({ filePath: storyboardPath, episodeId, pageNumber, panel, panelData: data, sessionId });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update panel';
			if (editMode === 'episode') await loadPanels(); else await loadArcPanelsData();
		}
	}

	let lastContextId = $state<string | null>(null);
	$effect(() => {
		const currentId = editMode === 'episode' ? selectedEpisode : selectedArc;
		if (!currentId || currentId.trim() === '') return;
		if (currentId !== lastContextId) {
			lastContextId = currentId;
			if (editMode === 'episode') { loadPanels(); addContextToChat('episode', { id: currentId }); }
			else { loadArcPanelsData(); addContextToChat('arc', { id: currentId }); }
		}
	});

	$effect(() => {
		if (editMode === 'episode' && !selectedEpisode && episodes.length > 0) { const f = episodes[0]; if (f) { selectedEpisode = f.id; replaceUrl(); } }
		else if (editMode === 'arc' && !selectedArc && arcs.length > 0) { const f = arcs[0]; if (f) { selectedArc = f.id; replaceUrl(); } }
	});

	let isExporting = $state(false);
	async function handleExportPdf() {
		if (isExporting || panels.length === 0) return;
		isExporting = true;
		try {
			const currentId = editMode === 'episode' ? selectedEpisode : selectedArc;
			const response = await exportPdf(storyboardPath, editMode === 'episode' ? currentId : '', editMode === 'arc' ? currentId : '', viewMode);
			if (response.pdfContent) {
				const pdfBytes = response.pdfContent;
				const blob = new Blob([pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a'); a.href = url; a.download = response.filename || `storyboard_${currentId}.pdf`;
				document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
			}
		} catch (err) { error = err instanceof Error ? err.message : 'PDF export failed'; } finally { isExporting = false; }
	}

	const viewModeItems = [
		{ value: 'storyboard', label: 'Storyboard' },
		{ value: 'webtoon', label: 'Webtoon' },
		{ value: 'kindle', label: 'Kindle' },
		{ value: 'manga', label: 'Manga' },
		{ value: 'script', label: 'Script' },
		{ value: 'shooting', label: 'Shooting' },
	];

	const editModeItems = [
		{ value: 'episode', label: 'Episode' },
		{ value: 'arc', label: 'Arc' },
	];

	const workspacePaneItems = [
		{ value: 'structure', label: 'Structure', icon: 'grid' },
		{ value: 'canvas', label: 'Canvas', icon: 'pen' },
		{ value: 'assistant', label: 'Assistant', icon: 'chat' },
	];
</script>

<div class="editor-root">
	<!-- iOS-style Navigation Bar -->
	<header class="nav-bar">
		<div class="nav-row-top">
			<select
				class="project-select"
				value={activeProject}
				onchange={(e) => {
					const v = e.currentTarget.value;
					if (v !== activeProject) handleProjectSwitch(v);
				}}
				disabled={loading || projects.length === 0}
			>
				{#if projects.length === 0}
					<option value="" disabled>Loading...</option>
				{:else}
					{#each projects as project}
						<option value={project.id} selected={project.id === activeProject}>{project.name}</option>
					{/each}
				{/if}
			</select>
			<div class="nav-actions">
				<ImageGenStatus />
				<button
					class="btn-icon-nav"
					onclick={handleExportPdf}
					disabled={isExporting || panels.length === 0}
					title="Export PDF"
				>
					{#if isExporting}
						<span class="spinner"></span>
					{:else}
						<FileDown size={20} />
					{/if}
				</button>
			</div>
		</div>

		<div class="nav-row">
			<div class="ios-segment shrink-0">
				{#each editModeItems as item}
					<button class:active={editMode === item.value} onclick={() => setEditMode(item.value)}>{item.label}</button>
				{/each}
			</div>
			{#if editMode === 'episode'}
				<select class="content-select" value={selectedEpisode} onchange={(e) => setEpisode(e.currentTarget.value)}>
					{#if episodes.length === 0}<option value="" disabled>No episodes</option>
					{:else}{#each episodes as ep}<option value={ep.id}>{ep.title}</option>{/each}{/if}
				</select>
			{:else}
				<select class="content-select" value={selectedArc} onchange={(e) => setArc(e.currentTarget.value)}>
					{#if arcs.length === 0}<option value="" disabled>No arcs</option>
					{:else}{#each arcs as arc}<option value={arc.id}>{arc.title}</option>{/each}{/if}
				</select>
			{/if}
		</div>

		<div class="nav-row">
			<div class="ios-segment flex-1">
				{#each viewModeItems as item}
					<button class:active={viewMode === item.value} onclick={() => setViewMode(item.value)}>{item.label}</button>
				{/each}
			</div>
		</div>
	</header>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if loading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<span>Loading...</span>
		</div>
	{:else if panels.length > 0}
		<div class="editor-content">
			<div class="pane pane-structure" class:pane-active={workspacePane === 'structure'}>
				<NodeTree
					{panels}
					characterIds={projectCharacterIds}
					selectedId={editMode === 'episode' ? selectedEpisode : selectedArc}
					onSelect={(panel) => { selectedPanelIndex = panel.panel; selectedPanelData = panel.data; addContextToChat('panel', panel); }}
					onContextAdd={(type, data) => addContextToChat(type, data)}
					onPanelsChanged={() => { if (editMode === 'episode') loadPanels(); else loadArcPanelsData(); }}
				/>
			</div>

			<div class="pane pane-canvas" class:pane-active={workspacePane === 'canvas'}>
				{#if viewMode === 'storyboard'}
					<StoryboardPage {panels} episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} storyboardPath={storyboardPath}
						on:update={({ detail }) => handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
						on:pageChange={({ detail }) => { selectedPage = detail; }}
						on:panelSelect={({ detail }) => { selectedPanelIndex = detail.panel; selectedPanelData = detail.data; addContextToChat('panel', detail); }}
						on:contextAdd={({ detail }) => addContextToChat(detail.type, detail.data)}
						on:agentTrigger={({ detail }) => openChatWithAgent(detail.agent)} />
				{:else if viewMode === 'webtoon'}
					<WebtoonView {panels} episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} {storyboardPath} />
				{:else if viewMode === 'kindle'}
					<KindleView {panels} episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} {storyboardPath} />
				{:else if viewMode === 'manga'}
					<MangaEditor {panels} episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} {storyboardPath} bind:selectedPage
						on:update={({ detail }) => handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
						on:panelSelect={({ detail }) => { selectedPanelIndex = detail.panel; selectedPanelData = detail.data; addContextToChat('panel', detail); }}
						on:contextAdd={({ detail }) => addContextToChat(detail.type, detail.data)} />
				{:else if viewMode === 'script'}
					<ScriptView {panels} episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} {storyboardPath}
						on:update={({ detail }) => handlePanelUpdate(detail.pageNumber, detail.panel, detail.data)}
						on:panelSelect={({ detail }) => { selectedPanelIndex = detail.panel; selectedPanelData = detail.data; addContextToChat('panel', detail); }}
						on:contextAdd={({ detail }) => addContextToChat(detail.type, detail.data)} />
				{:else if viewMode === 'shooting'}
					<ShootingView {panels} episodeId={editMode === 'episode' ? selectedEpisode : selectedArc} {storyboardPath} />
				{/if}
			</div>

			<div class="pane pane-assistant" class:pane-active={workspacePane === 'assistant'}>
				<ChatPanel bind:this={chatPanel} selectedEpisode={editMode === 'episode' ? selectedEpisode : selectedArc} {storyboardPath} />
			</div>
		</div>

		<!-- Bottom Tab Bar -->
		<nav class="tab-bar">
			{#each workspacePaneItems as item}
				<button class="tab-item" class:active={workspacePane === item.value} onclick={() => workspacePane = item.value}>
					{#if item.icon === 'grid'}
						<LayoutGrid size={22} />
					{:else if item.icon === 'pen'}
						<PenTool size={22} />
					{:else}
						<MessageCircle size={22} />
					{/if}
					<span class="tab-label">{item.label}</span>
				</button>
			{/each}
		</nav>
	{:else if episodes.length === 0 && !loading}
		<div class="empty-state">
			<p class="empty-title">No Episodes</p>
			<p class="empty-desc">No episodes available. Check the project settings.</p>
			<button class="empty-retry" onclick={loadEpisodes}>Retry</button>
		</div>
	{/if}
</div>

<style>
	@reference "tailwindcss";

	.editor-root {
		@apply flex h-[100dvh] flex-col;
		background: var(--body-background-color, #f2f2f7);
	}

	/* Navigation Bar - iOS frosted glass */
	.nav-bar {
		@apply sticky top-0 z-30 flex flex-col gap-2 border-b border-black/5 px-4 pb-2 pt-3;
		background: rgba(249, 249, 249, 0.94);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		padding-top: calc(0.75rem + env(safe-area-inset-top, 0px));
	}

	.nav-row-top {
		@apply flex items-center gap-2;
	}

	.nav-row {
		@apply flex items-center gap-2;
	}

	/* iOS Segmented Control */
	.ios-segment {
		@apply flex rounded-[9px] p-[2px];
		background: rgba(118, 118, 128, 0.12);
	}
	.ios-segment button {
		@apply flex-1 rounded-[7px] px-3 py-[6px] text-[13px] font-semibold text-zinc-500 transition-all;
	}
	.ios-segment button.active {
		@apply text-zinc-900;
		background: white;
		box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
	}

	.project-select {
		@apply min-w-0 flex-1 appearance-none rounded-[10px] border-0 px-3 py-2.5 text-[15px] font-semibold text-zinc-900 outline-none;
		background: rgba(118, 118, 128, 0.12);
		background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
		padding-right: 32px;
	}

	.content-select {
		@apply min-w-0 flex-1 appearance-none rounded-[10px] border-0 px-3 py-2 text-[13px] text-zinc-700 outline-none;
		background: rgba(118, 118, 128, 0.12);
		background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 10px center;
		padding-right: 28px;
	}

	.nav-actions {
		@apply flex shrink-0 items-center gap-1.5;
	}

	.btn-icon-nav {
		@apply flex h-[38px] w-[38px] items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-40;
		background: #007aff;
	}

	.spinner {
		@apply inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent;
	}

	/* Error */
	.error-banner {
		@apply mx-4 mt-1 rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-red-600;
	}

	/* Loading */
	.loading-state {
		@apply flex flex-1 flex-col items-center justify-center gap-3 text-[15px] text-zinc-400;
	}
	.loading-spinner {
		@apply h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200;
		border-top-color: #007aff;
	}

	/* Empty */
	.empty-state {
		@apply flex flex-1 flex-col items-center justify-center gap-2 p-8;
	}
	.empty-title { @apply text-[20px] font-semibold text-zinc-900; }
	.empty-desc { @apply text-[15px] text-zinc-500; }
	.empty-retry { @apply mt-4 rounded-full px-6 py-2.5 text-[15px] font-semibold text-white active:opacity-80; background: #007aff; }

	/* Editor Content - Pane system */
	.editor-content {
		@apply relative flex flex-1 overflow-hidden;
		padding-bottom: calc(50px + env(safe-area-inset-bottom, 0px));
	}

	.pane {
		@apply hidden h-full min-w-0 flex-col overflow-hidden;
	}
	.pane-active {
		@apply flex flex-1;
	}
	.pane-canvas {
		background: var(--body-background-color, #f2f2f7);
	}

	/* Bottom Tab Bar - iOS style */
	.tab-bar {
		@apply fixed bottom-0 left-0 right-0 z-30 flex border-t border-black/8;
		background: rgba(249, 249, 249, 0.94);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}

	.tab-item {
		@apply flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2 text-zinc-400 transition-colors;
	}
	.tab-item.active {
		color: #007aff;
	}
	.tab-label {
		@apply text-[10px] font-medium;
	}

	/* Desktop: show all panes */
	@media (min-width: 1024px) {
		.pane { @apply flex; }
		.pane-structure { @apply w-[260px] shrink-0 border-r border-black/5; flex: none; }
		.pane-canvas { @apply flex-1; }
		.pane-assistant { @apply w-[340px] shrink-0 border-l border-black/5; flex: none; }
		.tab-bar { @apply hidden; }
		.editor-content { padding-bottom: 0; }
	}
</style>
