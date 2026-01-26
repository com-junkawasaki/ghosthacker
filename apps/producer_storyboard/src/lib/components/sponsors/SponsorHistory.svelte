<script lang="ts">
	import type { Sponsor, SponsorHistory as SponsorHistoryType } from '$lib/types/sponsor';

	type Props = {
		sponsor: Sponsor;
		orgId: string;
		projectId: string;
		onRefresh?: () => void;
	};

	let { sponsor, orgId, projectId, onRefresh }: Props = $props();

	let history = $state<SponsorHistoryType[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showAddForm = $state(false);

	async function loadHistory() {
		try {
			loading = true;
			error = null;

			const response = await fetch(`/api/sponsors/${sponsor.id}/history`, {
				headers: {
					'X-Org-Id': orgId,
				},
			});

			if (!response.ok) {
				throw new Error('Failed to load history');
			}

			const data = await response.json();
			history = data.history || [];
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load history';
			loading = false;
		}
	}

	async function handleAddContact() {
		try {
			const response = await fetch(`/api/sponsors/${sponsor.id}/contact`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					contactMethod: 'email',
					description: '連絡を記録',
					contactDate: new Date().toISOString(),
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to add contact');
			}

			showAddForm = false;
			loadHistory();
			onRefresh?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add contact';
		}
	}

	$effect(() => {
		loadHistory();
	});
</script>

<div class="history-container">
	<div class="history-header">
		<button class="add-button" onclick={handleAddContact} disabled={loading}>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
				<path d="M8 3V13M3 8H13" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
			連絡を記録
		</button>
	</div>

	{#if loading}
		<div class="loading">読み込み中...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if history.length === 0}
		<div class="empty">履歴がありません</div>
	{:else}
		<div class="history-list">
			{#each history as item (item.id)}
				<div class="history-item">
					<div class="history-header-item">
						<span class="event-type" data-type={item.eventType}>
							{#if item.eventType === 'contact'}連絡
							{:else if item.eventType === 'meeting'}会議
							{:else if item.eventType === 'proposal'}提案
							{:else if item.eventType === 'response'}返答
							{:else if item.eventType === 'status_change'}ステータス変更
							{/if}
						</span>
						<span class="event-date">
							{new Date(item.eventDate).toLocaleDateString('ja-JP')}
						</span>
					</div>
					{#if item.description}
						<p class="history-description">{item.description}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.history-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.history-header {
		display: flex;
		justify-content: flex-end;
	}

	.add-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 6px;
		color: #3b82f6;
		font-size: 0.813rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-button:hover:not(:disabled) {
		background-color: rgba(59, 130, 246, 0.2);
		border-color: rgba(59, 130, 246, 0.5);
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading,
	.error,
	.empty {
		padding: 2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.875rem;
	}

	.error {
		color: #ef4444;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.history-item {
		padding: 0.75rem;
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
	}

	.history-header-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.event-type {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.event-type[data-type="contact"] {
		background-color: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.event-type[data-type="meeting"] {
		background-color: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
	}

	.event-type[data-type="proposal"] {
		background-color: rgba(139, 92, 246, 0.2);
		color: #8b5cf6;
	}

	.event-type[data-type="response"] {
		background-color: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.event-type[data-type="status_change"] {
		background-color: rgba(156, 163, 175, 0.2);
		color: #9ca3af;
	}

	.event-date {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.history-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
		line-height: 1.5;
	}
</style>
