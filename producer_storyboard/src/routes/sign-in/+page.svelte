<script lang="ts">
	import { SignIn, useClerkContext, ClerkLoading, ClerkLoaded } from 'svelte-clerk';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	// Do not destructure context to avoid losing reactivity
	const ctx = useClerkContext();
	const userId = $derived(ctx?.auth?.userId);

	// Redirect to organization selection if already authenticated
	$effect(() => {
		if (!browser) return;
		if (userId) {
			goto('/ja/orgs/select/project', { replaceState: true });
		}
	});
</script>

<ClerkLoading>
	<div class="sign-in-container">
		<div class="sign-in-content">
			<p>読み込み中...</p>
		</div>
	</div>
</ClerkLoading>

<ClerkLoaded>
	<div class="sign-in-container">
		<div class="sign-in-content">
			{#if userId === undefined}
				<p>読み込み中...</p>
			{:else if userId === null}
				<h1>ログイン</h1>
				<SignIn redirectUrl="/ja/orgs/select/project" />
			{:else}
				<p>リダイレクト中...</p>
			{/if}
		</div>
	</div>
</ClerkLoaded>

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
