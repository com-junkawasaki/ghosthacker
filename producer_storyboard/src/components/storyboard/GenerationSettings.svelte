<script lang="ts">
	import type { Storyboard } from '$lib/grpc/generated/types';
	
	export let storyboard: Storyboard;
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Generation Settings</h2>
	
	<div>
		<label class="block text-sm font-medium mb-1">Aspect Ratio</label>
		<p class="text-sm">{storyboard.aspectRatio}</p>
	</div>
	
	<div>
		<label class="block text-sm font-medium mb-1">Resolution</label>
		<p class="text-sm">{storyboard.resolution}</p>
	</div>
	
	{#if storyboard.durationSeconds}
		<div>
			<label class="block text-sm font-medium mb-1">Duration</label>
			<p class="text-sm">{storyboard.durationSeconds}s</p>
		</div>
	{/if}
	
	<div>
		<label class="block text-sm font-medium mb-1">Variations</label>
		<p class="text-sm">{storyboard.numVariations}</p>
	</div>
</div>
