<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import DebugPanel from '$lib/components/debug/DebugPanel.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';

	// Route params from page store
	const lang = $derived($page.params.lang);
	const orgId = $derived($page.params.orgId);

	// SSR: Get projects from page data (loaded in +page.ts)
	interface PageData {
		projects: Array<{
			id: string;
			title: string;
			description?: string | null;
			createdAt: string;
			updatedAt: string;
		}>;
	}
	const props = $props<{ data: PageData }>();
	
	let projects = $state(props.data.projects || []);
	let loading = $state(false);
	let error = $state<Error | null>(null);
	let debugVisible = $state(true);
	let isCreating = $state(false);
	let showCreateDialog = $state(false);
	let newProjectTitle = $state('');
	let newProjectDescription = $state('');

	const filteredProjects = $derived(projects);
	const hasData = $derived(projects.length > 0 || !loading);

	function buildPath(viewName: string, projectId?: string): string {
		if (projectId) {
			return `/${lang}/orgs/${orgId}/project/${projectId}/${viewName}`;
		}
		return `/${lang}/orgs/${orgId}/project/${viewName}`;
	}

	async function loadProjects() {
		if (!browser) return;
		
		try {
			loading = true;
			error = null;
			const response = await fetch('/api/projects', {
				headers: {
					'X-Org-Id': orgId,
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load projects: ${response.statusText}`);
			}
			
			const data = await response.json();
			projects = data.projects || [];
		} catch (err) {
			console.error('[Project] Error loading projects:', err);
			error = err instanceof Error ? err : new Error('Failed to load projects');
		} finally {
			loading = false;
		}
	}

	async function handleCreateProject() {
		if (!newProjectTitle.trim()) {
			alert('Please enter a project title');
			return;
		}

		isCreating = true;
		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					title: newProjectTitle.trim(),
					description: newProjectDescription.trim() || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create project');
			}

			const result = await response.json();
			
			if (result?.id) {
				// Refresh projects list
				await loadProjects();
				
				// Navigate to the new project's editor
				goto(buildPath('editor', result.id));
			} else {
				throw new Error('Failed to create project: No data returned');
			}
		} catch (err) {
			console.error('[Project] Failed to create project:', err);
			error = err instanceof Error ? err : new Error('Failed to create project');
			alert(`Failed to create project: ${error.message}`);
		} finally {
			isCreating = false;
			showCreateDialog = false;
			newProjectTitle = '';
			newProjectDescription = '';
		}
	}

	onMount(() => {
		if (browser && projects.length === 0) {
			loadProjects();
		}
	});
</script>

<div class="projects-page">
	<header class="page-header">
		<div class="header-left">
			<OrganizationSwitcher />
		</div>
		<div class="header-center">
			<nav class="main-nav">
				<a href={`/${lang}/orgs/${orgId}/project`} class="nav-link" class:active={$page.url.pathname === `/${lang}/orgs/${orgId}/project`}>
					Projects
				</a>
			</nav>
		</div>
		<div class="header-right">
			<UserAccountMenu />
		</div>
	</header>
	<div class="container">
		<h1 class="page-title">Storyboard Projects</h1>

		{#if loading}
			<div class="loading-state">
				<p>Loading projects...</p>
			</div>
		{:else if error}
			<div class="error-state">
				<div class="error-message">Error: {error.message}</div>
				<button
					onclick={loadProjects}
					class="retry-button"
				>
					Retry
				</button>
			</div>
		{:else if hasData}
			{#if filteredProjects.length === 0}
				<div class="empty-state">
					<p>No projects found in this organization. Create a new project to get started.</p>
					<button 
						class="create-button" 
						onclick={() => showCreateDialog = true}
						disabled={isCreating}
					>
						{isCreating ? 'Creating...' : 'Create Project'}
					</button>
				</div>
			{:else}
				<div class="projects-header">
					<button 
						class="create-button" 
						onclick={() => showCreateDialog = true}
						disabled={isCreating}
					>
						{isCreating ? 'Creating...' : '+ Create Project'}
					</button>
				</div>
				<div class="projects-grid">
					{#each filteredProjects as project (project.id)}
						<a href={buildPath('editor', project.id)} class="project-card">
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
				<button
					onclick={loadProjects}
					class="retry-button"
				>
					Retry
				</button>
			</div>
		{/if}
	</div>

	<!-- Create Project Dialog -->
	{#if showCreateDialog}
		<div class="dialog-overlay" onclick={() => showCreateDialog = false}>
			<div class="dialog" onclick={(e) => e.stopPropagation()}>
				<h2>Create New Project</h2>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleCreateProject();
					}}
				>
					<div class="form-group">
						<label for="project-title">Title *</label>
						<input
							id="project-title"
							type="text"
							bind:value={newProjectTitle}
							placeholder="Enter project title"
							required
							disabled={isCreating}
						/>
					</div>
					<div class="form-group">
						<label for="project-description">Description</label>
						<textarea
							id="project-description"
							bind:value={newProjectDescription}
							placeholder="Enter project description (optional)"
							disabled={isCreating}
							rows="3"
						></textarea>
					</div>
					<div class="dialog-actions">
						<button
							type="button"
							class="cancel-button"
							onclick={() => {
								showCreateDialog = false;
								newProjectTitle = '';
								newProjectDescription = '';
							}}
							disabled={isCreating}
						>
							Cancel
						</button>
						<button
							type="submit"
							class="create-button"
							disabled={isCreating || !newProjectTitle.trim()}
						>
							{isCreating ? 'Creating...' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Debug Panel -->
	<DebugPanel store={{ projects: filteredProjects, loading, error }} storeName="Projects" visible={debugVisible} />
</div>

<style>
	.projects-page {
		min-height: 100vh;
		padding: 0;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		background-color: var(--sb-bg-secondary, #1a1a1a);
		border-bottom: 1px solid var(--sb-border-color, #404040);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-center {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.main-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-link {
		padding: 0.5rem 1rem;
		color: var(--sb-text-secondary, rgba(255, 255, 255, 0.7));
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.nav-link:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--sb-text-primary, #ffffff);
	}

	.nav-link.active {
		background-color: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
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

	.projects-header {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 2rem;
	}

	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.dialog {
		background-color: var(--sb-bg-secondary, #2a2a2a);
		border: 1px solid var(--sb-border, rgba(255, 255, 255, 0.1));
		border-radius: 8px;
		padding: 2rem;
		min-width: 400px;
		max-width: 600px;
		color: var(--sb-text-primary, #ffffff);
	}

	.dialog h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		font-size: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: var(--sb-text-primary, #ffffff);
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid var(--sb-border, rgba(255, 255, 255, 0.2));
		border-radius: 4px;
		color: var(--sb-text-primary, #ffffff);
		font-size: 1rem;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.5);
	}

	.form-group input:disabled,
	.form-group textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
	}

	.cancel-button {
		padding: 0.75rem 1.5rem;
		background-color: transparent;
		color: var(--sb-text-primary, #ffffff);
		border: 1px solid var(--sb-border, rgba(255, 255, 255, 0.2));
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.cancel-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.cancel-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.create-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
