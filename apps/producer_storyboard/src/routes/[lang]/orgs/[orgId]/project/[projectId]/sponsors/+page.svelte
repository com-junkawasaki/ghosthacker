<script lang="ts">
	import { page } from '$app/stores';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import SponsorList from '$lib/components/sponsors/SponsorList.svelte';
	import type { Sponsor } from '$lib/types/sponsor';

	const { projectId } = $page.params;
	
	if (!projectId) {
		throw new Error('Project ID is required');
	}

	let sponsors = $state<Sponsor[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateForm = $state(false);

	const orgId = $derived($page.params.orgId);

	async function loadSponsors() {
		try {
			loading = true;
			error = null;
			
			const response = await fetch(`/api/sponsors?orgId=${orgId}&projectId=${projectId}`, {
				headers: {
					'X-Org-Id': orgId || '',
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load sponsors: ${response.statusText}`);
			}
			
			const data = await response.json();
			sponsors = data.sponsors || [];
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load sponsors';
			loading = false;
		}
	}

	function handleCreate() {
		showCreateForm = true;
	}

	function handleCreated() {
		showCreateForm = false;
		loadSponsors();
	}

	function handleCancel() {
		showCreateForm = false;
	}

	$effect(() => {
		if (orgId && projectId) {
			loadSponsors();
		}
	});
</script>

<div class="resource-page">
	<ProjectSidebar {projectId} />
	
	<div class="main-content">
		<header class="page-header">
			<div class="header-content">
				<div>
					<h1 class="page-title">スポンサー管理 / Sponsors</h1>
					<p class="page-description">スポンサーの探索、登録、連絡、追跡、投稿を管理します</p>
				</div>
				{#if !showCreateForm}
					<button class="create-button" onclick={handleCreate}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path d="M8 3V13M3 8H13" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
						スポンサーを追加
					</button>
				{/if}
			</div>
		</header>

		<main class="page-content">
			{#if loading}
				<div class="loading-state">
					<span class="spinner"></span>
					<p>スポンサーを読み込み中...</p>
				</div>
			{:else if error}
				<div class="error-state">
					<p>{error}</p>
					<button onclick={loadSponsors}>再試行</button>
				</div>
			{:else if showCreateForm}
				<SponsorList
					{sponsors}
					{orgId}
					{projectId}
					mode="create"
					onCreated={handleCreated}
					onCancel={handleCancel}
				/>
			{:else}
				<SponsorList
					{sponsors}
					{orgId}
					{projectId}
					mode="list"
					onRefresh={loadSponsors}
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

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
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

	.create-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		border: none;
		border-radius: 6px;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.create-button:hover {
		background-color: #2563eb;
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
