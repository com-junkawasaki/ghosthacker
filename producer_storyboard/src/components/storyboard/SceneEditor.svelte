<script lang="ts">
	import { onMount } from 'svelte';
	import { grpcClient } from '$lib/grpc/client';
	import type { Scene } from '$lib/grpc/generated/types';
	
	export let sceneId: string;
	
	let scene: Scene | null = null;
	let loading = true;
	let error: string | null = null;
	
	onMount(async () => {
		try {
			const response = await grpcClient.getScene({ id: sceneId });
			scene = response;
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load scene';
			loading = false;
		}
	});
</script>

<div class="h-full">
	{#if loading}
		<p>Loading scene...</p>
	{:else if error}
		<div class="text-red-600">Error: {error}</div>
	{:else if scene}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Scene {scene.sceneNumber}</h3>
			
			<div>
				<label class="block text-sm font-medium mb-1">Description</label>
				<textarea
					value={scene.textDescription || ''}
					class="w-full p-2 border rounded"
					readonly
				/>
			</div>
			
			{#if scene.mediaType}
				<div>
					<label class="block text-sm font-medium mb-1">Media Type</label>
					<p class="text-sm">{scene.mediaType}</p>
				</div>
			{/if}
			
			{#if scene.startTimeSeconds !== undefined}
				<div>
					<label class="block text-sm font-medium mb-1">Start Time</label>
					<p class="text-sm">{scene.startTimeSeconds.toFixed(2)}s</p>
				</div>
			{/if}
			
			{#if scene.durationSeconds !== undefined}
				<div>
					<label class="block text-sm font-medium mb-1">Duration</label>
					<p class="text-sm">{scene.durationSeconds.toFixed(2)}s</p>
				</div>
			{/if}
		</div>
	{:else}
		<p>Scene not found</p>
	{/if}
</div>
