<script lang="ts">
	import { onMount } from 'svelte';
	import { grpcClient } from '$lib/grpc/client';
	import type { Project } from '$lib/grpc/generated/types';
	
	let projects: Project[] = [];
	let loading = true;
	let error: string | null = null;
	
	onMount(async () => {
		try {
			const response = await grpcClient.listProjects({});
			projects = response.projects;
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load projects';
			loading = false;
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold mb-6">Storyboard Projects</h1>
	
	{#if loading}
		<p>Loading projects...</p>
	{:else if error}
		<div class="text-red-600">Error: {error}</div>
	{:else if projects.length === 0}
		<p>No projects found. Create a new project to get started.</p>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each projects as project}
				<a href="/storyboard/{project.id}/editor" class="block p-4 border rounded-lg hover:shadow-lg">
					<h2 class="text-xl font-semibold mb-2">{project.title}</h2>
					{#if project.description}
						<p class="text-gray-600 text-sm">{project.description}</p>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>
