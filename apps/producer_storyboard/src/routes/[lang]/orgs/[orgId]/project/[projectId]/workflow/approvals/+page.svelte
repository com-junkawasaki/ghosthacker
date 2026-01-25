<script lang="ts">
	import { page } from '$app/stores';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import { ApprovalPanel } from '$lib/components/workflow';
	import type { ApprovalRequest } from '$lib/types/workflow';

	const { projectId } = $page.params;
	
	if (!projectId) {
		throw new Error('Project ID is required');
	}

	let requests = $state<ApprovalRequest[]>([]);
	let loading = $state(true);

	async function loadApprovals() {
		try {
			loading = true;
			// TODO: Fetch from API
			requests = [];
			loading = false;
		} catch (err) {
			loading = false;
		}
	}

	function handleApprove(requestId: string, comment?: string) {
		console.log('Approve:', { requestId, comment });
		// TODO: Call API
	}

	function handleReject(requestId: string, comment: string) {
		console.log('Reject:', { requestId, comment });
		// TODO: Call API
	}

	function handleRequestChanges(requestId: string, comment: string) {
		console.log('Request changes:', { requestId, comment });
		// TODO: Call API
	}

	$effect(() => {
		loadApprovals();
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
			<ApprovalPanel
				{requests}
				{projectId}
				onApprove={handleApprove}
				onReject={handleReject}
				onRequestChanges={handleRequestChanges}
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
