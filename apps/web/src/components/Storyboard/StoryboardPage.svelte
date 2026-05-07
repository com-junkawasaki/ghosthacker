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

	let pagesMap = $derived(panels.reduce((acc: Record<number, Panel[]>, panel: Panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) acc[pageNum] = [];
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>));

	let pageNumbers = $derived(Object.keys(pagesMap).map(Number).sort((a, b) => a - b));

	function handlePanelUpdate(pageNumber: number, panel: number, data: PanelData) {
		dispatch('update', { pageNumber, panel, data });
	}

	function handleAgentTrigger(agent: string) {
		dispatch('agentTrigger', { agent });
	}

	let lastDispatchedPage = $state(1);

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
				if (pageNumAttr) currentVisiblePage = Number(pageNumAttr);
			} else break;
		}
		if (currentVisiblePage !== lastDispatchedPage) {
			lastDispatchedPage = currentVisiblePage;
			dispatch('pageChange', currentVisiblePage);
		}
	}
</script>

<div class="storyboard-scroll" bind:this={container} onscroll={handleScroll}>
	{#each pageNumbers as pageNum}
		<div class="page-section" data-page={pageNum}>
			<button type="button" class="page-header" onclick={() => {
				dispatch('pageChange', pageNum);
				dispatch('contextAdd', { type: 'page', data: { pageNumber: pageNum } });
			}}>
				Page {pageNum}
			</button>

			<div class="panels-list">
				{#each pagesMap[pageNum] as panel, i (panel.panel + '-' + i)}
					<div
						class="panel-tap-area"
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
							{episodeId}
							{storyboardPath}
							on:update={(e) => handlePanelUpdate(e.detail.pageNumber, e.detail.panel, e.detail.data)}
							on:agentTrigger={(e) => handleAgentTrigger(e.detail.agent)}
						/>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	@reference "tailwindcss";

	.storyboard-scroll {
		@apply flex-1 overflow-y-auto px-4 py-3;
		-webkit-overflow-scrolling: touch;
	}

	.page-section {
		@apply mb-6;
	}

	.page-header {
		@apply mb-3 w-full text-left text-[13px] font-semibold uppercase tracking-wider text-zinc-400;
	}

	.panels-list {
		@apply flex flex-col gap-3;
	}

	.panel-tap-area {
		@apply cursor-pointer rounded-2xl transition;
	}
	.panel-tap-area:focus-visible {
		outline: 2px solid #007aff;
		outline-offset: 2px;
	}
</style>
