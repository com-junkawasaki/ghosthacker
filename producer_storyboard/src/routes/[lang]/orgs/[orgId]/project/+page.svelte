<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { CreateProjectStore, type ListProjectsStore, type ListProjects$result } from '$houdini';
	import DebugPanel from '$lib/components/debug/DebugPanel.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';

	// Route params from page store
	const lang = $derived($page.params.lang);
	const orgId = $derived($page.params.orgId);

	// SSR: Get the ListProjects store from page data (loaded in +page.ts)
	// Use $derived to maintain reactivity in Svelte 5
	interface PageData {
		ListProjects: ListProjectsStore;
	}
	const props = $props<{ data: PageData }>();
	const projects = $derived(props.data.ListProjects);
	
	const createProject = new CreateProjectStore();

	let debugVisible = $state(true);
	let isCreating = $state(false);
	let showCreateDialog = $state(false);
	let newProjectTitle = $state('');
	let newProjectDescription = $state('');

	// Computed properties - use $derived with store access
	const projectsStore = $derived(projects);
	const loading = $derived($projectsStore.fetching && !$projectsStore.data);
	const error = $derived($projectsStore.errors?.[0] ? new Error($projectsStore.errors[0].message) : null);
	
	// Projects are filtered by backend using X-Org-Id header
	const filteredProjects = $derived($projectsStore.data?.projects ?? []);

	function buildPath(viewName: string, projectId?: string): string {
		if (projectId) {
			return `/${lang}/orgs/${orgId}/project/${projectId}/${viewName}`;
		}
		return `/${lang}/orgs/${orgId}/project/${viewName}`;
	}

	$effect(() => {
		if (browser) {
			console.log('[Project] SSR Store state:', {
				loading,
				error,
				orgId,
				totalProjects: $projectsStore.data?.projects?.length ?? 0,
				filteredProjects: filteredProjects.length,
				data: $projectsStore.data,
				fetching: $projectsStore.fetching,
			});
		}
	});

	async function handleCreateProject() {
		if (!newProjectTitle.trim()) {
			alert('Please enter a project title');
			return;
		}

		isCreating = true;
		try {
			console.log('[Project] Creating project:', {
				orgId,
				title: newProjectTitle,
				description: newProjectDescription,
			});

			const result = await createProject.mutate({
				input: {
					title: newProjectTitle.trim(),
					description: newProjectDescription.trim() || null,
				},
			});

			console.log('[Project] Project created:', result);

			if (result?.data?.createProject) {
				// Refresh projects list (orgId is passed via X-Org-Id header)
				await projectsStore.fetch({ blocking: true });
				
				// Navigate to the new project's editor
				goto(buildPath('editor', result.data.createProject.id));
			} else {
				throw new Error('Failed to create project: No data returned');
			}
		} catch (error) {
			console.error('[Project] Failed to create project:', error);
			alert(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isCreating = false;
			showCreateDialog = false;
			newProjectTitle = '';
			newProjectDescription = '';
		}
	}
</script>

<div class="projects-page">
	<header class="page-header">
		<div class="header-left">
			<OrganizationSwitcher />
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
				<div class="debug-info" style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.7;">
					<p>Store State: loading={loading ? 'true' : 'false'}, fetching={$projectsStore.fetching ? 'true' : 'false'}</p>
				</div>
			</div>
		{:else if error}
			<div class="error-state">
				<div class="error-message">Error: {error.message}</div>
				<button
					onclick={async () => {
						try {
							await projectsStore.fetch();
						} catch (error) {
							console.error('Failed to retry:', error);
						}
					}}
					class="retry-button"
				>
					Retry
				</button>
			</div>
		{:else if $projectsStore.data && $projectsStore.data.projects !== undefined}
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
			{/if}
			{#if filteredProjects.length > 0}
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
		{:else if $projectsStore.fetching}
			<div class="loading-state">
				<p>Fetching projects...</p>
				<div class="debug-info">
					<p>Debug Info:</p>
					<ul>
						<li>Loading: {loading ? 'true' : 'false'}</li>
						<li>Fetching: {$projectsStore.fetching ? 'true' : 'false'}</li>
						<li>Has Error: {error ? 'true' : 'false'}</li>
						<li>Has Data: {$projectsStore.data ? 'true' : 'false'}</li>
						{#if error}
							<li>Error: {(error as Error).message}</li>
						{/if}
					</ul>
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<p>No data available. Please check your connection.</p>
				<div class="debug-info">
					<p>Debug Info:</p>
					<ul>
						<li>Loading: {loading ? 'true' : 'false'}</li>
						<li>Fetching: {$projectsStore.fetching ? 'true' : 'false'}</li>
						<li>Has Error: {error ? 'true' : 'false'}</li>
						<li>Has Data: {$projectsStore.data ? 'true' : 'false'}</li>
						{#if error}
							<li>Error: {(error as Error).message}</li>
						{/if}
					</ul>
				</div>
				<button
					onclick={async () => {
						try {
							console.log('[Project] Manual retry...');
							await projectsStore.fetch({ blocking: true });
						} catch (error) {
							console.error('[Project] Failed to retry:', error);
						}
					}}
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
		<DebugPanel store={{ ...$projectsStore, loading, error }} storeName="ListProjectsStore" visible={debugVisible} />
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

