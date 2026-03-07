<script lang="ts">
	import { listGenerationJobs } from '$lib/client/storyboard-client';
	import { getActiveJobCount } from '$lib/stores/job-store.svelte';
	import { Tooltip } from '@skeletonlabs/skeleton-svelte';
	import { Zap } from 'lucide-svelte';

	let health = $state<{
		status: string; model: string; device: string; model_loaded: boolean; load_time_ms: number;
	}>({ status: 'loading', model: '', device: '', model_loaded: false, load_time_ms: 0 });

	async function checkHealth() {
		try {
			await listGenerationJobs();
			health = { status: 'ok', model: 'via connect', device: '-', model_loaded: true, load_time_ms: 0 };
		} catch {
			health = { status: 'unavailable', model: '', device: '', model_loaded: false, load_time_ms: 0 };
		}
	}

	let initialized = false;
	$effect(() => {
		if (initialized) return;
		initialized = true;
		checkHealth();
		const interval = setInterval(checkHealth, 30000);
		return () => clearInterval(interval);
	});

	let statusColor = $derived(
		health.status === 'ok' && health.model_loaded ? '#34c759' :
		health.status === 'ok' && !health.model_loaded ? '#ff9f0a' : '#ff3b30'
	);

	let statusLabel = $derived(
		health.status === 'ok' && health.model_loaded ? 'Ready' :
		health.status === 'ok' && !health.model_loaded ? 'Loading...' : 'Offline'
	);

	let activeCount = $derived(getActiveJobCount());
</script>

<div class="relative" role="status" aria-live="polite">
	<Tooltip positioning={{ placement: 'bottom' }}>
		<Tooltip.Trigger>
			<button type="button" class="status-btn" aria-label="Image generation: {statusLabel}">
				<Zap size={14} />
				<span class="status-dot" style="background: {statusColor};{health.status === 'ok' && !health.model_loaded ? 'animation: pulse 1.5s infinite;' : ''}"></span>
				{#if activeCount > 0}
					<span class="job-badge">{activeCount}</span>
				{/if}
			</button>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<div class="tooltip-content">
				{#if health.status === 'ok'}
					<div class="font-semibold">{statusLabel}</div>
					<div class="text-zinc-400">Model: {health.model}</div>
					{#if health.load_time_ms > 0}
						<div class="text-zinc-400">Load: {(health.load_time_ms / 1000).toFixed(1)}s</div>
					{/if}
				{:else}
					<div class="font-semibold">Offline</div>
					<div class="text-zinc-400">Image gen not running</div>
					<div class="text-zinc-500 text-[11px]">Run: mise run image-gen</div>
				{/if}
			</div>
		</Tooltip.Content>
	</Tooltip>
</div>

<style>
	@reference "tailwindcss";

	.status-btn {
		@apply flex h-[36px] items-center gap-1 rounded-full px-2.5 text-[12px] text-zinc-600 transition active:scale-95;
		background: rgba(118, 118, 128, 0.12);
	}

	.status-dot {
		@apply h-[7px] w-[7px] shrink-0 rounded-full;
	}

	.job-badge {
		@apply min-w-[16px] rounded-full bg-[#007aff] px-1 text-center text-[10px] font-bold leading-[16px] text-white;
	}

	.tooltip-content {
		@apply space-y-0.5 text-[12px];
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
