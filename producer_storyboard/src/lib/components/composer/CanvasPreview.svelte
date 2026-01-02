<script lang="ts">
	import { composerStore } from '$lib/stores/composerStore.svelte';

	type Props = {
		width?: number;
		height?: number;
		aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
	};

	let { width = 1920, height = 1080, aspectRatio = '16:9' }: Props = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let canvasCtx: CanvasRenderingContext2D | null = $state(null);

	const composerState = $derived(composerStore.state);
	const currentTime = $derived(composerState.currentTime);
	const tracks = $derived(composerState.tracks);
	const isPlaying = $derived(composerState.isPlaying);

	// Calculate aspect ratio dimensions
	const aspectRatios = {
		'16:9': { width: 16, height: 9 },
		'9:16': { width: 9, height: 16 },
		'1:1': { width: 1, height: 1 },
		'4:3': { width: 4, height: 3 },
	};

	const displaySize = $derived(() => {
		const ratio = aspectRatios[aspectRatio];
		const maxWidth = 640;
		const maxHeight = 360;

		let w = maxWidth;
		let h = (maxWidth * ratio.height) / ratio.width;

		if (h > maxHeight) {
			h = maxHeight;
			w = (maxHeight * ratio.width) / ratio.height;
		}

		return { width: Math.round(w), height: Math.round(h) };
	});

	// Get currently active clips at the current time
	const activeClips = $derived(() => {
		const clips: Array<{ clip: (typeof tracks)[0]['clips'][0]; track: (typeof tracks)[0] }> = [];
		
		for (const track of tracks) {
			if (!track.visible || track.muted) continue;
			
			for (const clip of track.clips) {
				const clipStart = clip.startTime;
				const clipEnd = clip.startTime + clip.duration;
				
				if (currentTime >= clipStart && currentTime < clipEnd) {
					clips.push({ clip, track });
				}
			}
		}
		
		return clips;
	});

	// Initialize canvas
	$effect(() => {
		if (canvasEl) {
			canvasCtx = canvasEl.getContext('2d');
		}
	});

	// Render canvas
	$effect(() => {
		if (!canvasCtx || !canvasEl) return;

		const size = displaySize();
		canvasEl.width = size.width * 2; // High DPI
		canvasEl.height = size.height * 2;
		canvasCtx.scale(2, 2);

		// Clear canvas
		canvasCtx.fillStyle = '#000000';
		canvasCtx.fillRect(0, 0, size.width, size.height);

		// Render active clips
		const clips = activeClips();
		
		if (clips.length === 0) {
			// Show placeholder
			canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
			canvasCtx.fillRect(0, 0, size.width, size.height);
			
			canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
			canvasCtx.font = '16px system-ui, sans-serif';
			canvasCtx.textAlign = 'center';
			canvasCtx.textBaseline = 'middle';
			canvasCtx.fillText('No content at current time', size.width / 2, size.height / 2);
		} else {
			// Render each clip (simplified - would need actual media rendering)
			for (const { clip } of clips) {
				const progress = (currentTime - clip.startTime) / clip.duration;
				
				if (clip.type === 'video' || clip.type === 'image') {
					// Placeholder for video/image
					canvasCtx.fillStyle = 'rgba(34, 197, 94, 0.3)';
					canvasCtx.fillRect(0, 0, size.width, size.height);
					
					canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
					canvasCtx.font = '14px system-ui, sans-serif';
					canvasCtx.textAlign = 'center';
					canvasCtx.textBaseline = 'middle';
					canvasCtx.fillText(clip.name, size.width / 2, size.height / 2);
				} else if (clip.type === 'text') {
					// Render text element
					canvasCtx.fillStyle = '#ffffff';
					canvasCtx.font = 'bold 24px system-ui, sans-serif';
					canvasCtx.textAlign = 'center';
					canvasCtx.textBaseline = 'middle';
					canvasCtx.fillText(clip.name, size.width / 2, size.height / 2);
				} else if (clip.type === 'audio') {
					// Show audio waveform visualization
					canvasCtx.fillStyle = 'rgba(59, 130, 246, 0.2)';
					const barWidth = 4;
					const gap = 2;
					const barCount = Math.floor(size.width / (barWidth + gap));
					const centerY = size.height / 2;
					
					for (let i = 0; i < barCount; i++) {
						const x = i * (barWidth + gap);
						const amplitude = Math.sin((i + progress * 20) * 0.3) * 0.5 + 0.5;
						const barHeight = amplitude * size.height * 0.4;
						
						canvasCtx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
					}
				}
			}
		}

		// Draw time indicator
		canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
		canvasCtx.fillRect(size.width - 80, 10, 70, 24);
		canvasCtx.fillStyle = '#ffffff';
		canvasCtx.font = '12px monospace';
		canvasCtx.textAlign = 'right';
		canvasCtx.textBaseline = 'middle';
		canvasCtx.fillText(formatTime(currentTime), size.width - 15, 22);
	});

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const frames = Math.floor((seconds % 1) * 30);
		return `${mins}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
	}
</script>

<div class="canvas-preview">
	<div class="canvas-container" style="width: {displaySize().width}px; height: {displaySize().height}px;">
		<canvas
			bind:this={canvasEl}
			style="width: {displaySize().width}px; height: {displaySize().height}px;"
		></canvas>
		
		{#if isPlaying}
			<div class="playing-indicator">
				<span class="indicator-dot"></span>
				<span>Playing</span>
			</div>
		{/if}
	</div>
	
	<div class="preview-info">
		<span class="aspect-label">{aspectRatio}</span>
		<span class="resolution">{width}×{height}</span>
	</div>
</div>

<style>
	.canvas-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: #0a0a0a;
		padding: 16px;
		gap: 12px;
	}

	.canvas-container {
		position: relative;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
	}

	canvas {
		display: block;
	}

	.playing-indicator {
		position: absolute;
		top: 10px;
		left: 10px;
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.7);
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 11px;
		color: #ef4444;
	}

	.indicator-dot {
		width: 6px;
		height: 6px;
		background: #ef4444;
		border-radius: 50%;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.preview-info {
		display: flex;
		gap: 16px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.4);
	}

	.aspect-label {
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.resolution {
		font-family: monospace;
	}
</style>

