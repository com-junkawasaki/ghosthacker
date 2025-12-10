<script lang="ts">
	import { browser } from '$app/environment';
	import { ClerkProvider } from 'svelte-clerk';
	import './globals.css';
	import type { LayoutData } from './$types';

	// Houdini client is automatically initialized via houdini.config.js
	if (browser) {
		console.log('[Layout] Houdini client will be auto-initialized');
	}

	const { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	if (browser) {
		if (!data.clerkPublishableKey) {
			console.error('[Layout] Clerk publishable key is missing. Authentication will not work.');
		} else {
			console.log('[Layout] Clerk publishable key is set:', data.clerkPublishableKey.substring(0, 20) + '...');
		}
	}
</script>

{#if data.clerkPublishableKey}
	<ClerkProvider publishableKey={data.clerkPublishableKey}>
		<div class="app-layout">
			{@render children()}
		</div>
	</ClerkProvider>
{:else}
	<div class="app-layout">
		<div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; flex-direction: column; gap: 1rem;">
			<h1 style="color: var(--sb-text-primary, #ffffff);">設定エラー</h1>
			<p style="color: var(--sb-text-secondary, #cccccc);">
				Clerk の公開キーが設定されていません。環境変数 PUBLIC_CLERK_PUBLISHABLE_KEY または CLERK_PUBLISHABLE_KEY を設定してください。
			</p>
		</div>
	</div>
{/if}

<style>
	.app-layout {
		min-height: 100vh;
		width: 100%;
		height: 100vh;
		background-color: var(--sb-bg-primary, #1a1a1a);
		color: var(--sb-text-primary, #ffffff);
		overflow: hidden;
	}
</style>
