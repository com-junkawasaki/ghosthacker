<script lang="ts">
	import { composerStore } from '$lib/stores/composerStore';

	type Props = {
		width?: number;
		height?: number;
		aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
	};

	let { width = 1920, height = 1080, aspectRatio = '16:9' }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let ctx: CanvasRenderingContext2D | null = $state(null);

	const state = $derived(composerStore.state);
	const currentTime = $derived(state.currentTime);
	const tracks = $derived(state.tracks);
	const isPlaying = $derived(state.isPlaying);

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
		if (canvas) {
			ctx = canvas.getContext('2d');
		}
	});

	// Render canvas
	$effect(() => {
		if (!ctx || !canvas) return;

		const size = displaySize();
		canvas.width = size.width * 2; // High DPI
		canvas.height = size.height * 2;
		ctx.scale(2, 2);

		// Clear canvas
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, size.width, size.height);

		// Render active clips
		const clips = activeClips();
		
		if (clips.length === 0) {
			// Show placeholder
			ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
			ctx.fillRect(0, 0, size.width, size.height);
			
			ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
			ctx.font = '16px system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('No content at current time', size.width / 2, size.height / 2);
		} else {
			// Render each clip (simplified - would need actual media rendering)
			for (const { clip, track } of clips) {
				const progress = (currentTime - clip.startTime) / clip.duration;
				
				if (clip.type === 'video' || clip.type === 'image') {
					// Placeholder for video/image
					ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
					ctx.fillRect(0, 0, size.width, size.height);
					
					ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
					ctx.font = '14px system-ui, sans-serif';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(clip.name, size.width / 2, size.height / 2);
				} else if (clip.type === 'text') {
					// Render text element
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 24px system-ui, sans-serif';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(clip.name, size.width / 2, size.height / 2);
				} else if (clip.type === 'audio') {
					// Show audio waveform visualization
					ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
					const barWidth = 4;
					const gap = 2;
					const barCount = Math.floor(size.width / (barWidth + gap));
					const centerY = size.height / 2;
					
					for (let i = 0; i < barCount; i++) {
						const x = i * (barWidth + gap);
						const amplitude = Math.sin((i + progress * 20) * 0.3) * 0.5 + 0.5;
						const barHeight = amplitude * size.height * 0.4;
						
						ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
					}
				}
			}
		}

		// Draw time indicator
		ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
		ctx.fillRect(size.width - 80, 10, 70, 24);
		ctx.fillStyle = '#ffffff';
		ctx.font = '12px monospace';
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		ctx.fillText(formatTime(currentTime), size.width - 15, 22);
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
			bind:this={canvas}
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
