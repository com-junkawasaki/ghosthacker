<script lang="ts">
	import { query, graphql } from '$houdini';
	import ListProjects from '$lib/graphql/queries/ListProjects.gql';

	const data = query(ListProjects);
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold mb-6">Storyboard Projects</h1>
	
	{#if $data.loading}
		<p>Loading projects...</p>
	{:else if $data.error}
		<div class="text-red-600">Error: {$data.error.message}</div>
	{:else if $data.data?.projects}
		{#if $data.data.projects.length === 0}
			<p>No projects found. Create a new project to get started.</p>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each $data.data.projects as project}
					<a href="/storyboard/{project.id}/editor" class="block p-4 border rounded-lg hover:shadow-lg">
						<h2 class="text-xl font-semibold mb-2">{project.title}</h2>
						{#if project.description}
							<p class="text-gray-600 text-sm">{project.description}</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>
