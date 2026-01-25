<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { mangaStore } from '$lib/stores/mangaStore.svelte';
	import type { ToolType } from '$lib/stores/mangaStore.svelte';
	import type { Panel } from '$lib/grpc/generated/manga/v1/panel_pb';
	import type { SpeechBubble } from '$lib/grpc/generated/manga/v1/speech_bubble_pb';
	import PanelLayer from './konva/PanelLayer.svelte';
	import DrawingLayer from './konva/DrawingLayer.svelte';
	import ShapeLayer from './konva/ShapeLayer.svelte';
	import TextLayer from './konva/TextLayer.svelte';
	import SpeechBubbleComponent from './konva/SpeechBubble.svelte';
	import SelectionBox from './konva/SelectionBox.svelte';
	import type Konva from 'konva';

	type Props = {
		width: number;
		height: number;
		konvaStageJson?: Record<string, unknown>;
		panels?: Panel[];
		speechBubbles?: SpeechBubble[];
		selectedTool?: ToolType;
		selectedNodeId?: string | undefined;
	};

	let {
		width,
		height,
		konvaStageJson,
		panels = [],
		speechBubbles = [],
		selectedTool = 'select',
		selectedNodeId,
	}: Props = $props();

	let canvasElement: HTMLDivElement | null = $state(null);
	let konvaComponents: any = $state(null);
	let stageHandle: Konva.Stage | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let nodes: Array<{ id: string; node: Konva.Group }> = $state([]);

	onMount(async () => {
		if (!browser || !canvasElement) return;

		try {
			// Dynamically import svelte-konva components
			const konvaModule = await import('svelte-konva');
			konvaComponents = konvaModule;

			// Load stage JSON if provided
			if (konvaStageJson && stageHandle) {
				stageHandle.fromJSON(konvaStageJson);
			}

			loading = false;
		} catch (err) {
			console.error('Failed to load Konva components:', err);
			error = err instanceof Error ? err.message : 'Failed to load Konva components';
			loading = false;
		}
	});

	function handleStageUpdate() {
		if (stageHandle) {
			const stageJson = stageHandle.toJSON();
			mangaStore.setKonvaStageJson(stageJson);
		}
	}

	function handleNodeSelect(nodeId: string | undefined) {
		if (nodeId) {
			const panel = panels.find(p => p.id === nodeId);
			if (panel) {
				mangaStore.selectPanel(nodeId);
			} else {
				const bubble = speechBubbles.find(b => b.id === nodeId);
				if (bubble) {
					mangaStore.selectBubble(nodeId);
				}
			}
		} else {
			mangaStore.selectPanel(null);
			mangaStore.selectBubble(null);
		}
	}

	function handleDrawingComplete(lineId: string, points: number[]) {
		handleStageUpdate();
		mangaStore.saveToHistory('Draw line');
	}

	function handleShapeComplete(shapeId: string, shape: { type: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number }) {
		handleStageUpdate();
		mangaStore.saveToHistory(`Add ${shape.type}`);
	}

	function handleTextComplete(textId: string) {
		handleStageUpdate();
		mangaStore.saveToHistory('Add text');
	}

	function handleBubbleClick(bubbleId: string) {
		handleNodeSelect(bubbleId);
	}

	function handleBubbleDragEnd(bubbleId: string, x: number, y: number) {
		handleStageUpdate();
		mangaStore.saveToHistory('Move bubble');
	}
</script>

<div bind:this={canvasElement} class="canvas-area">
	{#if loading}
		<div class="loading">Loading canvas...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if konvaComponents}
		<svelte:component
			this={konvaComponents.Stage}
			bind:handle={stageHandle}
			width={width}
			height={height}
			class="konva-stage"
			on:click={(e) => {
				const target = e.detail.target;
				if (target === stageHandle) {
					handleNodeSelect(undefined);
				}
			}}
		>
			<!-- Panel Layer -->
			<PanelLayer {panels} />

			<!-- Drawing Layer (for pen/eraser) -->
			{#if selectedTool === 'pen' || selectedTool === 'eraser'}
				<DrawingLayer
					tool={selectedTool}
					color="#000000"
					strokeWidth={2}
					onDrawingComplete={handleDrawingComplete}
				/>
			{/if}

			<!-- Shape Layer (for rect/circle) -->
			{#if selectedTool === 'shape'}
				<ShapeLayer
					tool="rect"
					strokeColor="#000000"
					fillColor="transparent"
					strokeWidth={2}
					onShapeComplete={handleShapeComplete}
				/>
			{/if}

			<!-- Text Layer -->
			{#if selectedTool === 'text'}
				<TextLayer
					fontSize={16}
					fontFamily="sans-serif"
					fillColor="#000000"
					onTextComplete={handleTextComplete}
				/>
			{/if}

			<!-- Speech Bubbles -->
			{#each speechBubbles as bubble (bubble.id)}
				<SpeechBubbleComponent
					id={bubble.id}
					x={bubble.x}
					y={bubble.y}
					width={bubble.width}
					height={bubble.height}
					text={bubble.text}
					speaker={bubble.speaker}
					bubbleType={bubble.bubbleType}
					onClick={() => handleBubbleClick(bubble.id)}
					onDragEnd={(x, y) => handleBubbleDragEnd(bubble.id, x, y)}
				/>
			{/each}

			<!-- Selection Box / Transformer -->
			{#if selectedTool === 'select' && selectedNodeId}
				<SelectionBox {selectedNodeId} {nodes} />
			{/if}
		</svelte:component>
	{/if}
</div>

<style>
	.canvas-area {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.konva-stage {
		background-color: white;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.loading,
	.error {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: var(--text-secondary, #6b7280);
	}

	.error {
		color: var(--error-color, #ef4444);
	}
</style>

