<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { grpcClient } from '$lib/grpc/client';
	import TimelineEditor from '$components/storyboard/TimelineEditor.svelte';
	import SceneEditor from '$components/storyboard/SceneEditor.svelte';
	import VideoPreview from '$components/storyboard/VideoPreview.svelte';
	import GenerationSettings from '$components/storyboard/GenerationSettings.svelte';
	import type { Storyboard, Scene } from '$lib/grpc/generated/types';
	
	const projectId = $page.params.projectId;
	
	let storyboard: Storyboard | null = null;
	let scenes: Scene[] = [];
	let loading = true;
	let error: string | null = null;
	let selectedSceneId: string | null = null;
	
	onMount(async () => {
		try {
			// Get project's storyboards (for now, get first one or create)
			const storyboardsResponse = await grpcClient.listStoryboards({ projectId });
			if (storyboardsResponse.storyboards.length > 0) {
				storyboard = storyboardsResponse.storyboards[0];
				const scenesResponse = await grpcClient.listScenes({ storyboardId: storyboard.id });
				scenes = scenesResponse.scenes;
			}
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load storyboard';
			loading = false;
		}
	});
	
	async function handleGenerateVideo() {
		if (!storyboard) return;
		
		try {
			const response = await grpcClient.generateVideo({
				storyboardId: storyboard.id,
			});
			console.log('Video generation started:', response);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to generate video';
		}
	}
</script>

<div class="flex flex-col h-screen">
	<header class="bg-gray-800 text-white p-4">
		<h1 class="text-2xl font-bold">Storyboard Editor</h1>
		{#if storyboard}
			<p class="text-sm">{storyboard.title}</p>
		{/if}
	</header>
	
	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<p>Loading...</p>
		</div>
	{:else if error}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-red-600">Error: {error}</div>
		</div>
	{:else if storyboard}
		<div class="flex-1 flex">
			<aside class="w-64 bg-gray-100 p-4">
				<GenerationSettings {storyboard} />
				<button
					on:click={handleGenerateVideo}
					class="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
				>
					Generate Video
				</button>
			</aside>
			
			<main class="flex-1 flex flex-col">
				<div class="flex-1 p-4">
					<TimelineEditor {scenes} bind:selectedSceneId />
				</div>
				
				<div class="h-64 border-t p-4">
					{#if selectedSceneId}
						<SceneEditor sceneId={selectedSceneId} />
					{:else}
						<p class="text-gray-500">Select a scene to edit</p>
					{/if}
				</div>
			</main>
			
			<aside class="w-64 bg-gray-100 p-4">
				<VideoPreview storyboardId={storyboard.id} />
			</aside>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p>No storyboard found. Create one to get started.</p>
		</div>
	{/if}
</div>
