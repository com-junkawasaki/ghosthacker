<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const clerk = useClerkContext();
	const auth = clerk?.auth;
	const organization = clerk?.organization;
	const isLoaded = $derived(clerk?.isLoaded);
	const userId = $derived(auth?.userId);

	const { lang } = $page.params;
	const DEFAULT_LANG = 'ja';
	const currentLang = lang || DEFAULT_LANG;

	let selectedOrgId = $state<string | null>(null);
	let isRedirecting = $state(false);
	let hasRedirected = $state(false);

	// Wait for authentication to be established after sign-in
	// This handles the case where the user is redirected here immediately after signing in
	$effect(() => {
		if (!browser || !isLoaded || hasRedirected) return;

		// Check server-side authentication first
		// If server says user is authenticated, trust it even if client-side userId is not yet available
		const serverAuthenticated = data.authResult?.isAuthenticated === true;
		
		// If user is authenticated (client-side or server-side), handle redirect logic
		if (userId || serverAuthenticated) {
			// If server-side already provided organizations, use them
			if (data.organizations.length > 0) {
				// If user has only one organization, redirect to it
				if (data.organizations.length === 1 && data.organizations[0]) {
					hasRedirected = true;
					goto(`/${currentLang}/orgs/${data.organizations[0].id}/project`, { replaceState: true });
					return;
				}

				// If user has an organization selected in Clerk context, redirect to it
				const currentOrgId = organization?.id || auth?.orgId;
				if (
					currentOrgId &&
					currentOrgId !== 'select' &&
					data.organizations.some((org) => org.id === currentOrgId)
				) {
					hasRedirected = true;
					goto(`/${currentLang}/orgs/${currentOrgId}/project`, { replaceState: true });
				}
			} else if (serverAuthenticated) {
				// Server-side says user is authenticated but no organizations yet
				// Wait a bit for client-side auth to sync, then reload to get organizations
				setTimeout(() => {
					if (!hasRedirected) {
						// Reload to get fresh data from server
						window.location.reload();
					}
				}, 1000);
			}
		} else if (isLoaded && !userId && !serverAuthenticated) {
			// User is not authenticated on both client and server, redirect to sign-in
			// But wait a bit to ensure auth state is fully loaded
			setTimeout(() => {
				if (!hasRedirected && !userId && !data.authResult?.isAuthenticated) {
					hasRedirected = true;
					goto('/sign-in', { replaceState: true });
				}
			}, 500);
		}
	});

	function selectOrganization(orgId: string) {
		if (isRedirecting) return;
		isRedirecting = true;
		selectedOrgId = orgId;

		// Navigate to selected organization
		goto(`/${currentLang}/orgs/${orgId}/project`);
	}

	function buildPath(orgId: string): string {
		return `/${currentLang}/orgs/${orgId}/project`;
	}
</script>

<div class="org-select-container">
	<div class="org-select-content">
		<h1>組織を選択</h1>
		{#if auth?.userId == null}
			<p class="auth-message">組織を選択するには、まずログインしてください。</p>
		{:else if data.organizations.length === 0}
			<p class="no-orgs-message">
				参加している組織がありません。新しい組織を作成するか、既存の組織に招待される必要があります。
			</p>
		{:else}
			<p class="select-message">アクセスする組織を選択してください。</p>
			<div class="org-list">
				{#each data.organizations as org (org.id)}
					<button
						class="org-card"
						class:selected={selectedOrgId === org.id}
						onclick={() => selectOrganization(org.id)}
						disabled={isRedirecting}
					>
						<div class="org-info">
							<h3>{org.name || org.slug || org.id}</h3>
							{#if org.slug && org.slug !== org.id}
								<p class="org-slug">{org.slug}</p>
							{/if}
							<p class="org-role">役割: {org.role}</p>
						</div>
						<div class="org-arrow">→</div>
					</button>
				{/each}
			</div>
		{/if}

		{#if isRedirecting}
			<div class="loading">リダイレクト中...</div>
		{/if}
	</div>
</div>

<style>
	.org-select-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background-color: var(--sb-bg-primary, #1a1a1a);
		color: var(--sb-text-primary, #ffffff);
		padding: 2rem;
	}

	.org-select-content {
		max-width: 800px;
		width: 100%;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.auth-message,
	.no-orgs-message,
	.select-message {
		text-align: center;
		margin-bottom: 2rem;
		color: var(--sb-text-secondary, #cccccc);
	}

	.org-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.org-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		background-color: var(--sb-bg-secondary, #2a2a2a);
		border: 2px solid var(--sb-border-color, #404040);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.org-card:hover:not(:disabled) {
		background-color: var(--sb-bg-tertiary, #3a3a3a);
		border-color: var(--sb-accent-primary, #3b82f6);
	}

	.org-card.selected {
		border-color: var(--sb-accent-primary, #3b82f6);
		background-color: var(--sb-bg-tertiary, #3a3a3a);
	}

	.org-card:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.org-info {
		flex: 1;
	}

	.org-info h3 {
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
		color: var(--sb-text-primary, #ffffff);
	}

	.org-slug {
		font-size: 0.875rem;
		color: var(--sb-text-tertiary, #999999);
		margin-bottom: 0.25rem;
	}

	.org-role {
		font-size: 0.875rem;
		color: var(--sb-text-secondary, #cccccc);
		margin: 0;
	}

	.org-arrow {
		font-size: 1.5rem;
		color: var(--sb-text-tertiary, #999999);
		margin-left: 1rem;
	}

	.loading {
		text-align: center;
		margin-top: 2rem;
		color: var(--sb-text-secondary, #cccccc);
	}
</style>
