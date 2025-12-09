<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';

	const clerk = useClerkContext();
	const auth = clerk?.auth;
	const organization = clerk?.organization;

	let isOpen = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);
	let organizations = $state<Array<{ id: string; name: string | null; slug: string | null }>>([]);
	let isLoading = $state(false);

	const { lang, orgId } = $page.params;
	const DEFAULT_LANG = 'ja';
	const currentLang = lang || DEFAULT_LANG;

	// Load organizations when menu opens
	async function loadOrganizations() {
		if (!auth?.userId || organizations.length > 0) return;
		isLoading = true;
		try {
			const response = await fetch('/api/organizations');
			if (response.ok) {
				const data = await response.json();
				if (data.organizations) {
					organizations = data.organizations;
				}
			}
		} catch (error) {
			console.error('[OrganizationSwitcher] Failed to load organizations:', error);
		} finally {
			isLoading = false;
		}
	}

	// Close menu when clicking outside
	$effect(() => {
		if (!browser || !isOpen) return;

		function handleClickOutside(event: MouseEvent) {
			if (menuRef && !menuRef.contains(event.target as Node)) {
				isOpen = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	// Load organizations when menu opens
	$effect(() => {
		if (isOpen && organizations.length === 0) {
			loadOrganizations();
		}
	});

	function toggleMenu() {
		isOpen = !isOpen;
	}

	async function switchOrganization(newOrgId: string) {
		if (newOrgId === orgId) {
			isOpen = false;
			return;
		}

		try {
			// Set organization in Clerk if available
			if (clerk?.clerk) {
				try {
					// Try to use Clerk's setActive method if available
					if (typeof (clerk.clerk as any).setActive === 'function') {
						await (clerk.clerk as any).setActive({ organization: newOrgId });
					}
				} catch (clerkError) {
					console.warn('[OrganizationSwitcher] Could not set active organization in Clerk:', clerkError);
					// Continue with navigation even if Clerk setActive fails
				}
			}

			// Navigate to new organization
			const currentPath = $page.url.pathname;
			const newPath = currentPath.replace(`/orgs/${orgId}`, `/orgs/${newOrgId}`);
			goto(newPath, { replaceState: true });
			isOpen = false;
		} catch (error) {
			console.error('[OrganizationSwitcher] Failed to switch organization:', error);
		}
	}

	function handleCreateOrganization() {
		if (!clerk?.clerk) return;
		try {
			if (typeof (clerk.clerk as any).openCreateOrganization === 'function') {
				(clerk.clerk as any).openCreateOrganization();
			} else {
				// Fallback: navigate to organization creation page
				goto(`/${currentLang}/orgs/select`);
			}
		} catch (error) {
			console.error('[OrganizationSwitcher] Failed to open create organization:', error);
		}
		isOpen = false;
	}

	function handleManageOrganization() {
		if (!clerk?.clerk) return;
		try {
			if (typeof (clerk.clerk as any).openOrganizationProfile === 'function') {
				(clerk.clerk as any).openOrganizationProfile();
			} else {
				// Fallback: navigate to organization management
				console.log('[OrganizationSwitcher] Organization profile not available');
			}
		} catch (error) {
			console.error('[OrganizationSwitcher] Failed to open organization profile:', error);
		}
		isOpen = false;
	}

	const currentOrgName = $derived.by(() => {
		if (organization?.name) return organization.name;
		if (organization?.slug) return organization.slug;
		return organization?.id || 'Organization';
	});

	const currentOrgInitials = $derived.by(() => {
		const name = currentOrgName;
		if (name.length >= 2) {
			return name.substring(0, 2).toUpperCase();
		}
		return name[0]?.toUpperCase() || 'O';
	});
</script>

{#if auth?.userId && organization}
	<div class="organization-switcher" bind:this={menuRef}>
		<button
			class="org-button"
			onclick={toggleMenu}
			aria-label="Switch organization"
			aria-expanded={isOpen}
		>
			<div class="org-avatar">
				{#if organization.imageUrl}
					<img src={organization.imageUrl} alt={currentOrgName} />
				{:else}
					<span class="org-initials">{currentOrgInitials}</span>
				{/if}
			</div>
			<span class="org-name">{currentOrgName}</span>
			<svg
				class="org-chevron"
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
			>
				<path d="M4 6L8 10L12 6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>

		{#if isOpen}
			<div class="menu-dropdown">
				<div class="menu-header">
					<div class="menu-title">組織を切り替え</div>
				</div>

				<div class="menu-divider"></div>

				<div class="menu-items">
					{#if isLoading}
						<div class="menu-loading">読み込み中...</div>
					{:else if organizations.length > 0}
						{#each organizations as org}
							<button
								class="menu-item"
								class:active={org.id === orgId}
								onclick={() => switchOrganization(org.id)}
							>
								<div class="menu-item-org">
									<div class="menu-item-org-avatar">
										<span>{org.name?.[0]?.toUpperCase() || org.slug?.[0]?.toUpperCase() || 'O'}</span>
									</div>
									<div class="menu-item-org-info">
										<div class="menu-item-org-name">{org.name || org.slug || org.id}</div>
										{#if org.slug && org.slug !== org.id}
											<div class="menu-item-org-slug">{org.slug}</div>
										{/if}
									</div>
								</div>
								{#if org.id === orgId}
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
										<path
											d="M13 4L6 11L3 8"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								{/if}
							</button>
						{/each}
					{:else}
						<div class="menu-empty">組織が見つかりません</div>
					{/if}
				</div>

				<div class="menu-divider"></div>

				<div class="menu-actions">
					<button class="menu-action" onclick={handleManageOrganization}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<circle cx="8" cy="8" r="6" stroke-width="1.5" />
							<path
								d="M8 5V8M8 11H8.01"
								stroke-width="1.5"
								stroke-linecap="round"
							/>
						</svg>
						<span>組織を管理</span>
					</button>
					<button class="menu-action" onclick={handleCreateOrganization}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path d="M8 3V13M3 8H13" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						<span>新しい組織を作成</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.organization-switcher {
		position: relative;
	}

	.org-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid var(--sb-border-color, #404040);
		background-color: var(--sb-bg-secondary, #2a2a2a);
		color: var(--sb-text-primary, #ffffff);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 14px;
	}

	.org-button:hover {
		border-color: var(--sb-accent-primary, #3b82f6);
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}

	.org-avatar {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--sb-accent-primary, #3b82f6);
		flex-shrink: 0;
	}

	.org-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.org-initials {
		color: white;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.org-name {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 120px;
	}

	.org-chevron {
		flex-shrink: 0;
		color: var(--sb-text-secondary, #cccccc);
		transition: transform 0.2s;
	}

	.organization-switcher:has(.menu-dropdown) .org-chevron {
		transform: rotate(180deg);
	}

	.menu-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		min-width: 280px;
		background-color: var(--sb-bg-secondary, #2a2a2a);
		border: 1px solid var(--sb-border-color, #404040);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 1000;
		overflow: hidden;
	}

	.menu-header {
		padding: 12px 16px;
	}

	.menu-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--sb-text-primary, #ffffff);
	}

	.menu-divider {
		height: 1px;
		background-color: var(--sb-border-color, #404040);
		margin: 8px 0;
	}

	.menu-items {
		display: flex;
		flex-direction: column;
		padding: 4px 0;
		max-height: 300px;
		overflow-y: auto;
	}

	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 16px;
		background: none;
		border: none;
		color: var(--sb-text-primary, #ffffff);
		cursor: pointer;
		transition: background-color 0.2s;
		text-align: left;
		font-size: 14px;
		width: 100%;
	}

	.menu-item:hover {
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}

	.menu-item.active {
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}

	.menu-item-org {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
	}

	.menu-item-org-avatar {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--sb-accent-primary, #3b82f6);
		color: white;
		font-size: 12px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.menu-item-org-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.menu-item-org-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--sb-text-primary, #ffffff);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.menu-item-org-slug {
		font-size: 12px;
		color: var(--sb-text-secondary, #cccccc);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.menu-loading,
	.menu-empty {
		padding: 16px;
		text-align: center;
		color: var(--sb-text-secondary, #cccccc);
		font-size: 14px;
	}

	.menu-actions {
		display: flex;
		flex-direction: column;
		padding: 4px 0;
	}

	.menu-action {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		background: none;
		border: none;
		color: var(--sb-text-primary, #ffffff);
		cursor: pointer;
		transition: background-color 0.2s;
		text-align: left;
		font-size: 14px;
	}

	.menu-action:hover {
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}

	.menu-action svg {
		flex-shrink: 0;
		color: var(--sb-text-secondary, #cccccc);
	}

	.menu-action:hover svg {
		color: var(--sb-text-primary, #ffffff);
	}
</style>
