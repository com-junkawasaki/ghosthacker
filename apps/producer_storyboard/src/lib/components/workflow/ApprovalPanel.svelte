<script lang="ts">
	import ApprovalRequestCard from './ApprovalRequestCard.svelte';
	import type { ApprovalRequest, ApprovalStatus, ApprovalType } from '$lib/types/workflow';
	import { ApprovalTypeLabels, ApprovalStatusLabels } from '$lib/types/workflow';

	interface Props {
		requests: ApprovalRequest[];
		projectId: string;
		onApprove?: (requestId: string, comment?: string) => void;
		onReject?: (requestId: string, comment: string) => void;
		onRequestChanges?: (requestId: string, comment: string) => void;
	}

	let { 
		requests = [], 
		projectId, 
		onApprove, 
		onReject, 
		onRequestChanges 
	}: Props = $props();

	let filterType = $state<ApprovalType | 'all'>('all');
	let filterStatus = $state<ApprovalStatus | 'all'>('all');

	const filteredRequests = $derived(
		requests.filter(req => {
			if (filterType !== 'all' && req.type !== filterType) return false;
			if (filterStatus !== 'all' && req.status !== filterStatus) return false;
			return true;
		})
	);

	const pendingCount = $derived(
		requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length
	);

	const approvalTypes: ApprovalType[] = ['script', 'storyboard', 'key_animation', 'audio_mix', 'final_cut'];
	const approvalStatuses: ApprovalStatus[] = ['submitted', 'under_review', 'request_changes', 'approved', 'rejected'];
</script>

<div class="approval-panel">
	<header class="panel-header">
		<div class="header-title">
			<h2>承認リクエスト / Approval Requests</h2>
			{#if pendingCount > 0}
				<span class="pending-badge">{pendingCount}件の保留中</span>
			{/if}
		</div>

		<div class="filters">
			<select bind:value={filterType}>
				<option value="all">全タイプ</option>
				{#each approvalTypes as type}
					<option value={type}>{ApprovalTypeLabels[type].ja}</option>
				{/each}
			</select>

			<select bind:value={filterStatus}>
				<option value="all">全ステータス</option>
				{#each approvalStatuses as status}
					<option value={status}>{ApprovalStatusLabels[status].ja}</option>
				{/each}
			</select>
		</div>
	</header>

	<div class="requests-list">
		{#each filteredRequests as request}
			<ApprovalRequestCard
				{request}
				{onApprove}
				{onReject}
				{onRequestChanges}
			/>
		{:else}
			<p class="no-requests">
				{#if filterType !== 'all' || filterStatus !== 'all'}
					フィルタ条件に一致するリクエストがありません
				{:else}
					承認リクエストがありません
				{/if}
			</p>
		{/each}
	</div>
</div>

<style>
	.approval-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary, #1a1a2e);
		padding: 1.5rem;
	}

	.panel-header {
		margin-bottom: 1.5rem;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.header-title h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
		margin: 0;
	}

	.pending-badge {
		background: var(--warning-color, #f59e0b);
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
	}

	.filters {
		display: flex;
		gap: 0.75rem;
	}

	.filters select {
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		border: 1px solid var(--border-color, #2a2a4a);
		background: var(--bg-secondary, #16213e);
		color: var(--text-primary, #fff);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.filters select:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.requests-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.no-requests {
		text-align: center;
		padding: 3rem;
		color: var(--text-secondary, #a0a0a0);
		font-size: 0.875rem;
		margin: 0;
	}
</style>
