<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import StoryboardPanel from './StoryboardPanel.svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';

	let { 
		panels = [], 
		episodeId = '', 
		storyboardPath = '',
		selectedPanel = null
	} = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
		selectedPanel?: { pageNumber: number, panel: number } | null;
	}>();

	const dispatch = createEventDispatcher();

	let container = $state<HTMLElement | null>(null);

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

	function handlePanelUpdate(pageNumber: number, panel: number, data: PanelData) {
		dispatch('update', {
			pageNumber,
			panel,
			data,
		});
	}

	function handleScroll() {
		if (!container) return;

		const sections = container.querySelectorAll('.page-section');
		let currentVisiblePage = 1;
		const containerRect = container.getBoundingClientRect();
		const threshold = containerRect.top + containerRect.height / 3;

		for (const section of sections) {
			const rect = section.getBoundingClientRect();
			if (rect.top <= threshold) {
				const pageNumAttr = section.getAttribute('data-page');
				if (pageNumAttr) {
					currentVisiblePage = Number(pageNumAttr);
				}
			} else {
				break;
			}
		}

		if (currentVisiblePage !== lastDispatchedPage) {
			lastDispatchedPage = currentVisiblePage;
			dispatch('pageChange', currentVisiblePage);
		}
	}

	let lastDispatchedPage = $state(1);
</script>

<div class="storyboard-page" bind:this={container} onscroll={handleScroll}>
	<div class="storyboard-container">
		<!-- Ghibli-style 5-column layout: カット | 画 | 生成画 | 内容 | 秒 -->
		<div class="grid-header">
			<div class="col-cut">カット</div>
			<div class="col-picture">画</div>
			<div class="col-picture-generated">生成画</div>
			<div class="col-content">内容</div>
			<div class="col-seconds">秒</div>
		</div>

		{#each pageNumbers as pageNum}
			<div class="page-section" data-page={pageNum}>
				<div class="page-header" onclick={() => dispatch('pageChange', pageNum)}>
					<div class="page-number">Page {pageNum}</div>
				</div>
				
				<div class="panels-container">
					{#each pagesMap[pageNum] as panel (panel.panel)}
						<div 
							class="panel-row-wrapper" 
							class:selected={selectedPanel?.pageNumber === panel.pageNumber && selectedPanel?.panel === panel.panel}
							onclick={() => dispatch('selectPanel', { pageNumber: panel.pageNumber, panel: panel.panel })}
						>
							<StoryboardPanel
								{panel}
								episodeId={episodeId}
								storyboardPath={storyboardPath}
								on:update={(e) => handlePanelUpdate(panel.pageNumber, panel.panel, e.detail)}
							/>
						</div>
					{/each}
				</div>

				{#if pageNum < (pageNumbers[pageNumbers.length - 1] ?? 0)}
					<hr class="page-divider" />
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.storyboard-page {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		background: #faf9f5;
	}

	.storyboard-container {
		width: 100%;
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 4px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.page-section {
		position: relative;
	}

	.page-header {
		padding: 0.75rem 1rem;
		text-align: left;
		background: #f5f5f0;
		border-bottom: 1px solid #ddd;
		cursor: pointer;
		transition: background 0.2s;
	}

	.page-header:hover {
		background: #e8e8e0;
	}

	.page-number {
		font-size: 0.9rem;
		font-weight: 700;
		color: #666;
	}

	.page-divider {
		margin: 0;
		border: none;
		border-top: 2px solid #eee;
	}

	.grid-header {
		display: grid;
		grid-template-columns: 60px 120px 120px 1fr 50px;
		background: #e8e6e0;
		border-bottom: 1px solid #ccc;
		font-weight: 600;
		font-size: 0.75rem;
		color: #555;
	}

	.col-cut,
	.col-picture,
	.col-picture-generated,
	.col-content,
	.col-seconds {
		padding: 0.5rem;
		border-right: 1px solid #ccc;
		text-align: center;
	}

	.col-cut:last-child,
	.col-picture:last-child,
	.col-picture-generated:last-child,
	.col-content:last-child,
	.col-seconds:last-child {
		border-right: none;
	}

	.panels-container {
		display: flex;
		flex-direction: column;
	}

	.panel-row-wrapper {
		cursor: pointer;
		transition: background 0.2s;
	}

	.panel-row-wrapper:hover {
		background: #f9f9f9;
	}

	.panel-row-wrapper.selected {
		background: #f0f7ff;
		outline: 2px solid #007bff;
		outline-offset: -2px;
		z-index: 5;
	}

	/* Ensure grid header stays at top on scroll */
	.grid-header {
		position: sticky;
		top: 0;
		z-index: 10;
	}
</style>
