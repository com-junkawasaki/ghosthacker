<script lang="ts">
	import { composerStore } from '$lib/stores/composerStore.svelte';
	import DraggableClip from './DraggableClip.svelte';

	type Props = {
		composerId: string | null;
	};

	let { composerId: _composerId }: Props = $props();
	void _composerId; // Reserved for future use

	const timelineState = $derived(composerStore.state);
	const tracks = $derived(timelineState.tracks);
	const currentTime = $derived(timelineState.currentTime);
	const duration = $derived(timelineState.duration);
	const zoom = $derived(timelineState.zoom);
	const isPlaying = $derived(timelineState.isPlaying);

	const trackHeight = 72;
	const trackControlsWidth = 180;

	let timelineContainer: HTMLDivElement | undefined = $state();
	let isDraggingPlayhead = $state(false);
	let dragOverTrackId = $state<string | null>(null);

	// Generate time markers based on zoom level
	const timeMarkers = $derived(() => {
		const markers: number[] = [];
		const step = zoom < 5 ? 30 : zoom < 15 ? 10 : zoom < 30 ? 5 : 1;
		for (let t = 0; t <= duration; t += step) {
			markers.push(t);
		}
		return markers;
	});

	// Timeline width in pixels
	const timelineWidth = $derived(duration * zoom);

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${String(secs).padStart(2, '0')}`;
	}

	function handleRulerClick(e: MouseEvent) {
		if (!timelineContainer) return;
		const rect = timelineContainer.getBoundingClientRect();
		const x = e.clientX - rect.left - trackControlsWidth + timelineContainer.scrollLeft;
		const time = Math.max(0, Math.min(x / zoom, duration));
		composerStore.seek(time);
	}

	function handlePlayheadDragStart(e: MouseEvent) {
		e.preventDefault();
		isDraggingPlayhead = true;
		window.addEventListener('mousemove', handlePlayheadDrag);
		window.addEventListener('mouseup', handlePlayheadDragEnd);
	}

	function handlePlayheadDrag(e: MouseEvent) {
		if (!isDraggingPlayhead || !timelineContainer) return;
		const rect = timelineContainer.getBoundingClientRect();
		const x = e.clientX - rect.left - trackControlsWidth + timelineContainer.scrollLeft;
		const time = Math.max(0, Math.min(x / zoom, duration));
		composerStore.seek(time);
	}

	function handlePlayheadDragEnd() {
		isDraggingPlayhead = false;
		window.removeEventListener('mousemove', handlePlayheadDrag);
		window.removeEventListener('mouseup', handlePlayheadDragEnd);
	}

	function handleWheel(e: WheelEvent) {
		if (e.ctrlKey || e.metaKey) {
			// Zoom
			e.preventDefault();
			const delta = e.deltaY > 0 ? -1 : 1;
			const newZoom = Math.max(2, Math.min(zoom + delta * 2, 60));
			composerStore.setZoom(newZoom);
		}
	}

	function handleTrackClick(trackId: string) {
		composerStore.selectTrack(trackId);
		composerStore.selectClip(null);
	}

	function handleClipSelect(clipId: string) {
		composerStore.selectClip(clipId);
	}

	function handleDragOver(e: DragEvent, trackId: string) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
		dragOverTrackId = trackId;
	}

	function handleDragLeave() {
		dragOverTrackId = null;
	}

	function handleDrop(e: DragEvent, trackId: string) {
		e.preventDefault();
		dragOverTrackId = null;

		try {
			const data = e.dataTransfer?.getData('application/json');
			if (!data) return;

			const resource = JSON.parse(data);
			if (resource.type === 'resource') {
				// Calculate drop position in timeline
				const trackElement = e.currentTarget as HTMLElement;
				const rect = trackElement.getBoundingClientRect();
				const x = e.clientX - rect.left - trackControlsWidth;
				const dropTime = Math.max(0, x / zoom);

				// Find the track
				const track = tracks.find(t => t.id === trackId);
				if (!track) return;

				// Create clip from resource
				const clipId = `clip-${Date.now()}`;
				const clipDuration = resource.duration || 5; // Default 5 seconds if no duration

				composerStore.addClip(trackId, {
					id: clipId,
					startTime: dropTime,
					duration: clipDuration,
					type: track.type === 'audio' ? 'audio' : track.type === 'video' ? 'video' : 'image',
					name: resource.name || 'Untitled Clip',
					url: resource.url,
					metadata: {
						resourceId: resource.id,
						assetType: resource.assetType,
					},
				});
			}
		} catch (err) {
			console.error('[TimelineEditor] Error handling drop:', err);
		}
	}

	// Playback timer
	$effect(() => {
		if (!isPlaying) return;

		const interval = setInterval(() => {
			const newTime = currentTime + 0.1;
			if (newTime >= duration) {
				composerStore.pause();
				composerStore.seek(0);
			} else {
				composerStore.seek(newTime);
			}
		}, 100);

		return () => clearInterval(interval);
	});
</script>

<div class="timeline-editor" bind:this={timelineContainer} onwheel={handleWheel}>
	<!-- Ruler -->
	<div class="timeline-header">
		<div class="track-controls-header">
			<span class="header-label">Tracks</span>
		</div>
		<div
			class="timeline-ruler"
			style="width: {timelineWidth}px"
			role="slider"
			tabindex="0"
			aria-label="Timeline"
			aria-valuemin="0"
			aria-valuemax={duration}
			aria-valuenow={currentTime}
			onclick={handleRulerClick}
			onkeydown={(e) => {
				if (e.key === 'ArrowLeft') composerStore.seek(currentTime - 1);
				if (e.key === 'ArrowRight') composerStore.seek(currentTime + 1);
			}}
		>
			{#each timeMarkers() as marker}
				<div class="time-marker" style="left: {marker * zoom}px">
					<span class="marker-label">{formatTime(marker)}</span>
					<div class="marker-line"></div>
				</div>
			{/each}
			
			<!-- Playhead on ruler -->
			<div
				class="playhead-marker"
				style="left: {currentTime * zoom}px"
				role="slider"
				tabindex="0"
				aria-label="Playhead"
				onmousedown={handlePlayheadDragStart}
			>
				<div class="playhead-head"></div>
			</div>
		</div>
	</div>

	<!-- Tracks -->
	<div class="timeline-body">
		<div class="tracks-container">
			{#if tracks.length > 0}
				{#each tracks as track (track.id)}
					<div class="track-row" style="height: {trackHeight}px">
						<!-- Track controls -->
						<div
							class="track-controls"
							class:selected={timelineState.selectedTrackId === track.id}
							role="button"
							tabindex="0"
							onclick={() => handleTrackClick(track.id)}
							onkeydown={(e) => e.key === 'Enter' && handleTrackClick(track.id)}
						>
							<div class="track-buttons">
								<button
									class="track-btn"
									class:active={!track.muted}
									title={track.muted ? 'Unmute' : 'Mute'}
									onclick={(e) => {
										e.stopPropagation();
										composerStore.toggleTrackMute(track.id);
									}}
								>
									{#if track.muted}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<line x1="4" y1="4" x2="20" y2="20"></line>
											<path d="M11 5L6 9H2v6h4l5 4V5z"></path>
										</svg>
									{:else}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M11 5L6 9H2v6h4l5 4V5z"></path>
											<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
										</svg>
									{/if}
								</button>
								<button
									class="track-btn"
									class:active={track.locked}
									title={track.locked ? 'Unlock' : 'Lock'}
									onclick={(e) => {
										e.stopPropagation();
										composerStore.toggleTrackLock(track.id);
									}}
								>
									{#if track.locked}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
											<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
											<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
										</svg>
									{:else}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
											<path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
										</svg>
									{/if}
								</button>
								<button
									class="track-btn"
									class:active={track.visible}
									title={track.visible ? 'Hide' : 'Show'}
									onclick={(e) => {
										e.stopPropagation();
										composerStore.toggleTrackVisibility(track.id);
									}}
								>
									{#if track.visible}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
											<circle cx="12" cy="12" r="3"></circle>
										</svg>
									{:else}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
											<line x1="1" y1="1" x2="23" y2="23"></line>
										</svg>
									{/if}
								</button>
							</div>
							<span class="track-name">{track.name}</span>
							<span class="track-type">{track.type}</span>
						</div>

						<!-- Track content with clips -->
						<div
							class="track-content"
							class:locked={track.locked}
							class:drag-over={dragOverTrackId === track.id}
							style="width: {timelineWidth}px"
							ondragover={(e) => !track.locked && handleDragOver(e, track.id)}
							ondragleave={handleDragLeave}
							ondrop={(e) => !track.locked && handleDrop(e, track.id)}
						>
							{#each track.clips as clip (clip.id)}
								<DraggableClip
									{clip}
									{zoom}
									trackHeight={trackHeight}
									onSelect={handleClipSelect}
								/>
							{/each}

							<!-- Playhead line -->
							<div class="playhead-line" style="left: {currentTime * zoom}px"></div>
						</div>
					</div>
				{/each}
			{:else}
				<div class="empty-timeline">
					<p>No tracks yet. Add a track to get started.</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer with zoom controls -->
	<div class="timeline-footer">
		<div class="footer-left">
			<span class="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
		</div>
		<div class="zoom-controls">
			<button
				class="zoom-btn"
				onclick={() => composerStore.setZoom(zoom - 5)}
				disabled={zoom <= 2}
			>
				−
			</button>
			<span class="zoom-value">{Math.round(zoom * 10)}%</span>
			<button
				class="zoom-btn"
				onclick={() => composerStore.setZoom(zoom + 5)}
				disabled={zoom >= 60}
			>
				+
			</button>
		</div>
	</div>
</div>

<style>
	.timeline-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #141414;
		overflow: hidden;
	}

	.timeline-header {
		display: flex;
		height: 32px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		flex-shrink: 0;
	}

	.track-controls-header {
		width: 180px;
		min-width: 180px;
		background: #0d0d0d;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		padding: 0 12px;
	}

	.header-label {
		font-size: 11px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.timeline-ruler {
		position: relative;
		height: 100%;
		background: #0d0d0d;
		cursor: pointer;
		overflow: visible;
	}

	.time-marker {
		position: absolute;
		top: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.marker-label {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.4);
		padding: 4px 4px 0;
		white-space: nowrap;
	}

	.marker-line {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 1px;
		height: 8px;
		background: rgba(255, 255, 255, 0.2);
	}

	.playhead-marker {
		position: absolute;
		top: 0;
		height: 100%;
		z-index: 20;
		cursor: ew-resize;
	}

	.playhead-head {
		position: absolute;
		top: 0;
		left: -6px;
		width: 12px;
		height: 16px;
		background: #ef4444;
		clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%);
	}

	.timeline-body {
		flex: 1;
		overflow: auto;
		display: flex;
		flex-direction: column;
	}

	.tracks-container {
		flex: 1;
	}

	.track-row {
		display: flex;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.track-controls {
		width: 180px;
		min-width: 180px;
		background: #0d0d0d;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 8px 12px;
		gap: 4px;
		cursor: pointer;
		transition: background 0.15s;
	}

	.track-controls:hover {
		background: #1a1a1a;
	}

	.track-controls.selected {
		background: rgba(59, 130, 246, 0.1);
		border-left: 2px solid #3b82f6;
	}

	.track-buttons {
		display: flex;
		gap: 4px;
	}

	.track-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		border-radius: 4px;
		padding: 0;
	}

	.track-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.track-btn.active {
		color: #3b82f6;
	}

	.track-name {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-type {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
	}

	.track-content {
		position: relative;
		background: #1a1a1a;
		min-height: 100%;
	}

	.track-content.locked {
		opacity: 0.5;
		pointer-events: none;
	}

	.track-content.drag-over {
		background: rgba(59, 130, 246, 0.1);
		border: 2px dashed rgba(59, 130, 246, 0.5);
	}

	.playhead-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: #ef4444;
		z-index: 15;
		pointer-events: none;
	}

	.empty-timeline {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: rgba(255, 255, 255, 0.3);
		font-size: 14px;
	}

	.timeline-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background: #0d0d0d;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		flex-shrink: 0;
	}

	.footer-left {
		display: flex;
		align-items: center;
	}

	.time-display {
		font-family: monospace;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.zoom-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		color: white;
		cursor: pointer;
		font-size: 16px;
		font-weight: 500;
	}

	.zoom-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	.zoom-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.zoom-value {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
		min-width: 40px;
		text-align: center;
	}
</style>
