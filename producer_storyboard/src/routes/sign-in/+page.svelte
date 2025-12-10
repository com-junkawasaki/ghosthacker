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

	// Compute project management page URL based on organization
	const projectManagementUrl = $derived(() => {
		if (orgId) {
			return `/${DEFAULT_LANG}/orgs/${orgId}/project`;
		}
		return `/${DEFAULT_LANG}/orgs/select/project`;
	});

	function goToProject(e?: Event) {
		e?.preventDefault();
		const url = projectManagementUrl();
		goto(url, { replaceState: true });
	}

	// Redirect target (fallback + force) - organization選択ページ
	const signInRedirectUrl = $derived(() => {
		return `/${DEFAULT_LANG}/orgs/select/project`;
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
					<button class="project-link" onclick={goToProject}>
						プロジェクト管理ページへ
					</button>
					<button onclick={handleSignOut} class="logout-button">
						ログアウト
					</button>
				</div>
			</div>
		{:else}
			<h1>ログイン</h1>
			<SignIn
				fallbackRedirectUrl={signInRedirectUrl()}
				forceRedirectUrl={signInRedirectUrl()}
			/>
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
		border: none;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: background-color 0.2s ease;
		cursor: pointer;
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
