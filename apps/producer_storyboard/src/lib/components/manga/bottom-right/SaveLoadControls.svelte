<script lang="ts">
	import { mangaStore } from '$lib/stores/mangaStore.svelte';

	type Props = {
		mangaId: string;
	};

	let { mangaId }: Props = $props();

	async function handleSave() {
		// TODO: Implement save functionality
		console.log('Save clicked');
	}

	async function handleLoad() {
		// TODO: Implement load functionality
		console.log('Load clicked');
	}
</script>

<div class="save-load-controls">
	<button
		type="button"
		onclick={handleSave}
		disabled={mangaStore.state.saveStatus === 'saving'}
		class="control-btn save-btn"
		title="Save"
	>
		{mangaStore.state.saveStatus === 'saving' ? 'Saving...' : 'Save'}
	</button>
	<button
		type="button"
		onclick={handleLoad}
		class="control-btn load-btn"
		title="Load"
	>
		Load
	</button>
</div>

<style>
	.save-load-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.control-btn {
		padding: 0.5rem 1rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.control-btn:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.control-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

