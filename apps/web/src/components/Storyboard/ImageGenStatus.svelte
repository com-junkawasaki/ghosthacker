<script lang="ts">
	import { getActiveJobCount } from '$lib/stores/job-store.svelte';

	const baseUrl = typeof window !== 'undefined' && window.location.port === '1421'
		? 'http://localhost:8081' : '';

	let health = $state<{
		status: string;
		model: string;
		device: string;
		model_loaded: boolean;
		load_time_ms: number;
	}>({ status: 'loading', model: '', device: '', model_loaded: false, load_time_ms: 0 });

	let showTooltip = $state(false);

	async function checkHealth() {
		try {
			const res = await fetch(`${baseUrl}/api/image-gen-health`);
			if (res.ok) {
				health = await res.json();
			} else {
				health = { status: 'unavailable', model: '', device: '', model_loaded: false, load_time_ms: 0 };
			}
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

	let statusClass = $derived(
		health.status === 'ok' && health.model_loaded ? 'healthy' :
		health.status === 'ok' && !health.model_loaded ? 'loading-model' :
		'down'
	);

	let statusLabel = $derived(
		health.status === 'ok' && health.model_loaded ? 'Image Gen' :
		health.status === 'ok' && !health.model_loaded ? 'Loading...' :
		'Offline'
	);

	let activeCount = $derived(getActiveJobCount());
</script>

<div
	class="image-gen-status"
	role="status"
	onmouseenter={() => showTooltip = true}
	onmouseleave={() => showTooltip = false}
>
	<span class="status-dot {statusClass}"></span>
	<span class="status-label">{statusLabel}</span>
	{#if activeCount > 0}
		<span class="job-badge">{activeCount}</span>
	{/if}

	{#if showTooltip}
		<div class="tooltip">
			{#if health.status === 'ok'}
				<div class="tooltip-row"><strong>Model:</strong> {health.model}</div>
				<div class="tooltip-row"><strong>Device:</strong> {health.device}</div>
				<div class="tooltip-row"><strong>Status:</strong> {health.model_loaded ? 'Ready' : 'Loading model...'}</div>
				{#if health.load_time_ms > 0}
					<div class="tooltip-row"><strong>Load time:</strong> {(health.load_time_ms / 1000).toFixed(1)}s</div>
				{/if}
			{:else}
				<div class="tooltip-row">Image generation service is not running.</div>
				<div class="tooltip-row" style="font-size: 0.7rem; color: #999;">Run: <code>mise run image-gen</code></div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.image-gen-status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		background: #f5f5f5;
		cursor: default;
		position: relative;
		font-size: 0.75rem;
		user-select: none;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-dot.healthy {
		background: #4caf50;
		box-shadow: 0 0 4px rgba(76, 175, 80, 0.5);
	}

	.status-dot.loading-model {
		background: #ff9800;
		animation: pulse 1.5s infinite;
	}

	.status-dot.down {
		background: #f44336;
	}

	.status-label {
		color: #555;
		font-weight: 500;
		white-space: nowrap;
	}

	.job-badge {
		background: #4a90e2;
		color: white;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0 0.35rem;
		border-radius: 8px;
		min-width: 16px;
		text-align: center;
		line-height: 16px;
	}

	.tooltip {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		background: #333;
		color: #eee;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.72rem;
		white-space: nowrap;
		z-index: 1000;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.tooltip::before {
		content: '';
		position: absolute;
		top: -4px;
		right: 12px;
		width: 8px;
		height: 8px;
		background: #333;
		transform: rotate(45deg);
	}

	.tooltip-row {
		line-height: 1.6;
	}

	.tooltip code {
		background: #555;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-family: monospace;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
