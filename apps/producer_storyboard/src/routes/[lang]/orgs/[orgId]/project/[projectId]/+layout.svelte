<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';

	const { projectId } = $page.params;
	const lang = $derived($page.params.lang);
	const orgId = $derived($page.params.orgId);

	function buildPath(viewName: string): string {
		return `/${lang}/orgs/${orgId}/project/${projectId}/${viewName}`;
	}

	const menuItems = [
		{ id: 'editor', label: 'Storyboard', path: buildPath('editor') },
		{ id: 'composer', label: 'Composer', path: buildPath('composer') },
		{ id: 'novel', label: 'Novel', path: buildPath('novel') },
		{ id: 'manga', label: 'Manga', path: buildPath('manga') },
		{ id: 'organization', label: 'Organization', path: buildPath('organization') },
		{ id: 'sponsors', label: 'Sponsors', path: buildPath('sponsors') },
		{ id: 'workflow', label: 'Workflow', path: buildPath('workflow') },
	];

	const currentPath = $derived($page.url.pathname);

	function isActive(path: string): boolean {
		return currentPath === path || currentPath.startsWith(path + '/');
	}
</script>

<div class="project-layout">
	<header class="layout-header">
		<div class="header-left">
			<OrganizationSwitcher />
		</div>
		<nav class="header-nav">
			{#each menuItems as item}
				<a
					href={item.path}
					class="nav-link"
					class:active={isActive(item.path)}
				>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="header-right">
			<UserAccountMenu />
		</div>
	</header>

	<main class="layout-content">
		{@render children()}
	</main>
</div>

<style>
	.project-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		overflow: hidden;
	}

	.layout-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		background-color: rgba(255, 255, 255, 0.03);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		gap: 1rem;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-nav {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.nav-link {
		padding: 0.5rem 1rem;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.nav-link:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
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

	.layout-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>
