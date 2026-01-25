<script lang="ts">
	import { page } from '$app/stores';
	import AudioManager from '$lib/components/storyboard/AudioManager.svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const projectId = $derived($page.params.projectId);
</script>

<div class="page-layout">
	<ProjectSidebar {projectId} />
	<main class="page-content">
		<AudioManager {projectId} audioType="sound-effect" title="Sound Effects" />
	</main>
</div>

<style>
	.page-layout {
		display: flex;
		min-height: 100vh;
		background: #0a0a0a;
	}

	.page-content {
		flex: 1;
		overflow-y: auto;
	}
</style>

