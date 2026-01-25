<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';

	type MangaProject = {
		id: string;
		projectId: string;
		title: string;
		description: string | null;
		createdAt: string;
		updatedAt: string;
	};

	const { lang, orgId, projectId: projectIdParam } = $page.params;
	const projectId: string = projectIdParam || '';

	let mangaProjects = $state<MangaProject[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadMangaProjects() {
		if (!browser || !projectId) return;

		try {
			loading = true;
			error = null;

			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:26',message:'loadMangaProjects entry',data:{projectId,orgId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion

			// TODO: Use mangaClient after proto generation
			const requestUrl = `/api/manga/manga.v1.MangaService/ListMangaProjects`;
			const requestBody = JSON.stringify({
				projectId: projectId,
			});
			
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:35',message:'Before fetch',data:{requestUrl,requestBody,fullUrl:window.location.origin + requestUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D,E'})}).catch(()=>{});
			// #endregion
			
			const response = await fetch(requestUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: requestBody,
			});

			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:48',message:'Response received',data:{status:response.status,statusText:response.statusText,ok:response.ok,url:response.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
			// #endregion

			if (!response.ok) {
				const errorText = await response.text();
				// #region agent log
				fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:52',message:'Response not OK',data:{status:response.status,statusText:response.statusText,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
				// #endregion
				let errorMessage = `Failed to load manga projects: ${response.status} ${response.statusText}`;
				try {
					const errorData = JSON.parse(errorText);
					if (errorData.error) {
						errorMessage = `Failed to load manga projects: ${errorData.error}`;
					}
				} catch {
					if (errorText) {
						errorMessage = `Failed to load manga projects: ${errorText}`;
					}
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:58',message:'Response parsed',data:{hasProjects:!!data.projects,projectsCount:data.projects?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion
			
			mangaProjects = data.projects || [];
		} catch (err) {
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:62',message:'Error caught',data:{error:String(err),errorName:(err as Error)?.name,errorMessage:(err as Error)?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion
			
			console.error('[Manga] Failed to load projects:', err);
			error = err instanceof Error ? err.message : 'Failed to load manga projects';
		} finally {
			loading = false;
		}
	}

	async function createMangaProject() {
		if (!browser || !projectId) return;

		try {
			const title = prompt('Enter manga project title:');
			if (!title) return;

			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:86',message:'createMangaProject entry',data:{projectId,orgId,title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CREATE'})}).catch(()=>{});
			// #endregion

			// TODO: Use mangaClient after proto generation
			const requestUrl = `/api/manga/manga.v1.MangaService/CreateMangaProject`;
			const requestBody = JSON.stringify({
				projectId: projectId,
				title: title,
			});

			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:95',message:'Before create fetch',data:{requestUrl,requestBody},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CREATE'})}).catch(()=>{});
			// #endregion

			const response = await fetch(requestUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: requestBody,
			});

			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:106',message:'Create response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CREATE'})}).catch(()=>{});
			// #endregion

			if (!response.ok) {
				const errorText = await response.text();
				// #region agent log
				fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:112',message:'Create response not OK',data:{status:response.status,statusText:response.statusText,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CREATE'})}).catch(()=>{});
				// #endregion
				throw new Error(`Failed to create manga project: ${response.statusText}`);
			}

			const data = await response.json();
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:118',message:'Create response parsed',data:{hasId:!!data.id,id:data.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CREATE'})}).catch(()=>{});
			// #endregion
			await loadMangaProjects();
			goto(`/${lang}/orgs/${orgId}/project/${projectId}/manga/${data.id}/editor`);
		} catch (err) {
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'[projectId]/manga/+page.svelte:123',message:'Create error caught',data:{error:String(err),errorName:(err as Error)?.name,errorMessage:(err as Error)?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CREATE'})}).catch(()=>{});
			// #endregion
			console.error('[Manga] Failed to create project:', err);
			alert(err instanceof Error ? err.message : 'Failed to create manga project');
		}
	}

	function handleMangaProjectClick(mangaProjectId: string) {
		goto(`/${lang}/orgs/${orgId}/project/${projectId}/manga/${mangaProjectId}/editor`);
	}

	onMount(() => {
		if (browser && projectId) {
			loadMangaProjects();
		}
	});
</script>

<div class="layout-container">
	<ProjectSidebar {projectId} />

	<main class="main-content">
		<header class="header">
			<h1>Manga Projects</h1>
			<div class="header-actions">
				<OrganizationSwitcher />
				<UserAccountMenu />
			</div>
		</header>

		<div class="content">
			<div class="toolbar">
				<button class="btn-primary" onclick={createMangaProject}>
					+ New Manga Project
				</button>
			</div>

			{#if loading}
				<div class="loading">Loading...</div>
			{:else if error}
				<div class="error">{error}</div>
			{:else if mangaProjects.length === 0}
				<div class="empty-state">
					<p>No manga projects yet. Create your first manga project to get started.</p>
				</div>
			{:else}
				<div class="project-grid">
					{#each mangaProjects as mangaProject}
						<div
							class="project-card"
							onclick={() => handleMangaProjectClick(mangaProject.id)}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleMangaProjectClick(mangaProject.id);
								}
							}}
						>
							<h3>{mangaProject.title}</h3>
							{#if mangaProject.description}
								<p class="description">{mangaProject.description}</p>
							{/if}
							<div class="meta">
								<span class="date">
									{new Date(mangaProject.updatedAt).toLocaleDateString()}
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
</style>

