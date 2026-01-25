<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';
	import NovelEditorLayout from '$lib/components/novel/NovelEditorLayout.svelte';

	const { lang, orgId, projectId: projectIdParam, novelId: novelIdParam } = $page.params;
	const projectId: string = projectIdParam || '';
	const novelId: string = novelIdParam || '';

	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(() => {
		if (browser) {
			if (!projectId || !novelId) {
				error = 'Project ID or Novel ID is missing';
			}
			loading = false;
		}
	});
</script>

<div class="layout-container">
	<ProjectSidebar {projectId} />

	<main class="main-content">
		<header class="header">
			<h1>Novel Editor</h1>
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
			{:else if projectId && novelId}
				<NovelEditorLayout {projectId} {novelId} />
			{:else}
				<div class="error">Project ID or Novel ID is missing</div>
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

	.loading,
	.error,
	.editor-placeholder {
		text-align: center;
		padding: 3rem;
		color: var(--text-secondary, #6b7280);
	}

	.error {
		color: var(--error-color, #ef4444);
	}
</style>
