<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import StoryboardPanel from './StoryboardPanel.svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';

	export let panels: Panel[] = [];
	export let currentPage: number = 1;

	const dispatch = createEventDispatcher();

	// Filter panels for current page
	$: pagePanels = panels.filter((p) => p.pageNumber === currentPage);

	function handlePanelUpdate(panel: number, data: PanelData) {
		dispatch('update', {
			pageNumber: currentPage,
			panel,
			data,
		});
	}
</script>

<div class="storyboard-page">
	<div class="page-header">
		<div class="page-number">Page {currentPage}</div>
	</div>

	<div class="storyboard-grid">
		<!-- Ghibli-style 5-column layout: カット | 画 | 生成画 | 内容 | 秒 -->
		<div class="grid-header">
			<div class="col-cut">カット</div>
			<div class="col-picture">画</div>
			<div class="col-picture-generated">生成画</div>
			<div class="col-content">内容</div>
			<div class="col-seconds">秒</div>
		</div>

		<div class="panels-container">
			{#each pagePanels as panel (panel.panel)}
				<StoryboardPanel
					{panel}
					on:update={(e) => handlePanelUpdate(panel.panel, e.detail)}
				/>
			{/each}
		</div>
	</div>
</div>

<style>
	.storyboard-page {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
		background: #faf9f5;
	}

	.page-header {
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.page-number {
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
	}

	.storyboard-grid {
		max-width: 1400px;
		margin: 0 auto;
		background: #fff;
		border: 2px solid #ddd;
		border-radius: 8px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.grid-header {
		display: grid;
		grid-template-columns: 80px 1fr 1fr 400px 60px;
		background: #e8e6e0;
		border-bottom: 2px solid #ccc;
		font-weight: 600;
		font-size: 0.9rem;
		color: #555;
	}

	.col-cut,
	.col-picture,
	.col-picture-generated,
	.col-content,
	.col-seconds {
		padding: 0.75rem 1rem;
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
</style>
