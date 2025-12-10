<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { useClerkContext } from 'svelte-clerk';

	const clerk = useClerkContext();
	const auth = clerk?.auth;

	// Redirect to organization selection if already authenticated
	$effect(() => {
		if (!browser) return;
		if (auth?.userId != null) {
			const currentLang = 'ja';
			goto(`/${currentLang}/orgs/select/project`, { replaceState: true });
		}
	});

	onMount(() => {
		if (!browser) return;

		// If already authenticated, redirect to organization selection
		if (auth?.userId != null) {
			const currentLang = 'ja';
			goto(`/${currentLang}/orgs/select/project`, { replaceState: true });
			return;
		}

		// Redirect to Clerk sign-in
		// Clerk will handle the sign-in flow and redirect back
		const redirectUrl = window.location.origin + '/ja/orgs/select/project';
		
		// Use Clerk's hosted sign-in page
		// The sign-in page URL is configured in Clerk Dashboard
		// For now, we'll use the current page as a fallback and let Clerk handle the redirect
		// In production, Clerk will automatically redirect to the configured sign-in URL
		const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
		window.location.href = signInUrl;
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
