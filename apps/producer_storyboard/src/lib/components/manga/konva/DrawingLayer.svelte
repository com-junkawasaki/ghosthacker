<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import type Konva from 'konva';

	type Props = {
		tool: 'pen' | 'eraser';
		color?: string;
		strokeWidth?: number;
		onDrawingComplete?: (lineId: string, points: number[]) => void;
		onDrawingStart?: (x: number, y: number, color?: string, strokeWidth?: number) => void;
		onDrawingMove?: (x: number, y: number) => void;
		onDrawingCancel?: () => void;
	};

	let {
		tool,
		color = '#000000',
		strokeWidth = 2,
		onDrawingComplete,
		onDrawingStart,
		onDrawingMove,
		onDrawingCancel,
	}: Props = $props();

	let layerHandle: Konva.Layer | null = $state(null);
	let konvaComponents: any = $state(null);
	let isDrawing = $state(false);
	let currentLine: Konva.Line | null = $state(null);
	let pressurePoints: Array<{ x: number; y: number; pressure: number; width: number }> = $state([]);

	onMount(async () => {
		if (!browser) return;

		try {
			const konvaModule = await import('svelte-konva');
			konvaComponents = konvaModule;
		} catch (err) {
			console.error('Failed to load Konva components:', err);
		}
	});

	function getPressure(e: any): number {
		if (e.evt && typeof (e.evt as PointerEvent).pressure === 'number') {
			const pressure = (e.evt as PointerEvent).pressure;
			return Math.max(0.0, Math.min(1.0, pressure));
		}
		return 0.5;
	}

	function calculateStrokeWidth(pressure: number, baseWidth: number, isEraser: boolean): number {
		const minMultiplier = isEraser ? 0.5 : 0.3;
		const maxMultiplier = isEraser ? 3.0 : 2.0;
		const multiplier = minMultiplier + pressure * (maxMultiplier - minMultiplier);
		return baseWidth * multiplier;
	}

	function handleMouseDown(e: any) {
		if ((tool !== 'pen' && tool !== 'eraser') || !layerHandle || !konvaComponents) return;

		isDrawing = true;
		const stage = e.target.getStage();
		if (!stage) return;

		const pos = stage.getPointerPosition();
		if (!pos) return;

		const pressure = getPressure(e);
		const lineColor = tool === 'eraser' ? '#ffffff' : color;
		const lineWidth = calculateStrokeWidth(pressure, strokeWidth, tool === 'eraser');

		pressurePoints = [{
			x: pos.x,
			y: pos.y,
			pressure,
			width: lineWidth,
		}];

		onDrawingStart?.(pos.x, pos.y, lineColor, lineWidth);

		const Line = konvaComponents.Line;
		const line = new Line({
			points: [pos.x, pos.y],
			stroke: lineColor,
			strokeWidth: lineWidth,
			lineCap: 'round',
			lineJoin: 'round',
			globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
			tension: 0.5,
			bezier: false,
		});

		layerHandle.add(line);
		currentLine = line;
	}

	function handleMouseMove(e: any) {
		if (!isDrawing || !currentLine || !layerHandle) return;

		const stage = e.target.getStage();
		if (!stage) return;

		const pos = stage.getPointerPosition();
		if (!pos) return;

		const pressure = getPressure(e);
		const lineWidth = calculateStrokeWidth(pressure, strokeWidth, tool === 'eraser');

		pressurePoints = [...pressurePoints, {
			x: pos.x,
			y: pos.y,
			pressure,
			width: lineWidth,
		}];

		onDrawingMove?.(pos.x, pos.y);

		const oldPoints = currentLine.points();
		const newPoints = [...oldPoints, pos.x, pos.y];
		currentLine.points(newPoints);

		const recentPoints = pressurePoints.slice(-5);
		const weightedPressure = recentPoints.reduce((sum, p, index) => {
			const weight = (index + 1) / recentPoints.length;
			return sum + p.pressure * weight;
		}, 0) / recentPoints.reduce((sum, _, index) => sum + (index + 1) / recentPoints.length, 0);

		const currentWidth = calculateStrokeWidth(weightedPressure, strokeWidth, tool === 'eraser');
		currentLine.strokeWidth(currentWidth);
		layerHandle.draw();
	}

	function handleMouseUp() {
		if (isDrawing && currentLine) {
			const points = currentLine.points();
			const lineId = currentLine.id();

			const avgPressure = pressurePoints.length > 0
				? pressurePoints.reduce((sum, p) => sum + p.pressure, 0) / pressurePoints.length
				: 0.5;
			const avgWidth = calculateStrokeWidth(avgPressure, strokeWidth, tool === 'eraser');
			currentLine.strokeWidth(avgWidth);

			onDrawingComplete?.(lineId, points);

			pressurePoints = [];
			isDrawing = false;
			currentLine = null;
		} else if (isDrawing) {
			pressurePoints = [];
			onDrawingCancel?.();
			isDrawing = false;
		}
	}

	onMount(() => {
		if (!layerHandle) return;

		const stage = layerHandle.getStage();
		if (!stage) return;

		stage.on('mousedown', handleMouseDown);
		stage.on('mousemove', handleMouseMove);
		stage.on('mouseup', handleMouseUp);
		stage.on('mouseleave', () => {
			if (isDrawing) {
				handleMouseUp();
				onDrawingCancel?.();
			}
		});

		stage.on('pointerdown', handleMouseDown);
		stage.on('pointermove', handleMouseMove);
		stage.on('pointerup', handleMouseUp);
		stage.on('pointerleave', () => {
			if (isDrawing) {
				handleMouseUp();
				onDrawingCancel?.();
			}
		});
	});

	onDestroy(() => {
		if (!layerHandle) return;

		const stage = layerHandle.getStage();
		if (!stage) return;

		stage.off('mousedown', handleMouseDown);
		stage.off('mousemove', handleMouseMove);
		stage.off('mouseup', handleMouseUp);
		stage.off('mouseleave', handleMouseUp);
		stage.off('pointerdown', handleMouseDown);
		stage.off('pointermove', handleMouseMove);
		stage.off('pointerup', handleMouseUp);
		stage.off('pointerleave', handleMouseUp);
	});
</script>

{#if konvaComponents}
	<svelte:component
		this={konvaComponents.Layer}
		bind:handle={layerHandle}
	/>
{/if}
