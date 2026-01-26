<script lang="ts">
	import { mangaStore } from '$lib/stores/mangaStore.svelte';

	function handleZoomIn() {
		mangaStore.setZoom(mangaStore.state.zoom + 0.1);
	}

	function handleZoomOut() {
		mangaStore.setZoom(mangaStore.state.zoom - 0.1);
	}

	function handleZoomReset() {
		mangaStore.setZoom(1);
	}
</script>

<div class="zoom-controls">
	<button
		type="button"
		onclick={handleZoomOut}
		class="zoom-btn"
		title="Zoom Out"
	>
		−
	</button>
	<span class="zoom-level">{Math.round(mangaStore.state.zoom * 100)}%</span>
	<button
		type="button"
		onclick={handleZoomIn}
		class="zoom-btn"
		title="Zoom In"
	>
		+
	</button>
	<button
		type="button"
		onclick={handleZoomReset}
		class="zoom-btn reset-btn"
		title="Reset Zoom"
	>
		Reset
	</button>
</div>

<style>
	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background-color: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.375rem;
	}

	.zoom-btn {
		padding: 0.25rem 0.5rem;
		background-color: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.zoom-btn:hover {
		background-color: var(--bg-hover, #f3f4f6);
	}

	.zoom-level {
		font-size: 0.875rem;
		font-weight: 500;
		min-width: 3rem;
		text-align: center;
	}

	.reset-btn {
		font-size: 0.75rem;
	}
</style>

