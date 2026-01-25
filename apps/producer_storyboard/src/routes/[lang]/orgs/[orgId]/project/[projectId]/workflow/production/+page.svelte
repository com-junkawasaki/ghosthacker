<script lang="ts">
	import { page } from '$app/stores';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import { ProductionBoard } from '$lib/components/workflow';
	import type { EpisodeProduction, ProductionStatus } from '$lib/types/workflow';

	const { projectId } = $page.params;
	
	if (!projectId) {
		throw new Error('Project ID is required');
	}

	let productions = $state<EpisodeProduction[]>([]);
	let loading = $state(true);

	async function loadProductions() {
		try {
			loading = true;
			// TODO: Fetch from API
			productions = [];
			loading = false;
		} catch (err) {
			loading = false;
		}
	}

	function handleUpdateStatus(episodeId: string, status: ProductionStatus) {
		console.log('Update status:', { episodeId, status });
		// TODO: Call API
	}

	$effect(() => {
		loadProductions();
	});
</script>

<div class="resource-page">
	<ProjectSidebar {projectId} />
	
	<div class="main-content">
		{#if loading}
			<div class="loading-state">
				<span class="spinner"></span>
				<p>読み込み中...</p>
			</div>
		{:else}
			<ProductionBoard
				{productions}
				{projectId}
				onUpdateStatus={handleUpdateStatus}
			/>
		{/if}
	</div>
</div>

<style>
	.resource-page {
		display: flex;
		flex-direction: row;
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 1rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid #333;
		border-top-color: #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
