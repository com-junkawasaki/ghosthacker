<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { GetSceneStore } from '$houdini';

	type Props = {
		sceneId: string;
	};

	let { sceneId }: Props = $props();

	const data = new GetSceneStore();

	$: {
		if (browser && sceneId) {
			data.fetch({ variables: { id: sceneId } });
		}
	}
</script>

<div class="h-full">
	{#if $data.loading}
		<p>Loading scene...</p>
	{:else if $data.error}
		<div class="text-red-600">Error: {$data.error.message}</div>
	{:else if $data.data?.scene}
		{@const scene = $data.data.scene}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Scene {scene.sceneNumber}</h3>

			<div>
				<label for="description" class="block text-sm font-medium mb-1">Description</label>
				<textarea
					id="description"
					value={scene.textDescription || ''}
					class="w-full p-2 border rounded"
					readonly
				></textarea>
			</div>

			{#if scene.mediaType}
				<div>
					<label class="block text-sm font-medium mb-1">Media Type</label>
					<p class="text-sm">{scene.mediaType}</p>
				</div>
			{/if}

			{#if scene.startTimeSeconds !== null && scene.startTimeSeconds !== undefined}
				<div>
					<label class="block text-sm font-medium mb-1">Start Time</label>
					<p class="text-sm">{scene.startTimeSeconds.toFixed(2)}s</p>
				</div>
			{/if}

			{#if scene.durationSeconds !== null && scene.durationSeconds !== undefined}
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
