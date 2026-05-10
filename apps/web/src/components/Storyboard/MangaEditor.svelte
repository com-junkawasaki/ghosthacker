<script lang="ts">
	import MangaPage from './MangaPage.svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import type { LayoutTemplate, LayoutStyle } from '$lib/manga-layouts';
	import { getTemplatesForStyle, applyTemplate, getTemplateByName, selectLayoutForPage } from '$lib/manga-layouts';
	import { PanelDataSchema, MangaLayoutSchema } from '$lib/gen/proto/storyboard_pb';
	import { create } from '@bufbuild/protobuf';
	import { createEventDispatcher } from 'svelte';

	interface PageLayoutInfo {
		templateName?: string;
		category?: string;
		layoutNote?: string;
	}

	let { 
		panels = [], 
		episodeId = '', 
		storyboardPath = '', 
		selectedPage = $bindable(1),
		pageLayouts = {},
		mode = 'manga'
	} = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
		selectedPage: number;
		pageLayouts?: Record<number, PageLayoutInfo>;
		mode?: 'manga' | 'graphic-novel';
	}>();

	const dispatch = createEventDispatcher();

	let sortedAllPanels = $derived([...panels].sort((a, b) => {
		if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
		return a.panel - b.panel;
	}));

	let episodePagesMap = $derived(sortedAllPanels.reduce((acc: Record<number, Panel[]>, panel: Panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) {
			acc[pageNum] = [];
		}
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>));

	let storyPageNumbers = $derived(Object.keys(episodePagesMap)
		.map(Number)
		.filter((pageNum) => pageNum > 0)
		.sort((a, b) => a - b));

	let displayPages = $derived((storyPageNumbers.length > 0 ? storyPageNumbers : Object.keys(episodePagesMap).map(Number).sort((a, b) => a - b))
		.map((pageNum) => ({
			displayPage: pageNum,
			sourcePage: pageNum,
			panels: episodePagesMap[pageNum] ?? [],
			label: `Page ${pageNum}`
		}))
	);

	let currentDisplayPage = $derived(displayPages.find((p) => p.displayPage === selectedPage) ?? displayPages[0]);
	let currentPagePanels = $derived(currentDisplayPage?.panels ?? []);
	let layoutStyle = $derived<LayoutStyle>(mode === 'manga' ? 'jump-manga' : 'graphic-novel');
	let templates = $derived(getTemplatesForStyle(currentPagePanels.length, layoutStyle));
	
	// Get the stored layout info for the current page
	let currentPageLayoutInfo = $derived(pageLayouts[currentDisplayPage?.sourcePage ?? selectedPage]);
	
	// Check if current page already has layout applied
	let hasAppliedLayout = $derived(
		currentPagePanels.length > 0 && 
		currentPagePanels[0]?.data?.mangaLayout?.panels?.length > 0
	);

	// Auto-apply layout when page changes and no layout is applied
	$effect(() => {
		if (selectedPage < 1 || (displayPages.length > 0 && !displayPages.some((p) => p.displayPage === selectedPage))) {
			selectedPage = displayPages[0]?.displayPage ?? 1;
			return;
		}
		if (mode === 'manga') return;
		if (currentPagePanels.length > 0 && !hasAppliedLayout) {
			autoApplyLayout();
		}
	});

	// Re-apply best template when style changes to switch reading flow.
	let appliedStyleForPage = $state<Record<number, LayoutStyle>>({});
	$effect(() => {
		if (mode === 'manga') return;
		if (currentPagePanels.length === 0) return;
		if (appliedStyleForPage[selectedPage] === layoutStyle) return;
		autoApplyLayout();
		appliedStyleForPage = { ...appliedStyleForPage, [selectedPage]: layoutStyle };
	});

	function autoApplyLayout() {
		if (currentPagePanels.length === 0) return;
		
		const panelCount = currentPagePanels.length;
		let template: LayoutTemplate | undefined;
		
		// First try to use the stored template name from episode.jsonld
		if (currentPageLayoutInfo?.templateName) {
			template = getTemplateByName(panelCount, currentPageLayoutInfo.templateName);
		}
		
		// If no stored template or not found, auto-select based on context
		if (!template) {
			template = selectLayoutForPage(panelCount, {
				actKeyBeat: currentPageLayoutInfo?.category,
				hasDialogue: currentPagePanels.some((panel: Panel) => (panel.data?.dialogue?.length ?? 0) > 0)
			}, layoutStyle);
		}
		
		if (template) {
			handleApplyTemplate(template);
		}
	}

	async function handleApplyTemplate(template: LayoutTemplate) {
		if (currentPagePanels.length === 0) return;

		const newPanelLayouts = applyTemplate(currentPagePanels, template);
		
		// Update the first panel of the page with the new layout for the whole page
		const firstPanel = currentPagePanels[0];
		if (!firstPanel) return;

		const updatedData = create(PanelDataSchema, {
			...firstPanel.data,
			mangaLayout: create(MangaLayoutSchema, {
				panels: newPanelLayouts as any[],
				texts: firstPanel.data?.mangaLayout?.texts || []
			})
		} as any);

		dispatch('update', {
			pageNumber: firstPanel.pageNumber,
			panel: firstPanel.panel,
			data: updatedData
		});
	}

	function handlePanelSelect(panel: Panel) {
		dispatch('panelSelect', panel);
		dispatch('contextAdd', { type: 'panel', data: panel });
	}

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
	<div class="manga-toolbar">
		<div class="page-nav">
			<label for="manga-page-select">Page:</label>
			<select id="manga-page-select" bind:value={selectedPage} onchange={() => dispatch('contextAdd', { type: 'page', data: { pageNumber: selectedPage } })}>
				{#each displayPages as page}
					<option value={page.displayPage}>{page.label}</option>
				{/each}
			</select>
		</div>
		<div class="tools">
			<div class="layout-style-selector">
				<span>{mode === 'manga' ? 'Manga Style' : 'Graphic Novel Style'}</span>
			</div>
			{#if mode === 'graphic-novel' && templates.length > 0}
				<div class="template-selector">
					<span>Layout:</span>
					{#each templates as template}
						<button class="tool-btn" onclick={() => handleApplyTemplate(template)}>
							{template.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="manga-preview-container">
		{#if currentPagePanels.length > 0}
			<MangaPage
				panels={currentPagePanels}
				pageNumber={selectedPage}
				{episodeId}
				{storyboardPath}
				{layoutStyle}
				useStoredLayout={mode === 'graphic-novel'}
				on:update={(e) => handlePanelUpdate(e.detail.pageNumber, e.detail.panel, e.detail.data)}
				on:panelSelect={(e) => handlePanelSelect(e.detail)}
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

	.template-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-right: 1rem;
		padding-right: 1rem;
		border-right: 1px solid #444;
	}

	.layout-style-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-right: 1rem;
		padding-right: 1rem;
		border-right: 1px solid #444;
		color: #ddd;
	}

	.template-selector span {
		font-size: 0.8rem;
		color: #888;
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
