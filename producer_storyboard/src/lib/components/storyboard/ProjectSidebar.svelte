<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { ListProjectsStore } from '../../../../.houdini/plugins/houdini-svelte/stores/ListProjects.js';

	type Props = {
		projectId: string;
		projectTitle?: string;
	};

	type Project = {
		id: string;
		orgId: string;
		title: string;
		description: string | null;
	};

	let { projectId, projectTitle = 'Project' }: Props = $props();

	const currentPath = $derived($page.url.pathname);
	const lang = $derived($page.params.lang);
	const orgId = $derived($page.params.orgId);

	// Project list for switching
	let projects = $state<Project[]>([]);
	let showProjectDropdown = $state(false);
	let listProjectsStore: ListProjectsStore | null = null;

	const currentProject = $derived(projects.find((p: Project) => p.id === projectId));
	const displayTitle = $derived(currentProject?.title ?? projectTitle);

	if (browser) {
		listProjectsStore = new ListProjectsStore();
	}

	onMount(async () => {
		if (!browser || !orgId || !listProjectsStore) return;
		
		try {
			const result = await listProjectsStore.fetch({ variables: { orgId } });
			if (result?.data?.projects) {
				projects = result.data.projects as Project[];
			}
		} catch (err) {
			console.error('[ProjectSidebar] Failed to load projects:', err);
		}
	});

	function handleProjectSelect(selectedProjectId: string) {
		showProjectDropdown = false;
		goto(`/${lang}/orgs/${orgId}/project/${selectedProjectId}/editor`);
	}

	function handleBackToProjects() {
		goto(`/${lang}/orgs/${orgId}/project`);
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.project-selector')) {
			showProjectDropdown = false;
		}
	}

	// Add click outside listener when dropdown is open
	$effect(() => {
		if (!browser) return;
		
		if (showProjectDropdown) {
			document.addEventListener('click', handleClickOutside);
		}
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function buildPath(viewName: string): string {
		return `/${lang}/orgs/${orgId}/project/${projectId}/${viewName}`;
	}

	type MenuItem = {
		id: string;
		label: string;
		icon: string;
		path: string;
		group?: string;
	};

	// Group menu items
	const groupedItems = $derived.by(() => {
		const menuItems: MenuItem[] = [
			{
				id: 'storyboard',
				label: 'Storyboard',
				icon: 'film',
				path: buildPath('editor'),
			},
			{
				id: 'composer',
				label: 'Composer',
				icon: 'music',
				path: buildPath('composer'),
			},
			{
				id: 'characters',
				label: 'Characters',
				icon: 'users',
				path: buildPath('characters'),
				group: 'Resources',
			},
			{
				id: 'world',
				label: 'World',
				icon: 'globe',
				path: buildPath('world'),
				group: 'Resources',
			},
			{
				id: 'scenario',
				label: 'Scenario',
				icon: 'book',
				path: buildPath('scenario'),
				group: 'Resources',
			},
		];

		const groups: Record<string, MenuItem[]> = {};
		const ungrouped: MenuItem[] = [];

		for (const item of menuItems) {
			if (item.group) {
				if (!groups[item.group]) {
					groups[item.group] = [];
				}
				groups[item.group]!.push(item);
			} else {
				ungrouped.push(item);
			}
		}

		return { groups, ungrouped };
	});

	function isActive(path: string): boolean {
		return currentPath === path || currentPath.startsWith(path + '/');
	}

	function handleNavigate(path: string) {
		goto(path);
	}
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<button class="back-button" onclick={handleBackToProjects} aria-label="Back to projects">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
				<path d="M15 10H5M5 10L10 5M5 10L10 15" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		<div class="project-selector">
			<button 
				class="project-selector-button"
				onclick={() => showProjectDropdown = !showProjectDropdown}
				aria-expanded={showProjectDropdown}
				aria-haspopup="listbox"
			>
				<span class="project-title">{displayTitle}</span>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
					<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
				</svg>
			</button>
			{#if showProjectDropdown}
				<div class="project-dropdown" role="listbox">
					<div class="project-dropdown-header">
						<span>Switch Project</span>
					</div>
					<ul class="project-list">
						{#each projects as project (project.id)}
							<li>
								<button
									class="project-option"
									class:active={project.id === projectId}
									onclick={() => handleProjectSelect(project.id)}
									role="option"
									aria-selected={project.id === projectId}
								>
									<span class="project-option-title">{project.title}</span>
									{#if project.id === projectId}
										<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
											<path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
										</svg>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
					<div class="project-dropdown-footer">
						<button class="view-all-button" onclick={handleBackToProjects}>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
								<path d="M2 4h12M2 8h12M2 12h12" stroke-width="1.5" stroke-linecap="round"/>
							</svg>
							View all projects
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<nav class="sidebar-nav">
		<!-- Ungrouped items (Storyboard) -->
		{#if groupedItems.ungrouped.length > 0}
			<ul class="menu-list">
				{#each groupedItems.ungrouped as item}
					<li>
						<button
							class="menu-item"
							class:active={isActive(item.path)}
							onclick={() => handleNavigate(item.path)}
							aria-label={item.label}
						>
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
								{#if item.icon === 'film'}
									<path d="M2 4C2 3.44772 2.44772 3 3 3H17C17.5523 3 18 3.44772 18 4V16C18 16.5523 17.5523 17 17 17H3C2.44772 17 2 16.5523 2 16V4Z" stroke-width="1.5"/>
									<path d="M7 3V17M13 3V17" stroke-width="1.5"/>
								{:else if item.icon === 'music'}
									<path d="M8 15C8 16.1046 7.10457 17 6 17C4.89543 17 4 16.1046 4 15C4 13.8954 4.89543 13 6 13C7.10457 13 8 13.8954 8 15Z" stroke-width="1.5"/>
									<path d="M16 13C16 14.1046 15.1046 15 14 15C12.8954 15 12 14.1046 12 13C12 11.8954 12.8954 11 14 11C15.1046 11 16 11.8954 16 13Z" stroke-width="1.5"/>
									<path d="M8 15V5L16 3V13" stroke-width="1.5"/>
								{:else if item.icon === 'users'}
									<path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke-width="1.5"/>
									<path d="M10 12C5.58172 12 2 15.5817 2 20H18C18 15.5817 14.4183 12 10 12Z" stroke-width="1.5"/>
								{:else if item.icon === 'globe'}
									<circle cx="10" cy="10" r="8" stroke-width="1.5"/>
									<path d="M2 10H18M10 2C12.5 5 13.5 8 10 10C6.5 8 7.5 5 10 2Z" stroke-width="1.5"/>
								{:else if item.icon === 'book'}
									<path d="M4 3C4 2.44772 4.44772 2 5 2H15C15.5523 2 16 2.44772 16 3V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V3Z" stroke-width="1.5"/>
									<path d="M4 6H16" stroke-width="1.5"/>
								{/if}
							</svg>
							<span class="menu-label">{item.label}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Grouped items (Resources) -->
		{#each Object.entries(groupedItems.groups) as [groupName, items]}
			<div class="menu-group">
				<h3 class="menu-group-title">{groupName}</h3>
				<ul class="menu-list">
					{#each items as item}
						<li>
							<button
								class="menu-item"
								class:active={isActive(item.path)}
								onclick={() => handleNavigate(item.path)}
								aria-label={item.label}
							>
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
									{#if item.icon === 'users'}
										<path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke-width="1.5"/>
										<path d="M10 12C5.58172 12 2 15.5817 2 20H18C18 15.5817 14.4183 12 10 12Z" stroke-width="1.5"/>
									{:else if item.icon === 'globe'}
										<circle cx="10" cy="10" r="8" stroke-width="1.5"/>
										<path d="M2 10H18M10 2C12.5 5 13.5 8 10 10C6.5 8 7.5 5 10 2Z" stroke-width="1.5"/>
									{:else if item.icon === 'book'}
										<path d="M4 3C4 2.44772 4.44772 2 5 2H15C15.5523 2 16 2.44772 16 3V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V3Z" stroke-width="1.5"/>
										<path d="M4 6H16" stroke-width="1.5"/>
									{/if}
								</svg>
								<span class="menu-label">{item.label}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>
</aside>

<style>
	.sidebar {
		width: 240px;
		height: 100vh;
		background-color: #1a1a1a;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		overflow-y: auto;
	}

	.sidebar-header {
		padding: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back-button {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.back-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.project-selector {
		flex: 1;
		position: relative;
		min-width: 0;
	}

	.project-selector-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #ffffff;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.project-selector-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.project-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background-color: #252525;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		z-index: 100;
		overflow: hidden;
	}

	.project-dropdown-header {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.project-list {
		list-style: none;
		padding: 0.25rem 0;
		margin: 0;
		max-height: 200px;
		overflow-y: auto;
	}

	.project-option {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.15s;
		text-align: left;
	}

	.project-option:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.project-option.active {
		color: #3b82f6;
		background-color: rgba(59, 130, 246, 0.1);
	}

	.project-option-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-dropdown-footer {
		padding: 0.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.view-all-button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.813rem;
		cursor: pointer;
		transition: all 0.15s;
		border-radius: 4px;
	}

	.view-all-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}

	.sidebar-nav {
		flex: 1;
		padding: 1rem 0;
		overflow-y: auto;
	}

	.menu-group {
		margin-bottom: 2rem;
	}

	.menu-group-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
		padding: 0 1rem;
		margin-bottom: 0.5rem;
	}

	.menu-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.menu-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.menu-item:hover {
		background-color: rgba(255, 255, 255, 0.05);
		color: #ffffff;
	}

	.menu-item.active {
		background-color: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
		border-right: 2px solid #3b82f6;
	}

	.menu-item.active svg {
		color: #3b82f6;
	}

	.menu-item svg {
		flex-shrink: 0;
		color: inherit;
		opacity: 0.8;
	}

	.menu-label {
		flex: 1;
	}

	/* Scrollbar styling */
	.sidebar::-webkit-scrollbar,
	.sidebar-nav::-webkit-scrollbar {
		width: 6px;
	}

	.sidebar::-webkit-scrollbar-track,
	.sidebar-nav::-webkit-scrollbar-track {
		background: transparent;
	}

	.sidebar::-webkit-scrollbar-thumb,
	.sidebar-nav::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	.sidebar::-webkit-scrollbar-thumb:hover,
	.sidebar-nav::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
