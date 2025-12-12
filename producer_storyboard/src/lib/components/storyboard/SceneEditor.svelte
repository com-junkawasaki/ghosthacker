<script lang="ts">
	import { browser } from '$app/environment';

	type Props = {
		sceneId: string;
	};

	let { sceneId }: Props = $props();

	let scene = $state<any>(null);
	let loading = $state(false);
	let error = $state<Error | null>(null);

	async function loadScene() {
		if (!browser || !sceneId) return;
		
		try {
			loading = true;
			error = null;
			const response = await fetch(`/api/scenes/${sceneId}`);
			
			if (!response.ok) {
				throw new Error(`Failed to load scene: ${response.statusText}`);
			}
			
			const data = await response.json();
			scene = data;
		} catch (err) {
			console.error('[SceneEditor] Error loading scene:', err);
			error = err instanceof Error ? err : new Error('Failed to load scene');
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (browser && sceneId) {
			loadScene();
		}
	});
</script>

<div class="h-full">
	{#if loading}
		<p>Loading scene...</p>
	{:else if error}
		<div class="text-red-600">Error: {error.message}</div>
	{:else if scene}
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
