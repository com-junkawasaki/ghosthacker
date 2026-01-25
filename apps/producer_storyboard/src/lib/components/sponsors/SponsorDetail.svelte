<script lang="ts">
	import SponsorHistory from './SponsorHistory.svelte';
	import type { Sponsor } from '$lib/types/sponsor';

	type Props = {
		sponsor: Sponsor;
		orgId: string;
		projectId: string;
		onClose?: () => void;
		onEdit?: () => void;
		onRefresh?: () => void;
	};

	let { sponsor, orgId, projectId, onClose, onEdit, onRefresh }: Props = $props();
</script>

<div class="sponsor-detail-overlay" onclick={onClose}>
	<div class="sponsor-detail-modal" onclick|stopPropagation>
		<div class="modal-header">
			<h2 class="modal-title">{sponsor.name}</h2>
			<button class="close-button" onclick={onClose} aria-label="Close">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
					<path d="M15 5L5 15M5 5L15 15" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>

		<div class="modal-content">
			<div class="detail-section">
				<h3 class="section-title">基本情報</h3>
				<div class="detail-grid">
					<div class="detail-item">
						<span class="detail-label">業種</span>
						<span class="detail-value">{sponsor.industry || '未設定'}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">ステータス</span>
						<span class="status-badge" data-status={sponsor.status}>
							{#if sponsor.status === 'prospect'}候補
							{:else if sponsor.status === 'contacted'}連絡済み
							{:else if sponsor.status === 'negotiating'}交渉中
							{:else if sponsor.status === 'approved'}承認済み
							{:else if sponsor.status === 'rejected'}却下
							{/if}
						</span>
					</div>
					{#if sponsor.contactEmail}
						<div class="detail-item">
							<span class="detail-label">メールアドレス</span>
							<a href="mailto:{sponsor.contactEmail}" class="detail-value link">
								{sponsor.contactEmail}
							</a>
						</div>
					{/if}
					{#if sponsor.contactPhone}
						<div class="detail-item">
							<span class="detail-label">電話番号</span>
							<a href="tel:{sponsor.contactPhone}" class="detail-value link">
								{sponsor.contactPhone}
							</a>
						</div>
					{/if}
					{#if sponsor.website}
						<div class="detail-item">
							<span class="detail-label">ウェブサイト</span>
							<a href={sponsor.website} target="_blank" rel="noopener noreferrer" class="detail-value link">
								{sponsor.website}
							</a>
						</div>
					{/if}
					{#if sponsor.address}
						<div class="detail-item full-width">
							<span class="detail-label">住所</span>
							<span class="detail-value">{sponsor.address}</span>
						</div>
					{/if}
					{#if sponsor.budgetMin || sponsor.budgetMax}
						<div class="detail-item">
							<span class="detail-label">予算</span>
							<span class="detail-value">
								{sponsor.budgetMin || '0'} - {sponsor.budgetMax || '∞'} 円
							</span>
						</div>
					{/if}
				</div>
			</div>

			{#if sponsor.notes}
				<div class="detail-section">
					<h3 class="section-title">備考</h3>
					<p class="notes-text">{sponsor.notes}</p>
				</div>
			{/if}

			<div class="detail-section">
				<h3 class="section-title">連絡履歴</h3>
				<SponsorHistory {sponsor} {orgId} {projectId} onRefresh={onRefresh} />
			</div>
		</div>

		<div class="modal-footer">
			<button class="footer-button" onclick={onEdit}>編集</button>
			<button class="footer-button secondary" onclick={onClose}>閉じる</button>
		</div>
	</div>
</div>

<style>
	.sponsor-detail-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}

	.sponsor-detail-modal {
		width: 100%;
		max-width: 800px;
		max-height: 90vh;
		background-color: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.close-button {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.close-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}

	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.detail-section {
		margin-bottom: 2rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: rgba(255, 255, 255, 0.9);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-item.full-width {
		grid-column: 1 / -1;
	}

	.detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.detail-value {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.detail-value.link {
		color: #3b82f6;
		text-decoration: none;
	}

	.detail-value.link:hover {
		text-decoration: underline;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		width: fit-content;
	}

	.status-badge[data-status="prospect"] {
		background-color: rgba(156, 163, 175, 0.2);
		color: #9ca3af;
	}

	.status-badge[data-status="contacted"] {
		background-color: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.status-badge[data-status="negotiating"] {
		background-color: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
	}

	.status-badge[data-status="approved"] {
		background-color: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.status-badge[data-status="rejected"] {
		background-color: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.notes-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.6;
		margin: 0;
		white-space: pre-wrap;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.footer-button {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.footer-button {
		background-color: #3b82f6;
		color: #ffffff;
	}

	.footer-button:hover {
		background-color: #2563eb;
	}

	.footer-button.secondary {
		background-color: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
	}

	.footer-button.secondary:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}
</style>
