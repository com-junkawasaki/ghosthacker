<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ListProjectsStore } from '$houdini';
	import DebugPanel from '$lib/components/debug/DebugPanel.svelte';

	const data = new ListProjectsStore();
	let debugVisible = $state(true);

	onMount(async () => {
		if (browser) {
			try {
				console.log('[Storyboard] Fetching projects...');
				const result = await data.fetch();
				console.log('[Storyboard] Fetch result:', result);
				console.log('[Storyboard] Store state:', {
					loading: $data.loading,
					error: $data.error,
					data: $data.data,
					fetching: $data.fetching,
				});
			} catch (error) {
				console.error('[Storyboard] Failed to fetch projects:', error);
			}
		}
	});

	$effect(() => {
		if (browser) {
			console.log('[Storyboard] Store reactive update:', {
				loading: $data.loading,
				error: $data.error,
				data: $data.data,
				fetching: $data.fetching,
			});
		}
	});
</script>

<div class="projects-page">
	<div class="container">
		<h1 class="page-title">Storyboard Projects</h1>

		{#if $data.loading}
			<div class="loading-state">
				<p>Loading projects...</p>
			</div>
		{:else if $data.error}
			<div class="error-state">
				<div class="error-message">Error: {$data.error.message}</div>
				<button
					onclick={async () => {
						try {
							await data.fetch();
						} catch (error) {
							console.error('Failed to retry:', error);
						}
					}}
					class="retry-button"
				>
					Retry
				</button>
			</div>
		{:else if $data.data && $data.data.projects !== undefined}
			{#if $data.data.projects.length === 0}
				<div class="empty-state">
					<p>No projects found. Create a new project to get started.</p>
					<button class="create-button">Create Project</button>
				</div>
			{:else}
				<div class="projects-grid">
					{#each $data.data.projects as project (project.id)}
						<a href="/storyboard/{project.id}/editor" class="project-card">
							<h2 class="project-title">{project.title}</h2>
							{#if project.description}
								<p class="project-description">{project.description}</p>
							{/if}
						</a>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<p>No data available. Please check your connection.</p>
				<div class="debug-info">
					<p>Debug Info:</p>
					<ul>
						<li>Loading: {$data.loading ? 'true' : 'false'}</li>
						<li>Fetching: {$data.fetching ? 'true' : 'false'}</li>
						<li>Has Error: {$data.error ? 'true' : 'false'}</li>
						<li>Has Data: {$data.data ? 'true' : 'false'}</li>
						{#if $data.error}
							<li>Error: {$data.error.message}</li>
						{/if}
					</ul>
				</div>
			</div>
		{/if}
	</div>

	<!-- Debug Panel -->
	<DebugPanel store={$data} storeName="ListProjectsStore" visible={debugVisible} />
</div>

<style>
	.projects-page {
		min-height: 100vh;
		padding: 2rem;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 600;
		margin-bottom: 2rem;
		color: var(--sb-text-primary, #ffffff);
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.error-message {
		color: #ff6b6b;
		margin-bottom: 1rem;
	}

	.retry-button,
	.create-button {
		padding: 0.75rem 1.5rem;
		background-color: #ffffff;
		color: #000000;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-button:hover,
	.create-button:hover {
		background-color: rgba(255, 255, 255, 0.9);
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.project-card {
		display: block;
		padding: 1.5rem;
		background-color: var(--sb-bg-secondary, #2a2a2a);
		border: 1px solid var(--sb-border, rgba(255, 255, 255, 0.1));
		border-radius: 8px;
		text-decoration: none;
		color: var(--sb-text-primary, #ffffff);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.project-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.project-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: var(--sb-text-primary, #ffffff);
	}

	.project-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
	}
</style>
