<script lang="ts">
	import { browser } from '$app/environment';
	import './globals.css';

	// Houdini client is automatically initialized via houdini.config.js
	if (browser) {
		console.log('[Layout] Houdini client will be auto-initialized');
	}
</script>

<div class="app-layout">
	<slot />
</div>

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
