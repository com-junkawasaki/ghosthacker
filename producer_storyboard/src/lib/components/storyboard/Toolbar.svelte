<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type Props = {
		storyboard: {
			aspectRatio: string;
			resolution: string;
			durationSeconds: number | null;
			numVariations: number;
		};
		generating: boolean;
	};

	let { storyboard, generating }: Props = $props();

	const dispatch = createEventDispatcher();

	function handleGenerate() {
		dispatch('generate');
	}

	function formatDuration(seconds: number | null): string {
		if (seconds === null) return '10s';
		return `${seconds}s`;
	}
</script>

<div class="toolbar">
	<button class="toolbar-button" aria-label="Aspect Ratio">
		{storyboard.aspectRatio || '16:9'}
	</button>

	<button class="toolbar-button" aria-label="Resolution">
		{storyboard.resolution || '480p'}
	</button>

	<button class="toolbar-button" aria-label="Duration">
		{formatDuration(storyboard.durationSeconds)}
	</button>

	<button class="toolbar-button" aria-label="Variations">
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
			<rect x="2" y="2" width="4" height="4" stroke-width="1.5" />
			<rect x="10" y="2" width="4" height="4" stroke-width="1.5" />
			<rect x="2" y="10" width="4" height="4" stroke-width="1.5" />
			<rect x="10" y="10" width="4" height="4" stroke-width="1.5" />
		</svg>
		{storyboard.numVariations || 4}v
	</button>

	<button class="toolbar-button" aria-label="Style">
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
			<rect x="2" y="2" width="12" height="12" stroke-width="1.5" />
		</svg>
		None
	</button>

	<button class="toolbar-button" aria-label="Help">
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
			<circle cx="8" cy="8" r="6" stroke-width="1.5" />
			<path d="M8 6V8M8 10H8.01" stroke-width="1.5" stroke-linecap="round" />
		</svg>
		? Help
	</button>

	<button
		class="toolbar-button create-button"
		on:click={handleGenerate}
		disabled={generating}
		aria-label="Create video"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
			<path d="M8 2V14M2 8H14" stroke-width="1.5" stroke-linecap="round" />
		</svg>
		↑ Create
	</button>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background-color: #2a2a2a;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.toolbar-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: #ffffff;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.toolbar-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.toolbar-button:focus {
		outline: 2px solid #ffffff;
		outline-offset: 2px;
	}

	.toolbar-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.create-button {
		background-color: #ffffff;
		color: #000000;
		font-weight: 500;
		margin-left: auto;
	}

	.create-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.9);
	}

	.create-button svg {
		stroke: #000000;
	}
</style>
