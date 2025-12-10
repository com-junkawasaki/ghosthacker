<script lang="ts">
	import { SignIn, useClerkContext } from 'svelte-clerk';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const clerk = useClerkContext();
	const auth = clerk?.auth;
	const organization = clerk?.organization;
	const userId = $derived(auth?.userId);
	const orgId = $derived(auth?.orgId || organization?.id);
	const isLoaded = $derived(clerk?.isLoaded);

	async function handleSignOut() {
		if (!clerk?.clerk) {
			console.error('[SignIn] Clerk instance not available');
			return;
		}
		try {
			console.log('[SignIn] Attempting to sign out...');
			await clerk.clerk.signOut();
			console.log('[SignIn] Sign out successful, redirecting to /sign-in');
			goto('/sign-in', { replaceState: true });
		} catch (error) {
			console.error('[SignIn] Sign out error:', error);
		}
	}

	const DEFAULT_LANG = 'ja';

	// Track if we've already attempted a redirect to prevent loops
	let hasRedirected = $state(false);
	let isHandlingSignIn = $state(false);
	
	// Compute project management page URL based on organization
	const projectManagementUrl = $derived(() => {
		if (orgId) {
			return `/${DEFAULT_LANG}/orgs/${orgId}/project`;
		}
		return `/${DEFAULT_LANG}/orgs/select/project`;
	});

	// Get redirect URL from query parameter or use default
	const redirectUrl = $derived(() => {
		const urlParams = new URLSearchParams($page.url.search);
		const redirect = urlParams.get('redirect_url');
		// Default to organization selection, which will redirect to project list if user has one org
		return redirect || `/${DEFAULT_LANG}/orgs/select/project`;
	});

	// Handle successful sign-in by monitoring auth state
	// This ensures the session is established before redirecting
	$effect(() => {
		if (!browser || !isLoaded || isHandlingSignIn) return;
		
		const currentUserId = userId;
		const currentOrgId = orgId;
		
		// If user just signed in (was not authenticated before, now is)
		if (currentUserId && !hasRedirected) {
			isHandlingSignIn = true;
			hasRedirected = true;
			
			// Wait a bit for the session to be fully established
			setTimeout(() => {
				if (currentOrgId) {
					// User has an organization, redirect to project list
					console.log('[SignIn] Post-login redirect: User authenticated with org, redirecting to:', `/${DEFAULT_LANG}/orgs/${currentOrgId}/project`);
					goto(`/${DEFAULT_LANG}/orgs/${currentOrgId}/project`, { replaceState: true });
				} else {
					// User authenticated but no org, redirect to organization selection
					console.log('[SignIn] Post-login redirect: User authenticated without org, redirecting to organization selection');
					goto(`/${DEFAULT_LANG}/orgs/select/project`, { replaceState: true });
				}
				isHandlingSignIn = false;
			}, 100); // Small delay to ensure session cookie is set
		}
	});
	
	// Redirect if already authenticated when page loads (client-side check as fallback)
	// Note: Server-side redirect should handle this first, but this is a fallback
	$effect(() => {
		if (!browser || hasRedirected || !isLoaded || isHandlingSignIn) return;
		
		const currentUserId = userId;
		const currentOrgId = orgId;
		
		// If user is already authenticated, redirect to project management page
		if (currentUserId) {
			hasRedirected = true;
			
			if (currentOrgId) {
				// User has an organization, redirect to project list
				console.log('[SignIn] Client: User authenticated with org, redirecting to:', `/${DEFAULT_LANG}/orgs/${currentOrgId}/project`);
				goto(`/${DEFAULT_LANG}/orgs/${currentOrgId}/project`, { replaceState: true });
			} else {
				// User authenticated but no org, redirect to organization selection
				console.log('[SignIn] Client: User authenticated without org, redirecting to organization selection');
				goto(`/${DEFAULT_LANG}/orgs/select/project`, { replaceState: true });
			}
		}
	});
</script>

<div class="sign-in-container">
	<div class="sign-in-content">
		{#if !isLoaded}
			<p>読み込み中...</p>
		{:else if userId}
			<div class="authenticated-section">
				<p>既にログインしています</p>
				<div class="action-buttons">
					<a href={projectManagementUrl()} class="project-link">
						プロジェクト管理ページへ
					</a>
					<button onclick={handleSignOut} class="logout-button">
						ログアウト
					</button>
				</div>
			</div>
		{:else}
			<h1>ログイン</h1>
			<SignIn redirectUrl={redirectUrl()} />
		{/if}
	</div>
</div>

<!-- Debug panel at bottom for better visibility -->
<!-- <ClerkAuthDebugPanel /> -->

<style>
	.sign-in-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background-color: var(--sb-bg-primary, #1a1a1a);
		color: var(--sb-text-primary, #ffffff);
		padding: 2rem;
	}

	.sign-in-content {
		text-align: center;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	p {
		color: var(--sb-text-secondary, #cccccc);
	}

	.authenticated-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.project-link {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background-color: var(--sb-accent, #007bff);
		color: #ffffff;
		text-decoration: none;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: background-color 0.2s ease;
	}

	.project-link:hover {
		background-color: var(--sb-accent-hover, #0056b3);
	}

	.logout-button {
		padding: 0.75rem 1.5rem;
		background-color: transparent;
		color: var(--sb-text-secondary, #cccccc);
		border: 1px solid var(--sb-border-color, #404040);
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 1rem;
	}

	.logout-button:hover {
		background-color: var(--sb-bg-secondary, #2a2a2a);
		border-color: var(--sb-accent, #007bff);
		color: var(--sb-text-primary, #ffffff);
	}
</style>
