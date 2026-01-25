<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { SvelteFlow } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	type Props = {
		projectId: string;
	};

	let { projectId }: Props = $props();

	let nodes = $state([
		{ id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
		{ id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
	]);
	let edges = $state([
		{ id: 'e1-2', source: '1', target: '2' },
	]);

	// TODO: Load graph data from gRPC and convert to @xyflow/svelte format
	onMount(() => {
		if (browser) {
			// Load graph data
			loadGraphData();
		}
	});

	async function loadGraphData() {
		// TODO: Fetch JSON-LD graph data and convert to nodes/edges
		// For now, using placeholder data
	}
</script>

<div class="graph-panel">
	{#if browser}
		<SvelteFlow {nodes} {edges} class="graph-container" />
	{:else}
		<div class="loading">Loading graph...</div>
	{/if}
</div>

<style>
	.graph-panel {
		width: 100%;
		height: 100%;
	}

	.graph-container {
		width: 100%;
		height: 100%;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--text-secondary, #6b7280);
	}
</style>
