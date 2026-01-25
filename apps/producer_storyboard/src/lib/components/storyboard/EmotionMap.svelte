<script lang="ts">
	export type Emotion = {
		name: string;
		x: number; // 0-100 normalized
		y: number; // 0-100 normalized
		color: string;
	};

	// Emotion positions based on the image description
	// Positions are normalized to 0-100 range
	const emotions: Emotion[] = [
		// Top-center
		{ name: 'Determination', x: 50, y: 15, color: '#ff6b35' },
		// Top-left
		{ name: 'Calmness', x: 20, y: 25, color: '#87ceeb' },
		// Mid-left
		{ name: 'Tiredness', x: 15, y: 40, color: '#708090' },
		{ name: 'Boredom', x: 18, y: 50, color: '#a9a9a9' },
		{ name: 'Relief', x: 25, y: 60, color: '#ffb347' },
		// Right side (cooler and darker tones)
		{ name: 'Anxiety', x: 85, y: 20, color: '#9370db' },
		{ name: 'Anger', x: 80, y: 35, color: '#dc143c' },
		{ name: 'Disgust', x: 75, y: 50, color: '#228b22' },
		{ name: 'Sadness', x: 78, y: 60, color: '#1e90ff' },
		{ name: 'Pain', x: 82, y: 70, color: '#8b0000' },
		{ name: 'Fear', x: 88, y: 85, color: '#ba55d3' },
		// Center
		{ name: 'Neutral', x: 55, y: 50, color: '#808080' },
		{ name: 'Interest', x: 40, y: 48, color: '#87ceeb' },
		{ name: 'Surprise', x: 60, y: 65, color: '#4169e1' },
		// Bottom-left (warmer and brighter tones)
		{ name: 'Joy', x: 20, y: 80, color: '#ffd700' },
		{ name: 'Triumph', x: 35, y: 75, color: '#ff8c00' },
		{ name: 'Amusement', x: 22, y: 88, color: '#ff6347' },
		{ name: 'Adoration', x: 45, y: 82, color: '#ff69b4' },
		{ name: 'Awe', x: 65, y: 78, color: '#87ceeb' },
	];

	type Props = {
		selectedEmotion?: Emotion | null;
		onSelect: (emotion: Emotion) => void;
	};

	let { selectedEmotion = null, onSelect }: Props = $props();

	let canvasRef: HTMLCanvasElement | null = $state(null);
	let containerRef: HTMLDivElement | null = $state(null);

	// Draw emotion map
	function drawEmotionMap() {
		if (!canvasRef || !containerRef) return;

		const canvas = canvasRef;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const rect = containerRef.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		const width = canvas.width;
		const height = canvas.height;

		// Create gradient background (simulating the emotion map colors)
		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)'); // Yellow (Joy area)
		gradient.addColorStop(0.2, 'rgba(255, 140, 0, 0.3)'); // Orange (Triumph area)
		gradient.addColorStop(0.4, 'rgba(135, 206, 235, 0.3)'); // Light blue (Calmness area)
		gradient.addColorStop(0.6, 'rgba(70, 130, 180, 0.3)'); // Steel blue (Neutral area)
		gradient.addColorStop(0.8, 'rgba(147, 112, 219, 0.3)'); // Purple (Anxiety area)
		gradient.addColorStop(1, 'rgba(220, 20, 60, 0.3)'); // Red (Anger area)

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// Draw emotion labels
		emotions.forEach((emotion) => {
			const x = (emotion.x / 100) * width;
			const y = (emotion.y / 100) * height;

			// Draw label background
			ctx.fillStyle = emotion.color;
			ctx.globalAlpha = 0.8;
			ctx.fillRect(x - 40, y - 10, 80, 20);

			// Draw label text
			ctx.fillStyle = '#000000';
			ctx.globalAlpha = 1;
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(emotion.name, x, y);

			// Highlight selected emotion
			if (selectedEmotion?.name === emotion.name) {
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 3;
				ctx.strokeRect(x - 42, y - 12, 84, 24);
			}
		});
	}

	function handleClick(e: MouseEvent) {
		if (!canvasRef || !containerRef) return;

		const rect = canvasRef.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;

		// Find closest emotion
		let closestEmotion: Emotion | null = null;
		let minDistance = Infinity;

		emotions.forEach((emotion) => {
			const distance = Math.sqrt(
				Math.pow(emotion.x - x, 2) + Math.pow(emotion.y - y, 2)
			);
			if (distance < minDistance) {
				minDistance = distance;
				closestEmotion = emotion;
			}
		});

		// If click is within reasonable distance (within 15% of canvas)
		if (closestEmotion && minDistance < 15) {
			onSelect(closestEmotion);
		}
	}

	$effect(() => {
		if (canvasRef && containerRef) {
			drawEmotionMap();
		}
	});

	$effect(() => {
		if (selectedEmotion && canvasRef) {
			drawEmotionMap();
		}
	});
</script>

<div class="emotion-map-container" bind:this={containerRef}>
	<canvas
		bind:this={canvasRef}
		class="emotion-map-canvas"
		onclick={handleClick}
		role="button"
		aria-label="Emotion map - click to select an emotion"
	></canvas>
</div>

<style>
	.emotion-map-container {
		width: 100%;
		height: 400px;
		position: relative;
		border-radius: 8px;
		overflow: hidden;
		background: linear-gradient(
			135deg,
			rgba(255, 215, 0, 0.2) 0%,
			rgba(255, 140, 0, 0.2) 25%,
			rgba(135, 206, 235, 0.2) 50%,
			rgba(147, 112, 219, 0.2) 75%,
			rgba(220, 20, 60, 0.2) 100%
		);
	}

	.emotion-map-canvas {
		width: 100%;
		height: 100%;
		cursor: pointer;
		touch-action: none;
	}

	.emotion-map-canvas:hover {
		opacity: 0.95;
	}
</style>

