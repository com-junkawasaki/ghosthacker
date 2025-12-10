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

	const DEFAULT_LANG = 'ja';

	// Get fallback redirect URL from query parameter or use default
	const fallbackRedirectUrl = $derived(() => {
		const urlParams = new URLSearchParams($page.url.search);
		const redirect = urlParams.get('redirect_url');
		// Default to organization selection, which will redirect to project list if user has one org
		return redirect || `/${DEFAULT_LANG}/orgs/select/project`;
	});

	// Track if we've already attempted a redirect to prevent loops
	let hasRedirected = $state(false);
	
	// Redirect if already authenticated (client-side check)
	$effect(() => {
		if (!browser || hasRedirected || !isLoaded) return;
		
		const currentUserId = userId;
		const currentOrgId = orgId;
		
		// If user is authenticated, redirect
		if (currentUserId) {
			hasRedirected = true; // Set flag before redirecting
			
			if (currentOrgId) {
				// User has an organization, redirect to project list
				console.log('[SignIn] User authenticated with org, redirecting to:', `/${DEFAULT_LANG}/orgs/${currentOrgId}/project`);
				goto(`/${DEFAULT_LANG}/orgs/${currentOrgId}/project`, { replaceState: true });
			} else {
				// User authenticated but no org, redirect to organization selection
				console.log('[SignIn] User authenticated without org, redirecting to organization selection');
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
			<p>リダイレクト中...</p>
		{:else}
			<h1>ログイン</h1>
			<SignIn fallbackRedirectUrl={fallbackRedirectUrl()} />
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
</style>
