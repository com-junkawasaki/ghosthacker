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
</script>

<ClerkProvider publishableKey={data.clerkPublishableKey}>
	<div class="app-layout">
		{@render children()}
	</div>
</ClerkProvider>

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
