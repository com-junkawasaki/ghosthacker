<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import type Konva from 'konva';

	type Props = {
		fontSize?: number;
		fontFamily?: string;
		fillColor?: string;
		onTextStart?: (x: number, y: number, fontSize?: number, fontFamily?: string, fillColor?: string) => void;
		onTextUpdate?: (textId: string, text: string) => void;
		onTextComplete?: (textId: string) => void;
		onTextCancel?: () => void;
	};

	let {
		fontSize = 16,
		fontFamily = 'sans-serif',
		fillColor = '#000000',
		onTextStart,
		onTextUpdate,
		onTextComplete,
		onTextCancel,
	}: Props = $props();

	let layerHandle: Konva.Layer | null = $state(null);
	let konvaComponents: any = $state(null);
	let isEditing = $state(false);
	let currentText: Konva.Text | null = $state(null);
	let startPos: { x: number; y: number } | null = $state(null);

	onMount(async () => {
		if (!browser) return;

		try {
			const konvaModule = await import('svelte-konva');
			konvaComponents = konvaModule;
		} catch (err) {
			console.error('Failed to load Konva components:', err);
		}
	});

	function handleMouseDown(e: any) {
		if (!layerHandle || !konvaComponents || isEditing) return;

		isEditing = true;
		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos) return;

		startPos = { x: pos.x, y: pos.y };
		onTextStart?.(pos.x, pos.y, fontSize, fontFamily, fillColor);

		const Text = konvaComponents.Text;
		const text = new Text({
			x: pos.x,
			y: pos.y,
			text: '',
			fontSize,
			fontFamily,
			fill: fillColor,
		});

		layerHandle.add(text);
		currentText = text;

		// Focus on text input (would need a text input overlay in real implementation)
		// For now, just complete immediately
		setTimeout(() => {
			if (currentText) {
				const textId = currentText.id();
				onTextComplete?.(textId);
				isEditing = false;
				currentText = null;
				startPos = null;
			}
		}, 100);
	}

	function handleMouseUp() {
		if (isEditing && currentText) {
			const textId = currentText.id();
			onTextComplete?.(textId);
			isEditing = false;
			currentText = null;
			startPos = null;
		} else if (isEditing) {
			onTextCancel?.();
			isEditing = false;
		}
	}

	onMount(() => {
		if (!layerHandle) return;

		const stage = layerHandle.getStage();
		if (!stage) return;

		stage.on('mousedown', handleMouseDown);
		stage.on('mouseup', handleMouseUp);
	});

	onDestroy(() => {
		if (!layerHandle) return;

		const stage = layerHandle.getStage();
		if (!stage) return;

		stage.off('mousedown', handleMouseDown);
		stage.off('mouseup', handleMouseUp);
	});
</script>

{#if konvaComponents}
	<svelte:component
		this={konvaComponents.Layer}
		bind:handle={layerHandle}
	/>
{/if}
