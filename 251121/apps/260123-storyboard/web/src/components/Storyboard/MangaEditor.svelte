<script lang="ts">
	import MangaPage from './MangaPage.svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import { createEventDispatcher } from 'svelte';

	let { 
		panels = [], 
		episodeId = '', 
		storyboardPath = '', 
		selectedPage = $bindable(1),
		selectedPanel = null
	} = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
		selectedPage: number;
		selectedPanel?: { pageNumber: number, panel: number } | null;
	}>();

	const dispatch = createEventDispatcher();

	// Derived states
	let pagesMap = $derived(panels.reduce((acc: Record<number, Panel[]>, panel: Panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) {
			acc[pageNum] = [];
		}
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>));

	let pageNumbers = $derived(Object.keys(pagesMap)
		.map(Number)
		.sort((a, b) => a - b));

	let currentPagePanels = $derived(pagesMap[selectedPage] || []);

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
	<div class="editor-main">
		<div class="manga-toolbar">
			<div class="page-nav">
				<label for="manga-page-select">Page:</label>
				<select id="manga-page-select" bind:value={selectedPage}>
					{#each pageNumbers as pageNum}
						<option value={pageNum}>Page {pageNum}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="manga-preview-container">
			{#if currentPagePanels.length > 0}
				<MangaPage
					panels={currentPagePanels}
					pageNumber={selectedPage}
					{episodeId}
					{storyboardPath}
					{selectedPanel}
					on:update={(e) => handlePanelUpdate(e.detail.pageNumber, e.detail.panel, e.detail.data)}
					on:selectPanel={(e) => dispatch('selectPanel', e.detail)}
				/>
			{:else}
				<div class="empty-page">No panels for this page</div>
			{/if}
		</div>

		<!-- Bottom Floating Toolbars -->
		<div class="bottom-toolbars">
			<div class="floating-toolbar main-tools">
				<button class="tool-icon active" title="Select">⇖</button>
				<button class="tool-icon" title="Marquee">◌</button>
				<button class="tool-icon" title="Brush">✎</button>
				<button class="tool-icon" title="Character">웃</button>
				<button class="tool-icon" title="Rectangle">□</button>
				<button class="tool-icon" title="Text">T</button>
				<div class="divider"></div>
				<button class="tool-icon" title="Undo">↶</button>
				<button class="tool-icon" title="Redo">↷</button>
				<div class="divider"></div>
				<button class="tool-icon" title="Hand">✋</button>
			</div>

			<div class="floating-toolbar view-tools">
				<button class="tool-icon" title="Save">💾</button>
				<div class="divider"></div>
				<div class="zoom-controls">
					<button class="zoom-btn">−</button>
					<span class="zoom-level">100%</span>
					<button class="zoom-btn">+</button>
				</div>
				<div class="divider"></div>
				<button class="tool-icon" title="Help">?</button>
			</div>
		</div>
	</div>
</div>

<style>
	.manga-editor {
		display: flex;
		height: 100%;
		background: #f3f4f6;
		color: #111827;
		overflow: hidden;
	}

	.editor-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.manga-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background: #fff;
		border-bottom: 1px solid #e5e7eb;
	}

	.page-nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.page-nav label {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.page-nav select {
		background: #f9fafb;
		color: #111827;
		border: 1px solid #d1d5db;
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.manga-preview-container {
		flex: 1;
		overflow: auto;
		padding: 3rem;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		background: #f3f4f6;
	}

	.empty-page {
		padding: 2rem;
		color: #6b7280;
	}

	/* Floating Toolbars */
	.bottom-toolbars {
		position: absolute;
		bottom: 1.5rem;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		padding: 0 1.5rem;
		pointer-events: none;
	}

	.floating-toolbar {
		background: #fff;
		padding: 0.5rem;
		border-radius: 16px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		pointer-events: auto;
		border: 1px solid #e5e7eb;
	}

	.tool-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		border-radius: 10px;
		cursor: pointer;
		font-size: 1.25rem;
		color: #4b5563;
		transition: all 0.2s;
	}

	.tool-icon:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.tool-icon.active {
		background: #7c3aed;
		color: #fff;
	}

	.divider {
		width: 1px;
		height: 24px;
		background: #e5e7eb;
		margin: 0 0.5rem;
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0 0.5rem;
	}

	.zoom-btn {
		background: transparent;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: #4b5563;
	}

	.zoom-level {
		font-size: 0.875rem;
		font-weight: 600;
		min-width: 45px;
		text-align: center;
	}
</style>
