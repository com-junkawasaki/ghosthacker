<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';
	import TopBar from '$lib/components/manga/header/TopBar.svelte';
	import PageSidebar from '$lib/components/manga/sidebar/PageSidebar.svelte';
	import CanvasArea from '$lib/components/manga/CanvasArea.svelte';
	import RightSidebar from '$lib/components/manga/sidebar/RightSidebar.svelte';
	import BottomToolbar from '$lib/components/manga/toolbar/BottomToolbar.svelte';
	import SaveLoadControls from '$lib/components/manga/bottom-right/SaveLoadControls.svelte';
	import ZoomControls from '$lib/components/manga/bottom-right/ZoomControls.svelte';
	import HelpButton from '$lib/components/manga/bottom-right/HelpButton.svelte';
	import { mangaStore } from '$lib/stores/mangaStore.svelte';
	import { mangaClient } from '$lib/grpc/mangaClient';
	import { create } from '@bufbuild/protobuf';
import { GetMangaProjectRequestSchema } from '$lib/grpc/generated/manga/v1/manga_pb';
import { ListPagesRequestSchema } from '$lib/grpc/generated/manga/v1/page_pb';

	const { lang, orgId, projectId: projectIdParam, mangaId: mangaIdParam } = $page.params;
	const projectId: string = projectIdParam || '';
	const mangaId: string = mangaIdParam || '';

	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		if (!browser) return;

		if (!projectId || !mangaId) {
			error = 'Project ID or Manga ID is missing';
			loading = false;
			return;
		}

		try {
			// Initialize manga store
			mangaStore.initialize(projectId);

			// Load manga project
			const projectRequest = create(GetMangaProjectRequestSchema, {
				id: mangaId,
			});
			const project = await mangaClient.getMangaProject(projectRequest);
			if (project) {
				mangaStore.setMangaProject(project);
			}

			// Load pages
			const pagesRequest = create(ListPagesRequestSchema, {
				mangaProjectId: mangaId,
			});
			const pagesResponse = await mangaClient.listPages(pagesRequest);
			if (pagesResponse.pages) {
				mangaStore.setPages(pagesResponse.pages);
				// Select first page if available
				if (pagesResponse.pages.length > 0) {
					mangaStore.selectPage(pagesResponse.pages[0].id);
				}
			}

			loading = false;
		} catch (err) {
			console.error('Failed to initialize manga editor:', err);
			error = err instanceof Error ? err.message : 'Failed to initialize manga editor';
			loading = false;
		}
	});
</script>

<div class="layout-container">
	<ProjectSidebar {projectId} />

	<main class="main-content">
		<header class="header">
			<h1>Manga Editor</h1>
			<div class="header-actions">
				<OrganizationSwitcher />
				<UserAccountMenu />
			</div>
		</header>

		<div class="content">
			{#if loading}
				<div class="loading">Loading editor...</div>
			{:else if error}
				<div class="error">{error}</div>
			{:else if projectId && mangaId}
				<div class="manga-editor-layout">
					<!-- Top Bar -->
					<TopBar projectId={projectId} />

					<!-- Main Editor Area -->
					<div class="editor-area">
						<!-- Left Sidebar: Pages -->
						<PageSidebar mangaId={mangaId} />

						<!-- Center: Canvas -->
						<div class="canvas-container">
							<CanvasArea
								width={800}
								height={1200}
								konvaStageJson={mangaStore.state.konvaStageJson || undefined}
								panels={mangaStore.state.panels}
								speechBubbles={mangaStore.state.speechBubbles}
								selectedTool={mangaStore.state.selectedTool}
								selectedNodeId={mangaStore.state.selectedPanelId || mangaStore.state.selectedBubbleId || undefined}
							/>
						</div>

						<!-- Right Sidebar: Properties -->
						<RightSidebar
							mangaId={mangaId}
							selectedPanelId={mangaStore.state.selectedPanelId}
							selectedBubbleId={mangaStore.state.selectedBubbleId}
						/>
					</div>

					<!-- Bottom Toolbar -->
					<BottomToolbar />

					<!-- Bottom Right Controls -->
					<div class="bottom-right-controls">
						<SaveLoadControls mangaId={mangaId} />
						<ZoomControls />
						<HelpButton />
					</div>
				</div>
			{:else}
				<div class="error">Project ID or Manga ID is missing</div>
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
		overflow: hidden;
	}

	.manga-editor-layout {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.editor-area {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.canvas-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: auto;
		background-color: var(--bg-secondary, #f9fafb);
	}

	.bottom-right-controls {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 100;
	}

	.loading,
	.error {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		color: var(--text-secondary, #6b7280);
	}

	.error {
		color: var(--error-color, #ef4444);
	}
</style>

