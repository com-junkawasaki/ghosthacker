<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	type Props = {
		audioUrl?: string | null;
		dialogueId?: string | null;
	};

	let { audioUrl = null, dialogueId = null }: Props = $props();

	let audioElement: HTMLAudioElement | null = null;
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let isLoading = $state(false);

	function getAudioSrc(): string | null {
		if (audioUrl) {
			return audioUrl;
		}
		if (dialogueId) {
			return `/api/audio/${dialogueId}`;
		}
		return null;
	}

	onMount(() => {
		const src = getAudioSrc();
		if (src) {
			audioElement = new Audio(src);
			audioElement.addEventListener('loadedmetadata', () => {
				duration = audioElement?.duration || 0;
			});
			audioElement.addEventListener('timeupdate', () => {
				currentTime = audioElement?.currentTime || 0;
			});
			audioElement.addEventListener('ended', () => {
				isPlaying = false;
				currentTime = 0;
			});
			audioElement.addEventListener('loadstart', () => {
				isLoading = true;
			});
			audioElement.addEventListener('canplay', () => {
				isLoading = false;
			});
		}
	});

	onDestroy(() => {
		if (audioElement) {
			audioElement.pause();
			audioElement = null;
		}
	});

	function togglePlay() {
		if (!audioElement) return;
		
		if (isPlaying) {
			audioElement.pause();
			isPlaying = false;
		} else {
			audioElement.play();
			isPlaying = true;
		}
	}

	function stop() {
		if (!audioElement) return;
		audioElement.pause();
		audioElement.currentTime = 0;
		isPlaying = false;
		currentTime = 0;
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

{#if getAudioSrc()}
	<div class="audio-player">
		<div class="audio-controls">
			<button
				type="button"
				onclick={togglePlay}
				disabled={isLoading}
				class="play-button"
				aria-label={isPlaying ? 'Pause' : 'Play'}
			>
				{#if isLoading}
					<span class="loading">⏳</span>
				{:else if isPlaying}
					<span>⏸</span>
				{:else}
					<span>▶</span>
				{/if}
			</button>
			<button
				type="button"
				onclick={stop}
				class="stop-button"
				aria-label="Stop"
			>
				<span>⏹</span>
			</button>
		</div>
		<div class="audio-progress">
			<div class="progress-bar">
				<div
					class="progress-fill"
					style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%"
				></div>
			</div>
			<div class="time-display">
				<span>{formatTime(currentTime)}</span>
				<span>/</span>
				<span>{formatTime(duration)}</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.audio-player {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.25rem;
	}

	.audio-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.play-button,
	.stop-button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		color: white;
		font-size: 0.875rem;
		transition: background 0.2s;
	}

	.play-button:hover:not(:disabled),
	.stop-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.play-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.audio-progress {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #3b82f6;
		transition: width 0.1s;
	}

	.time-display {
		display: flex;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
	}
</style>

