<script lang="ts">
	import { browser } from '$app/environment';
	import { ListAudioTracksStore } from '../../../../.houdini/plugins/houdini-svelte/stores/ListAudioTracks.js';
	import AudioTrack from './AudioTrack.svelte';

	type Props = {
		composerId: string | null;
		currentTime: number;
		onSeek: (time: number) => void;
	};

	let { composerId, currentTime, onSeek }: Props = $props();

	let tracks = $state<any[]>([]);
	let listAudioTracksStore: ListAudioTracksStore | null = null;

	if (browser) {
		listAudioTracksStore = new ListAudioTracksStore();
	}

	async function loadTracks() {
		if (!browser || !listAudioTracksStore || !_composerId) return;

		try {
			const result = await listAudioTracksStore.fetch({ variables: { composerId: _composerId } });
			if (result?.data?.audioTracks) {
				tracks = result.data.audioTracks.map((track: any) => ({
					id: track.id,
					name: track.name || `${track.trackType} Track ${track.trackNumber}`,
					type: track.trackType,
					number: track.trackNumber,
				}));
			}
		} catch (err) {
			console.error('[TimelineEditor] Error loading tracks:', err);
		}
	}

	$effect(() => {
		if (_composerId) {
			loadTracks();
		} else {
			tracks = [];
		}
	});


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
		{#if tracks.length > 0}
			{#each tracks as track}
				<AudioTrack track={track} currentTime={currentTime} />
			{/each}
		{:else}
			<div class="empty-timeline">
				<p>No tracks available. Create a composer first.</p>
			</div>
		{/if}
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

	.empty-timeline {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.875rem;
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
