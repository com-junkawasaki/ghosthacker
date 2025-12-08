<script lang="ts">
	import { browser } from '$app/environment';
	import { ListGeneratedVideosStore } from '$houdini';

	type Props = {
		storyboardId: string;
	};

	let { storyboardId }: Props = $props();

	const data = new ListGeneratedVideosStore();

	// Use reactive statements for Houdini store compatibility
	let loading = $state(false);
	let error = $state<Error | null>(null);
	
	$: {
		loading = $data.fetching && !$data.data;
		const firstError = $data.errors?.[0];
		error = firstError ? new Error(firstError.message) : null;
	}

	$effect(() => {
		if (browser && storyboardId) {
			data.fetch({ variables: { storyboardId } });
		}
	});
</script>

<div class="h-full">
	<h2 class="text-lg font-semibold mb-4">Generated Videos</h2>

	{#if loading}
		<p>Loading videos...</p>
	{:else if error}
		<div class="text-red-600">Error: {error.message}</div>
	{:else if $data.data?.generatedVideos}
		{#if $data.data.generatedVideos.length === 0}
			<p class="text-sm text-gray-500">No videos generated yet</p>
		{:else}
			<div class="space-y-2">
				{#each $data.data.generatedVideos as video (video.id)}
					<div class="p-3 border rounded">
						<div class="flex items-center justify-between mb-2">
							<span class="text-sm font-medium">Variation {video.variationNumber}</span>
							<span
								class="text-xs px-2 py-1 rounded {video.status === 'completed'
									? 'bg-green-100 text-green-800'
									: video.status === 'failed'
										? 'bg-red-100 text-red-800'
										: 'bg-yellow-100 text-yellow-800'}"
							>
								{video.status}
							</span>
						</div>
						{#if video.videoUrl}
							<video src={video.videoUrl} controls class="w-full mt-2"></video>
						{/if}
						{#if video.errorMessage}
							<p class="text-xs text-red-600 mt-1">{video.errorMessage}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
