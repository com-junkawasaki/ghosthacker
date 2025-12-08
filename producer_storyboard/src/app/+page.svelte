<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	
	onMount(() => {
		// Redirect to storyboard list page
		goto('/storyboard');
	});
</script>

<div class="flex items-center justify-center min-h-screen">
	<p>Loading...</p>
</div>
