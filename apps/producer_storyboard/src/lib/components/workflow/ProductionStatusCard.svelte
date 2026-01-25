<script lang="ts">
	import type { EpisodeProduction, ProductionStatus } from '$lib/types/workflow';
	import { ProductionStatusLabels } from '$lib/types/workflow';

	interface Props {
		production: EpisodeProduction;
		phases: ProductionStatus[];
		onUpdateStatus?: (episodeId: string, status: ProductionStatus) => void;
	}

	let { production, phases, onUpdateStatus }: Props = $props();

	const currentPhaseIndex = $derived(
		phases.indexOf(production.status as ProductionStatus)
	);

	const statusLabel = $derived(
		ProductionStatusLabels[production.status as ProductionStatus] || { en: production.status, ja: production.status }
	);

	function formatDeadline(deadline?: string): string {
		if (!deadline) return '未設定';
		const date = new Date(deadline);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}

	function handleAdvance() {
		if (currentPhaseIndex < phases.length - 1) {
			const nextStatus = phases[currentPhaseIndex + 1];
			if (nextStatus !== undefined) {
				onUpdateStatus?.(production.episodeId, nextStatus);
			}
		}
	}

	const isComplete = $derived(production.status === 'delivered');
	const isOverdue = $derived(
		production.deadline 
			? new Date(production.deadline) < new Date() && !isComplete
			: false
	);
</script>

<div class="production-card" class:complete={isComplete} class:overdue={isOverdue}>
	<div class="card-header">
		<div class="episode-info">
			<h4 class="episode-title">
				{production.episodeTitle || `Episode ${production.episodeId.slice(0, 8)}`}
			</h4>
			<span class="status-label">{statusLabel.ja}</span>
		</div>
		<span class="progress-value">{production.progressPercent.toFixed(1)}%</span>
	</div>

	<div class="progress-bar-container">
		<div 
			class="progress-bar"
			style="width: {production.progressPercent}%"
		></div>
		<div class="phase-markers">
			{#each phases as phase, index}
				<div 
					class="marker"
					class:completed={index < currentPhaseIndex}
					class:current={index === currentPhaseIndex}
					style="left: {(index / (phases.length - 1)) * 100}%"
				></div>
			{/each}
		</div>
	</div>

	<div class="card-footer">
		<div class="meta-info">
			<span class="deadline" class:overdue={isOverdue}>
				締切: {formatDeadline(production.deadline)}
			</span>
		</div>

		{#if !isComplete && onUpdateStatus}
			<button class="advance-btn" onclick={handleAdvance}>
				次フェーズへ進む →
			</button>
		{/if}
	</div>
</div>

<style>
	.production-card {
		background: var(--bg-secondary, #16213e);
		border-radius: 12px;
		padding: 1rem;
		border: 1px solid var(--border-color, #2a2a4a);
	}

	.production-card.complete {
		border-color: var(--success-color, #10b981);
	}

	.production-card.overdue {
		border-color: var(--danger-color, #ef4444);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.episode-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.episode-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
		margin: 0;
	}

	.status-label {
		font-size: 0.75rem;
		color: var(--accent-color, #6366f1);
	}

	.progress-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--accent-color, #6366f1);
	}

	.progress-bar-container {
		position: relative;
		height: 8px;
		background: var(--bg-tertiary, #0f0f23);
		border-radius: 4px;
		margin-bottom: 0.75rem;
		overflow: visible;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--accent-color, #6366f1), var(--success-color, #10b981));
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.phase-markers {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
	}

	.marker {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--border-color, #2a2a4a);
	}

	.marker.completed {
		background: var(--success-color, #10b981);
	}

	.marker.current {
		width: 8px;
		height: 8px;
		background: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 2px var(--bg-secondary, #16213e);
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.meta-info {
		font-size: 0.75rem;
	}

	.deadline {
		color: var(--text-secondary, #a0a0a0);
	}

	.deadline.overdue {
		color: var(--danger-color, #ef4444);
	}

	.advance-btn {
		font-size: 0.75rem;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		border: none;
		background: var(--accent-color, #6366f1);
		color: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.advance-btn:hover {
		background: var(--accent-color-hover, #5558e0);
	}
</style>
