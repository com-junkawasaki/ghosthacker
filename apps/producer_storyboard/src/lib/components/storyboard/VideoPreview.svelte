<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	type Scene = {
		id: string;
		sceneNumber: number;
		startTimeSeconds: number | null;
		durationSeconds: number | null;
		mediaUrl: string | null;
		// For generated images
		generatedImages?: { id: string; imageType: string }[];
	};

	type Dialogue = {
		id: string;
		sceneId: string;
		startTimeSeconds: number | null;
		audioUrl: string | null;
	};

	type Props = {
		scenes: Scene[];
		sceneDialogues: Record<string, Dialogue[]>;
		getImageUrl: (id: string) => string;
		width?: number;
		height?: number;
	};

	let { scenes, sceneDialogues, getImageUrl, width = 1920, height = 1080 }: Props = $props();

	let canvas: HTMLCanvasElement;
	// etro type is any because we import it dynamically
	let etro: any = null;
	let movie: any = null;
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let loading = $state(true);

	// Update Etro movie when scenes or dialogues change
	$effect(() => {
		if (movie && scenes && etro) {
			updateMovie();
		}
	});

	function updateMovie() {
		if (!movie || !scenes || !etro) return;

		// Clear existing layers
		movie.layers = [];

		// Calculate total duration and add layers
		let totalDuration = 0;

		scenes.forEach((scene) => {
			const startTime = scene.startTimeSeconds || 0;
			const duration = scene.durationSeconds || 2;
			const sceneEnd = startTime + duration;
			if (sceneEnd > totalDuration) totalDuration = sceneEnd;

			// Add image layer
			// Check for generated start image first
			let imageUrl: string | null = null;
			if (scene.generatedImages && scene.generatedImages.length > 0) {
				// Prefer 'start' image, fallback to any
				const startImg = scene.generatedImages.find(img => img.imageType === 'start') || scene.generatedImages[0];
				if (startImg) {
					imageUrl = getImageUrl(startImg.id);
				}
			}
			
			if (imageUrl) {
				const imageLayer = new etro.layer.Image({
					startTime: startTime,
					duration: duration,
					source: imageUrl,
					x: 0, 
					y: 0, 
					width: width, 
					height: height,
					destX: 0,
					destY: 0,
					destWidth: width,
					destHeight: height
				});
				movie?.addLayer(imageLayer);
			}

			// Add audio layers
			const dialogues = sceneDialogues[scene.id] || [];
			dialogues.forEach((dialogue, idx) => {
				if (dialogue.audioUrl || dialogue.id) {
					const audioSrc = dialogue.audioUrl || `/api/audio/${dialogue.id}`;
					const audioStartTime = startTime + (dialogue.startTimeSeconds || (idx * 2)); 
					
					const audioLayer = new etro.layer.Audio({
						startTime: audioStartTime,
						source: audioSrc,
					});
					movie?.addLayer(audioLayer);
				}
			});
		});

		duration = totalDuration;
	}

	onMount(async () => {
		if (browser) {
			try {
				// Dynamically import etro to avoid SSR issues
				const etroModule = await import('etro');
				etro = etroModule.default || etroModule;
				
				movie = new etro.Movie({ canvas: canvas });
				
				// Event listeners
				movie.on('play', () => isPlaying = true);
				movie.on('pause', () => isPlaying = false);
				movie.on('timeupdate', (e: any) => {
					currentTime = movie?.currentTime || 0;
				});

				updateMovie();
				
				// Initial render
				movie.refresh();
				loading = false;
			} catch (err) {
				console.error('Failed to load etro or initialize movie:', err);
			}
		}
	});

	onDestroy(() => {
		if (movie) {
			movie.stop();
			movie = null;
		}
	});

	function togglePlay() {
		if (!movie) return;
		if (isPlaying) {
			movie.pause();
		} else {
			movie.play();
		}
	}

	function handleSeek(e: Event) {
		if (!movie) return;
		const targetTime = parseFloat((e.target as HTMLInputElement).value);
		movie.currentTime = targetTime;
		movie.refresh(); // Force render at new time
	}

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}
</script>

<div class="video-preview">
	<div class="canvas-container">
		{#if loading}
			<div class="loading-overlay">Loading Preview...</div>
		{/if}
		<canvas bind:this={canvas} {width} {height}></canvas>
	</div>
	
	<div class="controls">
		<button class="play-button" onclick={togglePlay} disabled={loading}>
			{isPlaying ? '⏸' : '▶'}
		</button>
		
		<div class="time-display">
			{formatTime(currentTime)} / {formatTime(duration)}
		</div>
		
		<input 
			type="range" 
			class="seekbar" 
			min="0" 
			max={duration} 
			step="0.1" 
			value={currentTime}
			oninput={handleSeek}
			disabled={loading}
		/>
	</div>
</div>

<style>
	.video-preview {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: #000;
		padding: 0.5rem;
		border-radius: 0.5rem;
		width: 100%;
	}

	.canvas-container {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: #111;
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		z-index: 10;
	}

	canvas {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: white;
	}

	.play-button {
		background: none;
		border: none;
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.play-button:hover:not(:disabled) {
		color: #3b82f6;
	}

	.play-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.time-display {
		font-family: monospace;
		font-size: 0.875rem;
		min-width: 100px;
	}

	.seekbar {
		flex: 1;
		cursor: pointer;
	}
</style>
