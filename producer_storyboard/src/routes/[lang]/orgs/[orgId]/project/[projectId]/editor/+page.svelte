<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { ListStoryboardsStore } from '$houdini';

	const { lang, orgId, projectId } = $page.params;
	let storyboardsStore: ListStoryboardsStore | null = null;

	function buildPath(storyboardId?: string): string {
		if (storyboardId) {
			return `/${lang}/orgs/${orgId}/project/${projectId}/${storyboardId}/editor`;
		}
		return `/${lang}/orgs/${orgId}/project/${projectId}/new/editor`;
	}

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
					await goto(buildPath(firstStoryboard.id), { replaceState: true });
					return;
				}
			}
			
			// If no storyboards exist, redirect to the new route anyway (will show empty state)
			// We'll use a placeholder ID that will be handled by the new route
			await goto(buildPath(), { replaceState: true });
		} catch (err) {
			console.error('[Editor] Error loading storyboards for redirect:', err);
			// On error, still redirect to new route
			await goto(buildPath(), { replaceState: true });
		}
	});
</script>

<div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: white;">
	<p>Redirecting...</p>
</div>

