<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	const { lang, orgId, projectId } = $page.params;

	function buildPath(storyboardId?: string): string {
		if (storyboardId) {
			return `/${lang}/orgs/${orgId}/project/${projectId}/${storyboardId}/editor`;
		}
		return `/${lang}/orgs/${orgId}/project/${projectId}/new/editor`;
	}

	onMount(async () => {
		if (!browser || !projectId) {
			return;
		}

		try {
			// Load storyboards to get the first one
			const response = await fetch(`/api/storyboards?projectId=${projectId}`, {
				headers: {
					'X-Org-Id': orgId,
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load storyboards: ${response.statusText}`);
			}
			
			const data = await response.json();
			
			if (data?.storyboards && data.storyboards.length > 0) {
				const firstStoryboard = data.storyboards[0];
				if (firstStoryboard?.id) {
					// Redirect to the new route with storyboardId
					await goto(buildPath(firstStoryboard.id), { replaceState: true });
					return;
				}
			}
			
			// If no storyboards exist, redirect to the new route anyway (will show empty state)
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

