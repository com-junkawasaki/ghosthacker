<script lang="ts">
	type Props = {
		scenes: Array<{
			id: string;
			sceneNumber: number;
			startTimeSeconds: number | null;
			durationSeconds: number | null;
		}>;
		selectedSceneId: string | null;
		totalDuration: number;
	};

	let { scenes, selectedSceneId = $bindable<string | null>(null), totalDuration }: Props = $props();

	function getScenePosition(scene: typeof scenes[0]): { left: number; width: number } {
		const start = (scene.startTimeSeconds || 0) / totalDuration;
		const duration = (scene.durationSeconds || 0) / totalDuration;
		return {
			left: start * 100,
			width: duration * 100,
		};
	}

	function handleSceneClick(sceneId: string) {
		selectedSceneId = sceneId;
	}

	function getTickPositions(): number[] {
		const ticks: number[] = [];
		for (let i = 0; i <= totalDuration; i++) {
			ticks.push(i);
		}
		return ticks;
	}
</script>

<div class="timeline">
	<!-- Tick Marks -->
	<div class="ticks">
		{#each getTickPositions() as tick}
			<div class="tick" style="left: {(tick / totalDuration) * 100}%">
				<span class="tick-label">{tick.toString().padStart(2, '0')}</span>
			</div>
		{/each}
	</div>

	<!-- Gradient Background -->
	<div class="gradient-bar"></div>

	<!-- Scene Blocks -->
	<div class="scene-blocks">
		{#each scenes as scene}
			{@const position = getScenePosition(scene)}
			<div
				class="scene-block"
				class:selected={selectedSceneId === scene.id}
				style="left: {position.left}%; width: {position.width}%"
				onclick={() => handleSceneClick(scene.id)}
				role="button"
				tabindex="0"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleSceneClick(scene.id);
					}
				}}
			>
				<div class="scene-block-content">
					{#if selectedSceneId === scene.id}
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" class="pointer-icon">
							<path d="M2 2L6 6L10 2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.timeline {
		position: relative;
		height: 80px;
		background-color: #2a2a2a;
		border-radius: 4px;
		overflow: hidden;
	}

	.ticks {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 100%;
		display: flex;
	}

	.tick {
		position: absolute;
		top: 0;
		width: 1px;
		height: 100%;
		background-color: rgba(255, 255, 255, 0.2);
	}

	.tick-label {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		transform: translateX(-50%);
	}

	.gradient-bar {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 8px;
		background: linear-gradient(to right, #d4a574, #8b5a3c);
		transform: translateY(-50%);
		border-radius: 4px;
	}

	.scene-blocks {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 24px;
		transform: translateY(-50%);
	}

	.scene-block {
		position: absolute;
		height: 100%;
		background-color: #000000;
		border-radius: 2px;
		cursor: pointer;
		transition: border-color 0.2s;
		border: 2px solid transparent;
	}

	.scene-block.selected {
		border-color: #ffffff;
	}

	.scene-block-content {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		border-top: 1px solid rgba(255, 255, 255, 0.3);
		border-bottom: 1px solid rgba(255, 255, 255, 0.3);
	}

	.pointer-icon {
		color: #ffffff;
	}
</style>
