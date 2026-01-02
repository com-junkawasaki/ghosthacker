<script lang="ts">
	import { page } from '$app/stores';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import LocationManager from '$lib/components/storyboard/LocationManager.svelte';

	const { lang, orgId, projectId } = $page.params;
	let showLocationManager = $state(true);
</script>

<div class="resource-page">
	<ProjectSidebar projectId={projectId} />
	
	<div class="main-content">
		<header class="page-header">
			<h1 class="page-title">World</h1>
		</header>

		<main class="page-content">
			<LocationManager projectId={projectId} bind:open={showLocationManager} />
		</main>
	</div>
</div>

<style>
	.resource-page {
		display: flex;
		flex-direction: row;
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.page-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background-color: #1a1a1a;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 500;
		margin: 0;
		color: #ffffff;
	}

	.page-content {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-state {
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
	}

	.empty-state svg {
		margin-bottom: 1rem;
	}

	.empty-state h2 {
		font-size: 1.25rem;
		font-weight: 500;
		margin: 0 0 0.5rem 0;
		color: rgba(255, 255, 255, 0.9);
	}

	.empty-state p {
		font-size: 0.875rem;
		margin: 0;
		color: rgba(255, 255, 255, 0.6);
	}
</style>


