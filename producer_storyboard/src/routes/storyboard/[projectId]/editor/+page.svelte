<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { ListStoryboardsStore, ListScenesStore, GenerateVideoStore } from '$houdini';
	import ScenePanel from '$lib/components/storyboard/ScenePanel.svelte';
	import Timeline from '$lib/components/storyboard/Timeline.svelte';
	import Toolbar from '$lib/components/storyboard/Toolbar.svelte';

	const projectId: string = $page.params.projectId || '';

	const storyboards = new ListStoryboardsStore();
	const generateVideo = new GenerateVideoStore();

	let selectedSceneId = $state<string | null>(null);

	// Use Svelte 5 runes mode
	const storyboard = $derived($storyboards.data?.storyboards?.[0] || null);
	const storyboardId = $derived(storyboard?.id);
	const storyboardsLoading = $derived($storyboards.fetching && !$storyboards.data);
	const storyboardsError = $derived($storyboards.errors?.[0] ? new Error($storyboards.errors[0].message) : null);

	const scenes = new ListScenesStore();

	onMount(() => {
		if (browser && projectId) {
			storyboards.fetch({ variables: { projectId } });
		}
	});

	$effect(() => {
		if (browser && storyboardId) {
			scenes.fetch({ variables: { storyboardId } });
		}
	});

	async function handleGenerateVideo() {
		if (!storyboardId) return;
		await generateVideo.mutate({ storyboardId });
	}

	function handleSceneSelect(sceneId: string) {
		selectedSceneId = sceneId;
	}
</script>

<div class="storyboard-editor">
	<!-- Top Bar -->
	<header class="top-bar">
		<h1 class="title">Storyboard</h1>
	</header>

	{#if storyboardsLoading}
		<div class="loading-container">
			<p>Loading...</p>
		</div>
	{:else if storyboardsError}
		<div class="error-container">
			<div class="error">Error: {storyboardsError.message}</div>
		</div>
	{:else if storyboard && $scenes.data?.scenes}
		<!-- Main Content: Scene Panels -->
		<main class="scene-panels-container">
		{#each $scenes.data.scenes as scene}
			<ScenePanel
				{scene}
				selected={selectedSceneId === scene.id}
				on:select={() => handleSceneSelect(scene.id)}
			/>
		{/each}
		</main>

		<!-- Timeline -->
		<div class="timeline-container">
			<Timeline
				scenes={$scenes.data.scenes}
				bind:selectedSceneId={selectedSceneId}
				totalDuration={storyboard.durationSeconds || 10}
			/>
		</div>

		<!-- Bottom Toolbar -->
		<Toolbar
			{storyboard}
			on:generate={handleGenerateVideo}
			generating={$generateVideo.fetching}
		/>
	{:else}
		<div class="empty-container">
			<p>No storyboard found. Create one to get started.</p>
		</div>
	{/if}
</div>

<style>
	.storyboard-editor {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #363636;
		color: #ffffff;
	}

	.top-bar {
		padding: 1rem 2rem;
		text-align: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.title {
		font-size: 1.5rem;
		font-weight: 400;
		margin: 0;
		color: #ffffff;
	}

	.scene-panels-container {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		padding: 1rem;
		overflow-y: auto;
	}

	.timeline-container {
		padding: 1rem 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.loading-container,
	.error-container,
	.empty-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.error {
		color: #ff6b6b;
	}
</style>
