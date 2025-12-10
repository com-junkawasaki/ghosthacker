<script lang="ts">
	import AudioTrack from './AudioTrack.svelte';

	type Props = {
		currentTime: number;
		onSeek: (time: number) => void;
	};

	let { currentTime, onSeek }: Props = $props();

	// Mock tracks data
	const tracks = [
		{ id: '1', name: 'Subtitle Track', type: 'subtitle', number: 0 },
		{ id: '2', name: 'Video Track', type: 'video', number: 1 },
		{ id: '3', name: 'Audio Track', type: 'audio', number: 2 },
		{ id: '4', name: 'Audio Track 2', type: 'audio', number: 3 },
		{ id: '5', name: 'Video Track 2', type: 'video', number: 4 },
		{ id: '6', name: 'Audio Track 3', type: 'audio', number: 5 },
	];

	const timeMarkers = [0, 80, 190, 300, 600, 900];

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${String(secs).padStart(2, '0')}`;
	}
</script>

<div class="timeline-editor">
	<div class="timeline-header">
		<div class="track-controls-header"></div>
		<div class="timeline-ruler">
			{#each timeMarkers as marker}
				<div class="time-marker" style="left: {marker * 0.1}%">
					<span class="marker-label">{formatTime(marker)}</span>
					<div class="marker-line"></div>
				</div>
			{/each}
			<div class="playhead" style="left: {currentTime * 0.1}%">
				<div class="playhead-line"></div>
			</div>
		</div>
	</div>

	<div class="timeline-tracks">
		{#each tracks as track}
			<AudioTrack track={track} currentTime={currentTime} />
		{/each}
	</div>

	<div class="timeline-footer">
		<div class="zoom-controls">
			<button class="zoom-button">-</button>
			<button class="zoom-button">+</button>
		</div>
	</div>
</div>

<style>
	.timeline-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #1a1a1a;
	}

	.timeline-header {
		display: flex;
		height: 40px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.track-controls-header {
		width: 200px;
		background: #0a0a0a;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
	}

	.timeline-ruler {
		flex: 1;
		position: relative;
		background: #0a0a0a;
		height: 100%;
	}

	.time-marker {
		position: absolute;
		top: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.marker-label {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 0.25rem;
	}

	.marker-line {
		width: 1px;
		height: 100%;
		background: rgba(255, 255, 255, 0.2);
	}

	.playhead {
		position: absolute;
		top: 0;
		height: 100%;
		width: 2px;
		z-index: 10;
	}

	.playhead-line {
		width: 100%;
		height: 100%;
		background: #ef4444;
	}

	.timeline-tracks {
		flex: 1;
		overflow-y: auto;
		overflow-x: auto;
	}

	.timeline-footer {
		display: flex;
		justify-content: flex-end;
		padding: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.zoom-controls {
		display: flex;
		gap: 0.5rem;
	}

	.zoom-button {
		width: 32px;
		height: 32px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		color: white;
		cursor: pointer;
		font-size: 1rem;
	}

	.zoom-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
