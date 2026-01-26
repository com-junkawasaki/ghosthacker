<script lang="ts">
	import { page } from '$app/stores';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import { OrganizationChart } from '$lib/components/organization';
	import type { ProjectOrganization, TeamMember, Role } from '$lib/types/organization';

	const { projectId } = $page.params;
	
	if (!projectId) {
		throw new Error('Project ID is required');
	}

	// TODO: Fetch organization data from API
	let organization = $state<ProjectOrganization | null>(null);
	let teamMembers = $state<TeamMember[]>([]);
	let roles = $state<Role[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadOrganization() {
		try {
			loading = true;
			error = null;
			
			// TODO: Replace with actual API calls
			// const orgResponse = await fetch(`/api/grpc/organization/${projectId}`);
			// organization = await orgResponse.json();
			
			// For now, use mock data
			organization = {
				projectId,
				departments: [],
				episodeTeams: []
			};
			
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load organization';
			loading = false;
		}
	}

	function handleAssign(memberId: string, roleId: string, episodeId?: string) {
		console.log('Assign:', { memberId, roleId, episodeId });
		// TODO: Call API to assign member
	}

	function handleUnassign(assignmentId: string) {
		console.log('Unassign:', { assignmentId });
		// TODO: Call API to unassign member
	}

	$effect(() => {
		loadOrganization();
	});
</script>

<div class="resource-page">
	<ProjectSidebar {projectId} />
	
	<div class="main-content">
		<header class="page-header">
			<h1 class="page-title">組織図 / Organization</h1>
			<p class="page-description">プロジェクトのチーム編成と役職アサインを管理します</p>
		</header>

		<main class="page-content">
			{#if loading}
				<div class="loading-state">
					<span class="spinner"></span>
					<p>組織図を読み込み中...</p>
				</div>
			{:else if error}
				<div class="error-state">
					<p>{error}</p>
					<button onclick={loadOrganization}>再試行</button>
				</div>
			{:else}
				<OrganizationChart
					{organization}
					{teamMembers}
					{roles}
					{projectId}
					onAssign={handleAssign}
					onUnassign={handleUnassign}
				/>
			{/if}
		</main>
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

	.page-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background-color: #1a1a1a;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.page-description {
		font-size: 0.875rem;
		color: #a0a0a0;
		margin: 0;
	}

	.page-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem 2rem;
	}

	.loading-state,
	.error-state {
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

	.error-state {
		color: #ef4444;
	}

	.error-state button {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		border: 1px solid #6366f1;
		background: transparent;
		color: #6366f1;
		cursor: pointer;
	}

	.error-state button:hover {
		background: rgba(99, 102, 241, 0.1);
	}
</style>
