<script lang="ts">
	import { onMount } from 'svelte';
	import { grpcClient } from '$lib/grpc/client';
	import type { VideoStatus } from '$lib/grpc/generated/types';
	
	export let storyboardId: string;
	
	let videos: VideoStatus[] = [];
	let loading = true;
	
	onMount(async () => {
		try {
			const response = await grpcClient.listGeneratedVideos({ storyboardId });
			videos = response.videos;
			loading = false;
		} catch (e) {
			console.error('Failed to load videos:', e);
			loading = false;
		}
	});
</script>

<div class="h-full">
	<h2 class="text-lg font-semibold mb-4">Generated Videos</h2>
	
	{#if loading}
		<p>Loading videos...</p>
	{:else if videos.length === 0}
		<p class="text-sm text-gray-500">No videos generated yet</p>
	{:else}
		<div class="space-y-2">
			{#each videos as video (video.id)}
				<div class="p-3 border rounded">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium">Variation {video.variationNumber}</span>
						<span class="text-xs px-2 py-1 rounded {video.status === 'completed' ? 'bg-green-100 text-green-800' : video.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
							{video.status}
						</span>
					</div>
					{#if video.videoUrl}
						<video src={video.videoUrl} controls class="w-full mt-2" />
					{/if}
					{#if video.errorMessage}
						<p class="text-xs text-red-600 mt-1">{video.errorMessage}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
