<script lang="ts">
	import type { ApprovalRequest } from '$lib/types/workflow';
	import { ApprovalTypeLabels, ApprovalStatusLabels } from '$lib/types/workflow';

	interface Props {
		request: ApprovalRequest;
		onApprove?: (requestId: string, comment?: string) => void;
		onReject?: (requestId: string, comment: string) => void;
		onRequestChanges?: (requestId: string, comment: string) => void;
	}

	let { request, onApprove, onReject, onRequestChanges }: Props = $props();

	let showActions = $state(false);
	let comment = $state('');

	const statusColors: Record<string, string> = {
		submitted: '#3b82f6',
		under_review: '#f59e0b',
		request_changes: '#8b5cf6',
		approved: '#10b981',
		rejected: '#ef4444',
	};

	const statusColor = $derived(statusColors[request.status] || '#6b7280');
	const typeLabel = $derived(ApprovalTypeLabels[request.type]);
	const statusLabel = $derived(ApprovalStatusLabels[request.status]);

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function handleApprove() {
		onApprove?.(request.id, comment || undefined);
		comment = '';
		showActions = false;
	}

	function handleReject() {
		if (comment.trim()) {
			onReject?.(request.id, comment);
			comment = '';
			showActions = false;
		}
	}

	function handleRequestChanges() {
		if (comment.trim()) {
			onRequestChanges?.(request.id, comment);
			comment = '';
			showActions = false;
		}
	}

	const canReview = $derived(
		request.status === 'submitted' || request.status === 'under_review'
	);
</script>

<div class="approval-card" style="--status-color: {statusColor}">
	<div class="card-status-bar"></div>

	<div class="card-content">
		<div class="card-header">
			<div class="type-badge">
				<span class="type-ja">{typeLabel.ja}</span>
				<span class="type-en">{typeLabel.en}</span>
			</div>
			<span class="status-badge">{statusLabel.ja}</span>
		</div>

		<div class="card-body">
			<div class="info-row">
				<span class="label">リソース:</span>
				<span class="value">{request.resourceType}</span>
			</div>
			{#if request.submitterName}
				<div class="info-row">
					<span class="label">提出者:</span>
					<span class="value">{request.submitterName}</span>
				</div>
			{/if}
			<div class="info-row">
				<span class="label">提出日:</span>
				<span class="value">{formatDate(request.createdAt)}</span>
			</div>
		</div>

		{#if canReview}
			<div class="card-actions">
				{#if showActions}
					<div class="action-form">
						<textarea
							bind:value={comment}
							placeholder="コメントを入力..."
							rows="2"
						></textarea>
						<div class="action-buttons">
							<button class="btn-approve" onclick={handleApprove}>
								承認
							</button>
							<button class="btn-changes" onclick={handleRequestChanges} disabled={!comment.trim()}>
								修正依頼
							</button>
							<button class="btn-reject" onclick={handleReject} disabled={!comment.trim()}>
								却下
							</button>
							<button class="btn-cancel" onclick={() => showActions = false}>
								キャンセル
							</button>
						</div>
					</div>
				{:else}
					<button class="btn-review" onclick={() => showActions = true}>
						レビューする
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.approval-card {
		background: var(--bg-secondary, #16213e);
		border-radius: 12px;
		overflow: hidden;
		display: flex;
	}

	.card-status-bar {
		width: 4px;
		background: var(--status-color);
	}

	.card-content {
		flex: 1;
		padding: 1rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.type-badge {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.type-ja {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.type-en {
		font-size: 0.625rem;
		color: var(--text-tertiary, #6b7280);
	}

	.status-badge {
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--status-color);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.info-row {
		display: flex;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.label {
		color: var(--text-secondary, #a0a0a0);
	}

	.value {
		color: var(--text-primary, #fff);
	}

	.card-actions {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color, #2a2a4a);
	}

	.action-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-form textarea {
		width: 100%;
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--border-color, #2a2a4a);
		background: var(--bg-tertiary, #0f0f23);
		color: var(--text-primary, #fff);
		font-size: 0.75rem;
		resize: none;
	}

	.action-form textarea::placeholder {
		color: var(--text-tertiary, #6b7280);
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.action-buttons button {
		font-size: 0.75rem;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-buttons button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-approve {
		background: var(--success-color, #10b981);
		color: white;
	}

	.btn-changes {
		background: var(--warning-color, #f59e0b);
		color: white;
	}

	.btn-reject {
		background: var(--danger-color, #ef4444);
		color: white;
	}

	.btn-cancel {
		background: var(--bg-tertiary, #0f0f23);
		color: var(--text-secondary, #a0a0a0);
	}

	.btn-review {
		width: 100%;
		font-size: 0.75rem;
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px dashed var(--accent-color, #6366f1);
		background: transparent;
		color: var(--accent-color, #6366f1);
		cursor: pointer;
	}

	.btn-review:hover {
		background: var(--accent-color-alpha, rgba(99, 102, 241, 0.1));
	}
</style>
