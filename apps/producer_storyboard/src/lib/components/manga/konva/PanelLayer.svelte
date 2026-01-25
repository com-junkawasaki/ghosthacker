<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import PanelImage from './PanelImage.svelte';
	import type { Panel } from '$lib/grpc/generated/manga/v1/panel_pb';

	type Props = {
		panels: Panel[];
	};

	let { panels }: Props = $props();

	let konvaComponents: any = $state(null);

	onMount(async () => {
		if (!browser) return;

		try {
			const konvaModule = await import('svelte-konva');
			konvaComponents = konvaModule;
		} catch (err) {
			console.error('Failed to load Konva components:', err);
		}
	});
</script>

{#if konvaComponents}
	<svelte:component this={konvaComponents.Group} name="PanelLayer">
		{#each panels as panel (panel.id)}
			<svelte:component
				this={konvaComponents.Group}
				name="Panel-{panel.id}"
				x={panel.x}
				y={panel.y}
			>
				<svelte:component
					this={konvaComponents.Rect}
					name="PanelRect"
					width={panel.width}
					height={panel.height}
					fill="#ffffff"
					stroke="#000000"
					strokeWidth={2}
				/>
				{#if panel.imageUrl || panel.imageData}
					<PanelImage
						x={0}
						y={0}
						width={panel.width}
						height={panel.height}
						imageUrl={panel.imageUrl}
						imageData={panel.imageData}
					/>
				{/if}
			</svelte:component>
		{/each}
	</svelte:component>
{/if}
