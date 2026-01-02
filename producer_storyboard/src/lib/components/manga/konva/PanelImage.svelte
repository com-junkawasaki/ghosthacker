<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	type Props = {
		x: number;
		y: number;
		width: number;
		height: number;
		imageUrl?: string;
		imageData?: string; // Base64 encoded bytea data
	};

	let { x, y, width, height, imageUrl, imageData }: Props = $props();

	let konvaComponents: any = $state(null);
	let image: HTMLImageElement | null = $state(null);

	onMount(async () => {
		if (!browser) return;

		try {
			const konvaModule = await import('svelte-konva');
			konvaComponents = konvaModule;

			// Load image from URL or base64 data
			if (!imageUrl && !imageData) {
				image = null;
				return;
			}

			const img = new window.Image();
			img.crossOrigin = 'anonymous';

			if (imageData) {
				if (imageData.startsWith('data:')) {
					img.src = imageData;
				} else {
					img.src = `data:image/png;base64,${imageData}`;
				}
			} else if (imageUrl) {
				img.src = imageUrl;
			}

			img.onload = () => {
				image = img;
			};
			img.onerror = () => {
				console.error('Failed to load image:', imageUrl || 'base64 data');
				image = null;
			};
		} catch (err) {
			console.error('Failed to load Konva components:', err);
		}
	});

	onDestroy(() => {
		if (image) {
			image.src = '';
			image = null;
		}
	});
</script>

{#if konvaComponents && image}
	<svelte:component
		this={konvaComponents.Image}
		name="PanelImage"
		x={x}
		y={y}
		width={width}
		height={height}
		image={image}
	/>
{/if}
