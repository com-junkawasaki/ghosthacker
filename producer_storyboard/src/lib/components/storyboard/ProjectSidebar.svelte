<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	type Props = {
		projectId: string;
	};

	let { projectId }: Props = $props();

	const currentPath = $derived($page.url.pathname);
	const { lang, orgId } = $page.params;

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
		<div class="logo">S</div>
		<h2 class="sidebar-title">Project</h2>
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
		padding: 1.5rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 600;
		color: #ffffff;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}

	.sidebar-title {
		font-size: 1rem;
		font-weight: 500;
		color: #ffffff;
		margin: 0;
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
