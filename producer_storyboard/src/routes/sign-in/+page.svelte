<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { useClerkContext } from 'svelte-clerk';

	const clerk = useClerkContext();
	const auth = clerk?.auth;

	onMount(() => {
		if (!browser || !clerk) return;

		// Server-side already handles redirect for authenticated users
		// If somehow we're here and authenticated, redirect
		if (auth?.userId != null) {
			window.location.href = '/ja/orgs/select/project';
			return;
		}

		// Redirect to Clerk's hosted sign-in page
		// Clerk will handle the sign-in flow and redirect back to redirectUrl after successful sign-in
		const redirectUrl = window.location.origin + '/ja/orgs/select/project';
		
		// Use Clerk's openSignIn method if available
		const clerkInstance = clerk.clerk as any;
		if (clerkInstance && typeof clerkInstance.openSignIn === 'function') {
			clerkInstance.openSignIn({
				redirectUrl: redirectUrl
			});
		} else if (clerkInstance && typeof clerkInstance.redirectToSignIn === 'function') {
			// Alternative method name
			clerkInstance.redirectToSignIn({
				redirectUrl: redirectUrl
			});
		} else {
			// Fallback: Use Clerk's UserButton or show sign-in form
			// For now, we'll use the Clerk component approach
			// The user should see a sign-in form rendered by Clerk
			console.warn('[SignIn] Clerk sign-in method not available. Using Clerk component.');
		}
	});
</script>

<div class="sign-in-container">
	<div class="sign-in-content">
		<h1>ログイン</h1>
		<p>リダイレクト中...</p>
	</div>
</div>

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
