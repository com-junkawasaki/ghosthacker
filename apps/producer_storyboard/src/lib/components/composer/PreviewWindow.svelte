<script lang="ts">
	type Props = {
		isPlaying: boolean;
		currentTime: number;
		duration: number;
		onPlay: () => void;
		onPause: () => void;
		onSeek: (time: number) => void;
	};

	let { isPlaying, currentTime, duration, onPlay, onPause, onSeek }: Props = $props();

	function formatTime(seconds: number): string {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		const frames = Math.floor((seconds % 1) * 30);
		return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
	}

	function handleSeek(e: MouseEvent | { currentTarget: { offsetWidth: number; offsetX: number } }) {
		if ('clientX' in e && 'currentTarget' in e) {
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const x = e.clientX - rect.left;
			const percentage = x / rect.width;
			const newTime = percentage * duration;
			onSeek(newTime);
		} else {
			// Keyboard event handler
			const percentage = e.currentTarget.offsetX / e.currentTarget.offsetWidth;
			const newTime = percentage * duration;
			onSeek(newTime);
		}
	}
</script>

<div class="preview-window">
	<div class="preview-area">
		<div class="preview-placeholder">
			<span>Preview Area</span>
		</div>
	</div>

	<div class="preview-controls">
		<div class="playback-controls">
			<button class="control-button" onclick={() => onSeek(0)} aria-label="Go to start">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M2 2L2 14M2 2L12 8L2 14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button class="control-button play-button" onclick={() => isPlaying ? onPause() : onPlay()}>
				{#if isPlaying}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<rect x="5" y="3" width="2" height="10"/>
						<rect x="9" y="3" width="2" height="10"/>
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d="M3 2L3 14L13 8L3 2Z"/>
					</svg>
				{/if}
			</button>
			<button class="control-button" onclick={() => onSeek(duration)} aria-label="Go to end">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M14 2L14 14M14 2L4 8L14 14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button class="control-button" aria-label="Picture in picture" onclick={() => console.log('PiP')}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<rect x="2" y="2" width="12" height="12" stroke-width="1.5"/>
					<path d="M6 6L10 8L6 10V6Z" fill="currentColor"/>
				</svg>
			</button>
		</div>

		<div class="timeline-controls">
			<div class="time-display">{formatTime(currentTime)}</div>
			<div
				class="timeline-bar"
				role="slider"
				aria-label="Timeline seek"
				aria-valuemin="0"
				aria-valuemax={duration}
				aria-valuenow={currentTime}
				tabindex="0"
				onclick={handleSeek}
				onkeydown={(e) => {
					if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
						e.preventDefault();
						const step = duration / 100; // 1% step
						const newTime = e.key === 'ArrowLeft'
							? Math.max(0, currentTime - step)
							: Math.min(duration, currentTime + step);
						onSeek(newTime);
					}
				}}
			>
				<div class="timeline-progress" style="width: {duration > 0 ? (currentTime / duration * 100) : 0}%"></div>
				<div class="timeline-handle" style="left: {duration > 0 ? (currentTime / duration * 100) : 0}%"></div>
			</div>
		</div>

		<div class="view-controls">
			<button class="control-button" aria-label="View options">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<rect x="2" y="2" width="12" height="12" stroke-width="1.5"/>
					<path d="M5 5H11M5 8H11M5 11H8" stroke-width="1.5"/>
				</svg>
			</button>
			<button class="control-button" aria-label="Aspect ratio">16:9</button>
		</div>
	</div>
</div>

<style>
	.preview-window {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #0a0a0a;
	}

	.preview-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000;
		position: relative;
	}

	.preview-placeholder {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.875rem;
	}

	.preview-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #1a1a1a;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.playback-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.control-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		color: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.control-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.play-button {
		background: rgba(59, 130, 246, 0.2);
		border-color: rgba(59, 130, 246, 0.4);
	}

	.timeline-controls {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.time-display {
		font-family: monospace;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		min-width: 80px;
	}

	.timeline-bar {
		flex: 1;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		position: relative;
		cursor: pointer;
	}

	.timeline-progress {
		height: 100%;
		background: #3b82f6;
		border-radius: 2px;
		transition: width 0.1s;
	}

	.timeline-handle {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 12px;
		height: 12px;
		background: #3b82f6;
		border: 2px solid white;
		border-radius: 50%;
		cursor: grab;
	}

	.timeline-handle:active {
		cursor: grabbing;
	}

	.view-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
