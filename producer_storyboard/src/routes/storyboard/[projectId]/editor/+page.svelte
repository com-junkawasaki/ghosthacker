<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { ListStoryboardsStore } from '$houdini';

	const projectId: string = $page.params.projectId || '';
	let storyboardsStore: ListStoryboardsStore | null = null;

	if (browser) {
		storyboardsStore = new ListStoryboardsStore();
	}

	onMount(async () => {
		if (!browser || !projectId || !storyboardsStore) {
			return;
		}

		try {
			// Load storyboards to get the first one
			const result = await storyboardsStore.fetch({ variables: { projectId } });
			
			if (result?.data?.storyboards && result.data.storyboards.length > 0) {
				const firstStoryboard = result.data.storyboards[0];
				if (firstStoryboard?.id) {
					// Redirect to the new route with storyboardId
					await goto(`/storyboard/${projectId}/${firstStoryboard.id}/editor`, { replaceState: true });
					return;
				}
			}
			
			// If no storyboards exist, redirect to the new route anyway (will show empty state)
			// We'll use a placeholder ID that will be handled by the new route
			await goto(`/storyboard/${projectId}/new/editor`, { replaceState: true });
		} catch (err) {
			console.error('[Editor] Error loading storyboards for redirect:', err);
			// On error, still redirect to new route
			await goto(`/storyboard/${projectId}/new/editor`, { replaceState: true });
		}
	});
</script>

<div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: white;">
	<p>Redirecting...</p>
</div>
