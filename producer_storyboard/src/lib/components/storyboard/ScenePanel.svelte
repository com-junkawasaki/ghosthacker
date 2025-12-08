<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type Props = {
		scene: {
			id: string;
			sceneNumber: number;
			textDescription: string | null;
			startTimeSeconds: number | null;
			durationSeconds: number | null;
			mediaUrl: string | null;
		};
		selected: boolean;
	};

	let { scene, selected }: Props = $props();

	const dispatch = createEventDispatcher();

	function formatTime(seconds: number | null): string {
		if (seconds === null) return '00.00';
		const mins = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(2).padStart(5, '0');
		return `${mins.toString().padStart(2, '0')}.${secs}`;
	}

	function handleClick() {
		dispatch('select');
	}

	function handleEdit() {
		// TODO: Implement edit functionality
	}

	function handleDelete() {
		// TODO: Implement delete functionality
	}
</script>

<div class="scene-panel" class:selected onclick={handleClick} role="button" tabindex="0" onkeydown={(e) => {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		handleClick();
	}
}}>
	<!-- Scene Number -->
	<div class="scene-number">{scene.sceneNumber}</div>

	<!-- Content Area (Black) -->
	<div class="content-area">
		{#if scene.mediaUrl}
			<img src={scene.mediaUrl} alt="Scene {scene.sceneNumber}" />
		{:else}
			<div class="placeholder"></div>
		{/if}

		<!-- Scene Description -->
		{#if scene.textDescription}
			<div class="description">{scene.textDescription}</div>
		{/if}
	</div>

	<!-- Controls -->
	<div class="controls">
		<span class="timestamp">{formatTime(scene.startTimeSeconds)}</span>
		<div class="actions">
			<button class="icon-button" onclick={(e) => { e.stopPropagation(); handleEdit(); }} aria-label="Edit scene">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M11 2L14 5L5 14H2V11L11 2Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
			<button class="icon-button" onclick={(e) => { e.stopPropagation(); handleDelete(); }} aria-label="Delete scene">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M13 4V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V4H13Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.scene-panel {
		display: flex;
		flex-direction: column;
		background-color: #2a2a2a;
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;
		transition: border-color 0.2s;
		border: 2px solid transparent;
	}

	.scene-panel.selected {
		border-color: #ffffff;
	}

	.scene-number {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		color: #ffffff;
		z-index: 1;
	}

	.content-area {
		flex: 1;
		background-color: #000000;
		position: relative;
		min-height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.content-area img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.placeholder {
		width: 100%;
		height: 100%;
		background-color: #000000;
	}

	.description {
		position: absolute;
		bottom: 0.5rem;
		left: 0.5rem;
		color: #ffffff;
		font-size: 0.875rem;
		max-width: calc(100% - 1rem);
		line-height: 1.4;
	}

	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background-color: #2a2a2a;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.timestamp {
		font-size: 0.875rem;
		color: #ffffff;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.icon-button {
		background: none;
		border: none;
		color: #ffffff;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.icon-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.icon-button:focus {
		outline: 2px solid #ffffff;
		outline-offset: 2px;
	}
</style>
