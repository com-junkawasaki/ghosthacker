<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';

	type NovelProject = {
		id: string;
		projectId: string;
		title: string;
		description: string | null;
		language: string;
		createdAt: string;
		updatedAt: string;
	};

	const { lang, orgId, projectId: projectIdParam } = $page.params;
	const projectId: string = projectIdParam || '';

	let novelProjects = $state<NovelProject[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadNovelProjects() {
		if (!browser || !projectId) return;

		try {
			loading = true;
			error = null;

			// TODO: Use novelClient after proto generation
			const response = await fetch(`/api/novel/novel.v1.NovelService/ListNovelProjects`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					projectId: projectId,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				let errorMessage = `Failed to load novel projects: ${response.status} ${response.statusText}`;
				try {
					const errorData = JSON.parse(errorText);
					if (errorData.error) {
						errorMessage = `Failed to load novel projects: ${errorData.error}`;
					}
				} catch {
					if (errorText) {
						errorMessage = `Failed to load novel projects: ${errorText}`;
					}
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();
			novelProjects = data.projects || [];
		} catch (err) {
			console.error('[Novel] Failed to load projects:', err);
			error = err instanceof Error ? err.message : 'Failed to load novel projects';
		} finally {
			loading = false;
		}
	}

	async function createNovelProject() {
		if (!browser || !projectId) return;

		try {
			const title = prompt('Enter novel project title:');
			if (!title) return;

			// TODO: Use novelClient after proto generation
			const response = await fetch(`/api/novel/novel.v1.NovelService/CreateNovelProject`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					projectId: projectId,
					title: title,
					language: 'ja',
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to create novel project: ${response.statusText}`);
			}

			const data = await response.json();
			await loadNovelProjects();
			goto(`/${lang}/orgs/${orgId}/project/${projectId}/novel/${data.id}/editor`);
		} catch (err) {
			console.error('[Novel] Failed to create project:', err);
			alert(err instanceof Error ? err.message : 'Failed to create novel project');
		}
	}

	function handleNovelProjectClick(novelProjectId: string) {
		goto(`/${lang}/orgs/${orgId}/project/${projectId}/novel/${novelProjectId}/editor`);
	}

	onMount(() => {
		if (browser && projectId) {
			loadNovelProjects();
		}
	});
</script>

<div class="layout-container">
	<ProjectSidebar {projectId} />

	<main class="main-content">
		<header class="header">
			<h1>Novel Projects</h1>
			<div class="header-actions">
				<OrganizationSwitcher />
				<UserAccountMenu />
			</div>
		</header>

		<div class="content">
			<div class="toolbar">
				<button class="btn-primary" onclick={createNovelProject}>
					+ New Novel Project
				</button>
			</div>

			{#if loading}
				<div class="loading">Loading...</div>
			{:else if error}
				<div class="error">{error}</div>
			{:else if novelProjects.length === 0}
				<div class="empty-state">
					<p>No novel projects yet. Create your first novel project to get started.</p>
				</div>
			{:else}
				<div class="project-grid">
					{#each novelProjects as novelProject}
						<div
							class="project-card"
							onclick={() => handleNovelProjectClick(novelProject.id)}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleNovelProjectClick(novelProject.id);
								}
							}}
						>
							<h3>{novelProject.title}</h3>
							{#if novelProject.description}
								<p class="description">{novelProject.description}</p>
							{/if}
							<div class="meta">
								<span class="language">{novelProject.language}</span>
								<span class="date">
									{new Date(novelProject.updatedAt).toLocaleDateString()}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	.layout-container {
		display: flex;
		height: 100vh;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.content {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
	}

	.toolbar {
		margin-bottom: 2rem;
	}

	.btn-primary {
		padding: 0.5rem 1rem;
		background: var(--primary-color, #3b82f6);
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: 500;
	}

	.btn-primary:hover {
		background: var(--primary-hover, #2563eb);
	}

	.loading,
	.error,
	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--text-secondary, #6b7280);
	}

	.error {
		color: var(--error-color, #ef4444);
	}

	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.project-card {
		padding: 1.5rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		background: white;
	}

	.project-card:hover {
		border-color: var(--primary-color, #3b82f6);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.project-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.description {
		margin: 0.5rem 0;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.meta {
		display: flex;
		justify-content: space-between;
		margin-top: 1rem;
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.language {
		text-transform: uppercase;
	}
</style>

