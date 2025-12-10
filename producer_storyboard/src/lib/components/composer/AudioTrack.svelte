<script lang="ts">
	type Props = {
		track: {
			id: string;
			name: string;
			type: string;
			number: number;
		};
		currentTime: number;
	};

	let { track, currentTime: _currentTime }: Props = $props();

	// Mock clips data
	const clips = track.type === 'audio' ? [
		{ id: '1', startTime: 0, duration: 30, name: 'Clip 1' },
		{ id: '2', startTime: 35, duration: 20, name: 'Clip 2' },
	] : [];

	let isVisible = $state(true);
	let isLocked = $state(false);
</script>

<div class="audio-track">
	<div class="track-controls">
		<button class="control-icon" onclick={() => isVisible = !isVisible}>
			{#if isVisible}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M1 8C1 8 3 4 8 4C13 4 15 8 15 8C15 8 13 12 8 12C3 12 1 8 1 8Z" stroke-width="1.5"/>
					<circle cx="8" cy="8" r="2" stroke-width="1.5"/>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M11 5L5 11M5 5L11 11" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{/if}
		</button>
		<button class="control-icon" onclick={() => isLocked = !isLocked}>
			{#if isLocked}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<rect x="3" y="7" width="10" height="7" rx="1"/>
					<path d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7" stroke-width="1.5"/>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<rect x="3" y="7" width="10" height="7" rx="1" stroke-width="1.5"/>
					<path d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7" stroke-width="1.5"/>
				</svg>
			{/if}
		</button>
		{#if track.type === 'audio'}
			<button class="control-icon" aria-label="Audio waveform">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M3 8L6 5L6 11L3 8Z" stroke-width="1.5"/>
					<path d="M8 4L8 12" stroke-width="1.5"/>
					<path d="M11 6L11 10" stroke-width="1.5"/>
				</svg>
			</button>
		{/if}
		<span class="track-name">{track.name}</span>
	</div>
	<div class="track-content">
		{#if track.type === 'audio' && clips.length > 0}
			{#each clips as clip}
				<div 
					class="audio-clip"
					style="left: {clip.startTime * 0.1}%; width: {clip.duration * 0.1}%"
				>
					<div class="clip-waveform"></div>
					<span class="clip-name">{clip.name}</span>
				</div>
			{/each}
		{:else if track.type === 'video'}
			<div class="video-clip">
				<div class="clip-thumbnails">
				{#each Array(5) as _}
					<div class="thumbnail"></div>
				{/each}
				</div>
			</div>
		{:else}
			<div class="empty-track"></div>
		{/if}
	</div>
</div>

<style>
	.audio-track {
		display: flex;
		height: 80px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.track-controls {
		width: 200px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #0a0a0a;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
	}

	.control-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		padding: 0;
	}

	.control-icon:hover {
		color: white;
	}

	.track-name {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		margin-left: auto;
	}

	.track-content {
		flex: 1;
		position: relative;
		background: #1a1a1a;
		min-height: 100%;
	}

	.audio-clip {
		position: absolute;
		top: 0;
		height: 100%;
		background: rgba(59, 130, 246, 0.3);
		border: 1px solid rgba(59, 130, 246, 0.5);
		border-radius: 0.25rem;
		cursor: move;
		display: flex;
		flex-direction: column;
		padding: 0.25rem;
	}

	.audio-clip:hover {
		background: rgba(59, 130, 246, 0.4);
	}

	.clip-waveform {
		flex: 1;
		background: repeating-linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.2) 0px,
			rgba(255, 255, 255, 0.2) 2px,
			transparent 2px,
			transparent 4px
		);
		border-radius: 0.125rem;
		margin-bottom: 0.25rem;
	}

	.clip-name {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.8);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.video-clip {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 100%;
		background: rgba(255, 255, 255, 0.05);
	}

	.clip-thumbnails {
		display: flex;
		height: 100%;
		gap: 1px;
	}

	.thumbnail {
		flex: 1;
		background: rgba(255, 255, 255, 0.1);
		border-right: 1px solid rgba(255, 255, 255, 0.1);
	}

	.empty-track {
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.02);
	}
</style>
