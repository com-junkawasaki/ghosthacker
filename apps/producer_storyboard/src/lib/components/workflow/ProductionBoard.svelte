<script lang="ts">
	import ProductionStatusCard from './ProductionStatusCard.svelte';
	import type { EpisodeProduction, ProductionStatus } from '$lib/types/workflow';
	import { ProductionStatusLabels } from '$lib/types/workflow';

	interface Props {
		productions: EpisodeProduction[];
		projectId: string;
		onUpdateStatus?: (episodeId: string, status: ProductionStatus) => void;
	}

	let { productions = [], projectId, onUpdateStatus }: Props = $props();

	const phases: ProductionStatus[] = [
		'planning', 'script', 'storyboard', 'layout', 'key_animation',
		'in_between', 'coloring', 'compositing', 'audio_recording',
		'audio_mix', 'editing', 'final_check', 'delivered'
	];

	const overallProgress = $derived(
		productions.length > 0
			? productions.reduce((sum, p) => sum + p.progressPercent, 0) / productions.length
			: 0
	);
</script>

<div class="production-board">
	<header class="board-header">
		<div class="header-title">
			<h2>制作進行 / Production Progress</h2>
			<span class="progress-badge">{overallProgress.toFixed(1)}% 完了</span>
		</div>
	</header>

	<div class="phases-timeline">
		{#each phases as phase, index}
			<div class="phase-marker" class:active={index < phases.length / 2}>
				<span class="phase-dot"></span>
				<span class="phase-label">{ProductionStatusLabels[phase].ja}</span>
			</div>
		{/each}
	</div>

	<div class="productions-list">
		{#each productions as production}
			<ProductionStatusCard
				{production}
				{phases}
				{onUpdateStatus}
			/>
		{:else}
			<p class="no-productions">
				エピソードの制作進行が登録されていません
			</p>
		{/each}
	</div>
</div>

<style>
	.production-board {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary, #1a1a2e);
		padding: 1.5rem;
	}

	.board-header {
		margin-bottom: 1.5rem;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-title h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
		margin: 0;
	}

	.progress-badge {
		background: var(--accent-color, #6366f1);
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
	}

	.phases-timeline {
		display: flex;
		overflow-x: auto;
		padding-bottom: 1rem;
		margin-bottom: 1.5rem;
		gap: 0.25rem;
	}

	.phase-marker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		min-width: 80px;
		flex-shrink: 0;
	}

	.phase-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--bg-tertiary, #0f0f23);
		border: 2px solid var(--border-color, #2a2a4a);
		position: relative;
	}

	.phase-marker.active .phase-dot {
		background: var(--accent-color, #6366f1);
		border-color: var(--accent-color, #6366f1);
	}

	.phase-marker::after {
		content: '';
		position: absolute;
		top: 5px;
		left: 50%;
		width: calc(100% - 12px);
		height: 2px;
		background: var(--border-color, #2a2a4a);
		transform: translateX(6px);
	}

	.phase-marker:last-child::after {
		display: none;
	}

	.phase-label {
		font-size: 0.625rem;
		color: var(--text-secondary, #a0a0a0);
		text-align: center;
		white-space: nowrap;
	}

	.phase-marker.active .phase-label {
		color: var(--accent-color, #6366f1);
	}

	.productions-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.no-productions {
		text-align: center;
		padding: 3rem;
		color: var(--text-secondary, #a0a0a0);
		font-size: 0.875rem;
		margin: 0;
	}
</style>
