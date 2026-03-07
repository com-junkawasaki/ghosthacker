<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import StoryboardPanel from './StoryboardPanel.svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';

	let { panels = [], episodeId = '', storyboardPath = '' } = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
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

	function handleAgentTrigger(agent: string) {
		dispatch('agentTrigger', { agent });
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
				<button type="button" class="page-header" onclick={() => {
					dispatch('pageChange', pageNum);
					dispatch('contextAdd', { type: 'page', data: { pageNumber: pageNum } });
				}}>
					<div class="page-number">Page {pageNum}</div>
				</button>
				
				<div class="panels-container">
					{#each pagesMap[pageNum] as panel, i (panel.panel + '-' + i)}
						<div 
							class="panel-wrapper" 
							onclick={() => {
								dispatch('panelSelect', panel);
								dispatch('contextAdd', { type: 'panel', data: panel });
							}}
							onkeydown={(e) => e.key === 'Enter' && dispatch('panelSelect', panel)}
							role="button"
							tabindex="0"
						>
							<StoryboardPanel
								{panel}
								episodeId={episodeId}
								storyboardPath={storyboardPath}
								on:update={(e) => handlePanelUpdate(e.detail.pageNumber, e.detail.panel, e.detail.data)}
								on:agentTrigger={(e) => handleAgentTrigger(e.detail.agent)}
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
	@reference "tailwindcss";

	.storyboard-page { @apply flex-1 overflow-y-auto bg-zinc-50 p-2 md:p-6; }
	.storyboard-container { @apply mx-auto w-full max-w-[1400px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm; }
	.page-section { @apply relative; }
	.page-header { @apply cursor-pointer border-b border-zinc-200 bg-zinc-100/80 px-4 py-4 text-center transition hover:bg-zinc-100; }
	.page-number { @apply text-base font-semibold tracking-wide text-zinc-700 md:text-xl; }
	.page-divider { @apply my-5 h-0 border-0 border-t-2 border-zinc-300 md:my-8; }
	.grid-header {
		@apply sticky top-0 z-10 hidden border-b border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-600 md:grid;
		grid-template-columns: 80px 1fr 1fr 400px 60px;
	}
	.col-cut, .col-picture, .col-picture-generated, .col-content, .col-seconds { @apply border-r border-zinc-300 px-3 py-3 text-center; }
	.col-cut:last-child, .col-picture:last-child, .col-picture-generated:last-child, .col-content:last-child, .col-seconds:last-child { @apply border-r-0; }
	.panels-container { @apply flex flex-col; }
	.panel-wrapper { @apply cursor-pointer transition hover:bg-sky-50/60 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0; }
</style>
