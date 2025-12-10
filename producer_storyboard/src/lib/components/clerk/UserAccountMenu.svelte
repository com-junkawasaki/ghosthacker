<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';

	const clerk = useClerkContext();
	const auth = clerk?.auth;
	const user = clerk?.user;
	const organization = clerk?.organization;

	let isOpen = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);

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

	function toggleMenu() {
		isOpen = !isOpen;
	}

	async function handleSignOut() {
		if (!clerk?.clerk) return;
		try {
			await clerk.clerk.signOut();
			const { lang } = $page.params;
			const DEFAULT_LANG = 'ja';
			const currentLang = lang || DEFAULT_LANG;
			goto(`/${currentLang}/orgs/select`);
		} catch (error) {
			console.error('[UserAccountMenu] Sign out error:', error);
		}
	}

	function handleManageAccount() {
		if (!clerk?.clerk) return;
		clerk.clerk.openUserProfile();
	}

	function handleUpdateProfile() {
		const { lang, orgId } = $page.params;
		const DEFAULT_LANG = 'ja';
		const currentLang = lang || DEFAULT_LANG;
		const currentOrgId = orgId || organization?.id;
		if (currentOrgId) {
			goto(`/${currentLang}/orgs/${currentOrgId}/profile`);
		}
	}

	const userInitials = $derived.by(() => {
		if (!user) return 'U';
		const firstName = user.firstName || '';
		const lastName = user.lastName || '';
		if (firstName && lastName) {
			return `${firstName[0]}${lastName[0]}`.toUpperCase();
		}
		if (firstName) {
			return firstName[0].toUpperCase();
		}
		if (user.emailAddresses?.[0]) {
			return user.emailAddresses[0].emailAddress[0].toUpperCase();
		}
		return 'U';
	});

	const userName = $derived.by(() => {
		if (!user) return 'User';
		if (user.firstName && user.lastName) {
			return `${user.firstName} ${user.lastName}`;
		}
		if (user.firstName) {
			return user.firstName;
		}
		if (user.emailAddresses?.[0]) {
			return user.emailAddresses[0].emailAddress;
		}
		return 'User';
	});

	const userEmail = $derived.by(() => {
		return user?.emailAddresses?.[0]?.emailAddress || '';
	});
</script>

{#if auth?.userId}
	<div class="user-account-menu" bind:this={menuRef}>
		<button
			class="user-button"
			onclick={toggleMenu}
			aria-label="User account menu"
			aria-expanded={isOpen}
		>
			<div class="user-avatar">
				{#if user?.imageUrl}
					<img src={user.imageUrl} alt={userName} />
				{:else}
					<span class="user-initials">{userInitials}</span>
				{/if}
			</div>
		</button>

		{#if isOpen}
			<div class="menu-dropdown">
				<div class="menu-header">
					<div class="menu-user-info">
						<div class="menu-user-name">{userName}</div>
						{#if userEmail}
							<div class="menu-user-email">{userEmail}</div>
						{/if}
					</div>
				</div>

				<div class="menu-divider"></div>

				<div class="menu-items">
					<button class="menu-item" onclick={handleUpdateProfile}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path
								d="M11.5 2.5C11.7761 2.22386 12.1479 2.07003 12.5 2.07003C12.8521 2.07003 13.2239 2.22386 13.5 2.5C13.7761 2.77614 13.93 3.14786 13.93 3.5C13.93 3.85214 13.7761 4.22386 13.5 4.5L5 13L2 14L3 11L11.5 2.5Z"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<span>プロフィール編集</span>
					</button>

					<button class="menu-item" onclick={handleManageAccount}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<circle cx="8" cy="6" r="2.5" stroke-width="1.5" />
							<path
								d="M3 13C3 10.7909 4.79086 9 7 9H9C11.2091 9 13 10.7909 13 13"
								stroke-width="1.5"
								stroke-linecap="round"
							/>
						</svg>
						<span>アカウント管理</span>
					</button>

					<button class="menu-item" onclick={handleSignOut}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path
								d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M10 11L13 8L10 5"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path d="M13 8H6" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						<span>サインアウト</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.user-account-menu {
		position: relative;
	}

	.user-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 2px solid var(--sb-border-color, #404040);
		background-color: var(--sb-bg-secondary, #2a2a2a);
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}

	.user-button:hover {
		border-color: var(--sb-accent-primary, #3b82f6);
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}

	.user-avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--sb-accent-primary, #3b82f6);
	}

	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-initials {
		color: white;
		font-size: 14px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.menu-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		min-width: 240px;
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

	.menu-user-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.menu-user-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--sb-text-primary, #ffffff);
	}

	.menu-user-email {
		font-size: 12px;
		color: var(--sb-text-secondary, #cccccc);
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
	}

	.menu-item {
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

	.menu-item:hover {
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}

	.menu-item svg {
		flex-shrink: 0;
		color: var(--sb-text-secondary, #cccccc);
	}

	.menu-item:hover svg {
		color: var(--sb-text-primary, #ffffff);
	}
</style>
