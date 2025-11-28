<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Panel from '$lib/components/layout/Panel.svelte';

	let { children } = $props();
</script>

<div class="layout-container">
	<Sidebar />
	<main class="main-content">
		{@render children()}
	</main>
	<Panel />
</div>
