<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { query, mutation, graphql } from '$houdini';
	import ListStoryboards from '$lib/graphql/queries/ListStoryboards.gql';
	import ListScenes from '$lib/graphql/queries/ListScenes.gql';
	import GenerateVideo from '$lib/graphql/mutations/GenerateVideo.gql';
	import TimelineEditor from '$lib/components/storyboard/TimelineEditor.svelte';
	import SceneEditor from '$lib/components/storyboard/SceneEditor.svelte';
	import VideoPreview from '$lib/components/storyboard/VideoPreview.svelte';
	import GenerationSettings from '$lib/components/storyboard/GenerationSettings.svelte';

	const projectId = $page.params.projectId;

	const storyboards = query(ListStoryboards, { variables: { projectId } });
	const generateVideo = mutation(GenerateVideo);

	let selectedSceneId: string | null = null;

	$: storyboard = $storyboards.data?.storyboards?.[0] || null;
	$: storyboardId = storyboard?.id;

	const scenes = query(ListScenes, {
		variables: { storyboardId: storyboardId || '' },
		pause: !storyboardId,
	});

	async function handleGenerateVideo() {
		if (!storyboardId) return;

		await generateVideo.mutate({
			storyboardId,
		});
	}
</script>

<div class="flex flex-col h-screen">
	<header class="bg-gray-800 text-white p-4">
		<h1 class="text-2xl font-bold">Storyboard Editor</h1>
		{#if storyboard}
			<p class="text-sm">{storyboard.title}</p>
		{/if}
	</header>

	{#if $storyboards.loading}
		<div class="flex-1 flex items-center justify-center">
			<p>Loading...</p>
		</div>
	{:else if $storyboards.error}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-red-600">Error: {$storyboards.error.message}</div>
		</div>
	{:else if storyboard}
		<div class="flex-1 flex">
			<aside class="w-64 bg-gray-100 p-4">
				<GenerationSettings {storyboard} />
				<button
					on:click={handleGenerateVideo}
					disabled={$generateVideo.fetching}
					class="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
				>
					{$generateVideo.fetching ? 'Generating...' : 'Generate Video'}
				</button>
			</aside>

			<main class="flex-1 flex flex-col">
				<div class="flex-1 p-4">
					{#if $scenes.data?.scenes}
						<TimelineEditor scenes={$scenes.data.scenes} bind:selectedSceneId />
					{:else if $scenes.loading}
						<p>Loading scenes...</p>
					{/if}
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
				{#if storyboardId}
					<VideoPreview {storyboardId} />
				{/if}
			</aside>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p>No storyboard found. Create one to get started.</p>
		</div>
	{/if}
</div>
