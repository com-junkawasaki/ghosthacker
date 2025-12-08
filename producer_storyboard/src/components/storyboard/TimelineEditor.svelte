<script lang="ts">
	import type { Scene } from '$lib/grpc/generated/types';
	
	export let scenes: Scene[] = [];
	export let selectedSceneId: string | null = $bindable(null);
	
	function selectScene(sceneId: string) {
		selectedSceneId = sceneId;
	}
</script>

<div class="h-full overflow-auto">
	<h2 class="text-lg font-semibold mb-4">Timeline</h2>
	
	<div class="space-y-2">
		{#each scenes as scene (scene.id)}
			<button
				on:click={() => selectScene(scene.id)}
				class="w-full p-3 border rounded text-left hover:bg-gray-50 {selectedSceneId === scene.id ? 'bg-blue-50 border-blue-500' : ''}"
			>
				<div class="flex items-center justify-between">
					<span class="font-medium">Scene {scene.sceneNumber}</span>
					{#if scene.durationSeconds}
						<span class="text-sm text-gray-500">{scene.durationSeconds.toFixed(1)}s</span>
					{/if}
				</div>
				{#if scene.textDescription}
					<p class="text-sm text-gray-600 mt-1">{scene.textDescription}</p>
				{/if}
			</button>
		{/each}
	</div>
</div>
