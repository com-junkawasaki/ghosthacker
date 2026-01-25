<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { SpeechBubbleType } from '$lib/grpc/generated/manga/v1/speech_bubble_pb';

	type Props = {
		id?: string;
		x: number;
		y: number;
		width: number;
		height: number;
		text: string;
		speaker?: string;
		bubbleType: SpeechBubbleType;
		fontSize?: number;
		fontFamily?: string;
		draggable?: boolean;
		onClick?: () => void;
		onDragEnd?: (x: number, y: number) => void;
	};

	let {
		id,
		x,
		y,
		width,
		height,
		text,
		speaker,
		bubbleType,
		fontSize = 16,
		fontFamily = 'sans-serif',
		draggable = true,
		onClick,
		onDragEnd,
	}: Props = $props();

	let konvaComponents: any = $state(null);
	let groupHandle: any = $state(null);

	onMount(async () => {
		if (!browser) return;

		try {
			const konvaModule = await import('svelte-konva');
			konvaComponents = konvaModule;
		} catch (err) {
			console.error('Failed to load Konva components:', err);
		}
	});

	function getBubblePath(): string {
		const padding = 8;
		const bubbleTypeStr = SpeechBubbleType[bubbleType]?.toLowerCase() || 'speech';

		switch (bubbleTypeStr) {
			case 'speech':
				return `M ${padding} ${padding} 
					L ${width - padding} ${padding} 
					Q ${width} ${padding} ${width} ${padding + 5}
					L ${width} ${height - padding - 10}
					Q ${width} ${height - padding} ${width - 5} ${height - padding}
					L ${padding + 20} ${height - padding}
					L ${padding + 10} ${height - padding + 10}
					L ${padding} ${height - padding}
					Q ${padding} ${height - padding - 5} ${padding} ${height - padding - 10}
					L ${padding} ${padding + 5}
					Q ${padding} ${padding} ${padding + 5} ${padding}
					Z`;
			case 'thought':
				return `M ${padding} ${padding} 
					L ${width - padding} ${padding} 
					Q ${width} ${padding} ${width} ${padding + 5}
					L ${width} ${height - padding - 5}
					Q ${width} ${height - padding} ${width - 5} ${height - padding}
					L ${padding + 5} ${height - padding}
					Q ${padding} ${height - padding} ${padding} ${height - padding - 5}
					L ${padding} ${padding + 5}
					Q ${padding} ${padding} ${padding + 5} ${padding}
					Z`;
			case 'shout':
				return `M ${padding} ${padding} 
					L ${width - padding} ${padding} 
					L ${width} ${height - padding}
					L ${padding} ${height - padding}
					Z`;
			default:
				return `M ${padding} ${padding} 
					L ${width - padding} ${padding} 
					L ${width - padding} ${height - padding} 
					L ${padding} ${height - padding} 
					Z`;
		}
	}

	function handleDragEnd() {
		if (groupHandle && onDragEnd) {
			const pos = groupHandle.position();
			onDragEnd(pos.x, pos.y);
		}
	}
</script>

{#if konvaComponents}
	<svelte:component
		this={konvaComponents.Group}
		bind:handle={groupHandle}
		name="SpeechBubble"
		id={id}
		x={x}
		y={y}
		{draggable}
		on:click={onClick}
		on:dragend={handleDragEnd}
	>
		<svelte:component
			this={konvaComponents.Path}
			name="BubblePath"
			data={getBubblePath()}
			fill="white"
			stroke="black"
			strokeWidth={2}
		/>
		{#if SpeechBubbleType[bubbleType]?.toLowerCase() === 'thought'}
			<svelte:component
				this={konvaComponents.Circle}
				name="ThoughtCircle1"
				x={width - 10}
				y={height - 5}
				radius={3}
				fill="black"
			/>
			<svelte:component
				this={konvaComponents.Circle}
				name="ThoughtCircle2"
				x={width - 5}
				y={height + 2}
				radius={2}
				fill="black"
			/>
			<svelte:component
				this={konvaComponents.Circle}
				name="ThoughtCircle3"
				x={width - 2}
				y={height + 5}
				radius={1.5}
				fill="black"
			/>
		{/if}
		{#if SpeechBubbleType[bubbleType]?.toLowerCase() === 'speech'}
			<svelte:component
				this={konvaComponents.Path}
				name="SpeechTail"
				data="M {width - 30} {height - 8} L {width - 20} {height} L {width - 10} {height - 8}"
				stroke="black"
				strokeWidth={2}
				fill="white"
			/>
		{/if}
		<svelte:component
			this={konvaComponents.Text}
			name="BubbleText"
			x={8}
			y={8}
			width={width - 16}
			height={height - 16}
			text={text}
			fontSize={fontSize}
			fontFamily={fontFamily}
			fill="black"
			align="left"
			verticalAlign="top"
			wrap="word"
		/>
		{#if speaker}
			<svelte:component
				this={konvaComponents.Text}
				name="SpeakerText"
				x={8}
				y={-20}
				text={speaker}
				fontSize={fontSize - 2}
				fontFamily={fontFamily}
				fill="black"
				fontStyle="bold"
			/>
		{/if}
	</svelte:component>
{/if}
