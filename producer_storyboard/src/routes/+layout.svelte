<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { setClient } from '$houdini';
	import client from '$lib/graphql/client';
	import './globals.css';

	if (browser) {
		console.log('[Layout] Setting Houdini client...');
		setClient(client);
		console.log('[Layout] Houdini client set successfully');
	}
</script>

<div class="app-layout">
	<slot />
</div>

<style>
	.app-layout {
		min-height: 100vh;
		width: 100%;
		background-color: var(--sb-bg-primary, #363636);
		color: var(--sb-text-primary, #ffffff);
	}
</style>
