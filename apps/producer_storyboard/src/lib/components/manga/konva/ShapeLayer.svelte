<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import type Konva from 'konva';

	type Props = {
		tool: 'rect' | 'circle';
		strokeColor?: string;
		fillColor?: string;
		strokeWidth?: number;
		onShapeComplete?: (shapeId: string, shape: { type: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number }) => void;
		onShapeStart?: (x: number, y: number, shapeType: 'rect' | 'circle', strokeColor?: string, fillColor?: string, strokeWidth?: number) => void;
		onShapeMove?: (x: number, y: number) => void;
		onShapeCancel?: () => void;
	};

	let {
		tool,
		strokeColor = '#000000',
		fillColor = 'transparent',
		strokeWidth = 2,
		onShapeComplete,
		onShapeStart,
		onShapeMove,
		onShapeCancel,
	}: Props = $props();

	let layerHandle: Konva.Layer | null = $state(null);
	let konvaComponents: any = $state(null);
	let isDrawing = $state(false);
	let currentShape: Konva.Rect | Konva.Circle | null = $state(null);
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
		if ((tool !== 'rect' && tool !== 'circle') || !layerHandle || !konvaComponents) return;

		isDrawing = true;
		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos) return;

		startPos = { x: pos.x, y: pos.y };
		onShapeStart?.(pos.x, pos.y, tool, strokeColor, fillColor, strokeWidth);

		if (tool === 'rect') {
			const Rect = konvaComponents.Rect;
			const rect = new Rect({
				x: pos.x,
				y: pos.y,
				width: 0,
				height: 0,
				stroke: strokeColor,
				fill: fillColor,
				strokeWidth,
			});
			layerHandle.add(rect);
			currentShape = rect;
		} else {
			const Circle = konvaComponents.Circle;
			const circle = new Circle({
				x: pos.x,
				y: pos.y,
				radius: 0,
				stroke: strokeColor,
				fill: fillColor,
				strokeWidth,
			});
			layerHandle.add(circle);
			currentShape = circle;
		}
	}

	function handleMouseMove(e: any) {
		if (!isDrawing || !currentShape || !startPos) return;

		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos) return;

		onShapeMove?.(pos.x, pos.y);

		if (tool === 'rect' && currentShape instanceof konvaComponents.Rect) {
			currentShape.x(Math.min(startPos.x, pos.x));
			currentShape.y(Math.min(startPos.y, pos.y));
			currentShape.width(Math.abs(pos.x - startPos.x));
			currentShape.height(Math.abs(pos.y - startPos.y));
		} else if (tool === 'circle' && currentShape instanceof konvaComponents.Circle) {
			const radius = Math.sqrt(
				Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
			);
			currentShape.radius(radius);
		}
	}

	function handleMouseUp() {
		if (isDrawing && currentShape && startPos) {
			const shapeId = currentShape.id();
			if (tool === 'rect' && currentShape instanceof konvaComponents.Rect) {
				const shape = {
					type: 'rect' as const,
					x: currentShape.x(),
					y: currentShape.y(),
					width: currentShape.width(),
					height: currentShape.height(),
				};
				onShapeComplete?.(shapeId, shape);
			} else if (tool === 'circle' && currentShape instanceof konvaComponents.Circle) {
				const shape = {
					type: 'circle' as const,
					x: currentShape.x(),
					y: currentShape.y(),
					radius: currentShape.radius(),
				};
				onShapeComplete?.(shapeId, shape);
			}
			isDrawing = false;
			currentShape = null;
			startPos = null;
		} else if (isDrawing) {
			onShapeCancel?.();
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
				onShapeCancel?.();
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
	});
</script>

{#if konvaComponents}
	<svelte:component
		this={konvaComponents.Layer}
		bind:handle={layerHandle}
	/>
{/if}
