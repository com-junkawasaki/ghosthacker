<script lang="ts">
	// IR Editor page
	import { onMount } from 'svelte';
	import { irApi } from '$lib/api/ir';
	import type { Entity } from '$lib/types';

	let entities: Entity[] = [];
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			entities = await irApi.listEntities();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load entities';
		} finally {
			loading = false;
		}
	});
</script>

<div class="p-8">
	<h1 class="text-3xl font-bold mb-4">IR Editor</h1>
	
	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p class="text-red-600">Error: {error}</p>
	{:else}
		<div class="space-y-4">
			<div class="flex justify-between items-center">
				<h2 class="text-xl font-semibold">Entities</h2>
				<button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
					Create Entity
				</button>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each entities as entity}
					<div class="p-4 bg-white rounded-lg shadow">
						<h3 class="font-semibold">{entity.name || entity.id}</h3>
						<p class="text-sm text-gray-600">{entity.type}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
