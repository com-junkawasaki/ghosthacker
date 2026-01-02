<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import type Konva from 'konva';

	type Props = {
		selectedNodeId?: string;
		nodes: Array<{ id: string; node: Konva.Group }>;
	};

	let { selectedNodeId, nodes }: Props = $props();

	let konvaComponents: any = $state(null);
	let transformerHandle: Konva.Transformer | null = $state(null);

	onMount(async () => {
		if (!browser) return;

		try {
			const konvaModule = await import('svelte-konva');
			konvaComponents = konvaModule;
		} catch (err) {
			console.error('Failed to load Konva components:', err);
		}
	});

	$effect(() => {
		if (!transformerHandle || !selectedNodeId) {
			if (transformerHandle) {
				transformerHandle.nodes([]);
			}
			return;
		}

		const selectedNode = nodes.find((n) => n.id === selectedNodeId);
		if (selectedNode) {
			transformerHandle.nodes([selectedNode.node]);
			transformerHandle.getLayer()?.batchDraw();
		} else {
			transformerHandle.nodes([]);
		}
	});

	function boundBoxFunc(oldBox: any, newBox: any) {
		if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
			return oldBox;
		}
		return newBox;
	}
</script>

{#if konvaComponents}
	<svelte:component
		this={konvaComponents.Transformer}
		bind:handle={transformerHandle}
		boundBoxFunc={boundBoxFunc}
	/>
{/if}
