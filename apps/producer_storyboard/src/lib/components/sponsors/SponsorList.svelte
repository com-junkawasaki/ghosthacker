<script lang="ts">
	import SponsorForm from './SponsorForm.svelte';
	import SponsorDetail from './SponsorDetail.svelte';
	import type { Sponsor } from '$lib/types/sponsor';

	type Props = {
		sponsors: Sponsor[];
		orgId: string;
		projectId: string;
		mode?: 'list' | 'create' | 'edit';
		onCreated?: () => void;
		onCancel?: () => void;
		onRefresh?: () => void;
	};

	let {
		sponsors,
		orgId,
		projectId,
		mode = 'list',
		onCreated,
		onCancel,
		onRefresh,
	}: Props = $props();

	let selectedSponsor = $state<Sponsor | null>(null);
	let editingSponsor = $state<Sponsor | null>(null);
	let searchQuery = $state('');
	let statusFilter = $state<string>('all');
	let industryFilter = $state<string>('all');

	const filteredSponsors = $derived.by(() => {
		return sponsors.filter((sponsor) => {
			if (searchQuery && !sponsor.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!sponsor.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())) {
				return false;
			}
			if (statusFilter !== 'all' && sponsor.status !== statusFilter) {
				return false;
			}
			if (industryFilter !== 'all' && sponsor.industry !== industryFilter) {
				return false;
			}
			return true;
		});
	});

	const industries = $derived.by(() => {
		const unique = new Set(sponsors.map((s) => s.industry).filter(Boolean));
		return Array.from(unique).sort();
	});

	function handleSelect(sponsor: Sponsor) {
		selectedSponsor = sponsor;
		editingSponsor = null;
	}

	function handleEdit(sponsor: Sponsor) {
		editingSponsor = sponsor;
		selectedSponsor = null;
	}

	function handleClose() {
		selectedSponsor = null;
		editingSponsor = null;
	}

	function handleSaved() {
		handleClose();
		onRefresh?.();
	}
</script>

{#if mode === 'create'}
	<SponsorForm
		{orgId}
		{projectId}
		onSaved={() => {
			onCreated?.();
		}}
		onCancel={onCancel}
	/>
{:else if editingSponsor}
	<SponsorForm
		{orgId}
		{projectId}
		sponsor={editingSponsor}
		onSaved={handleSaved}
		onCancel={handleClose}
	/>
{:else}
	<div class="sponsor-list-container">
		<div class="filters">
			<div class="search-box">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<circle cx="7" cy="7" r="5" stroke-width="1.5"/>
					<path d="M11 11L14 14" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				<input
					type="text"
					placeholder="スポンサー名またはメールアドレスで検索..."
					bind:value={searchQuery}
					class="search-input"
				/>
			</div>
			<select bind:value={statusFilter} class="filter-select">
				<option value="all">すべてのステータス</option>
				<option value="prospect">候補</option>
				<option value="contacted">連絡済み</option>
				<option value="negotiating">交渉中</option>
				<option value="approved">承認済み</option>
				<option value="rejected">却下</option>
			</select>
			<select bind:value={industryFilter} class="filter-select">
				<option value="all">すべての業種</option>
				{#each industries as industry}
					<option value={industry}>{industry}</option>
				{/each}
			</select>
		</div>

		<div class="sponsor-grid">
			{#each filteredSponsors as sponsor (sponsor.id)}
				<div class="sponsor-card" onclick={() => handleSelect(sponsor)}>
					<div class="sponsor-header">
						<h3 class="sponsor-name">{sponsor.name}</h3>
						<span class="status-badge" data-status={sponsor.status}>
							{#if sponsor.status === 'prospect'}候補
							{:else if sponsor.status === 'contacted'}連絡済み
							{:else if sponsor.status === 'negotiating'}交渉中
							{:else if sponsor.status === 'approved'}承認済み
							{:else if sponsor.status === 'rejected'}却下
							{/if}
						</span>
					</div>
					{#if sponsor.industry}
						<p class="sponsor-industry">{sponsor.industry}</p>
					{/if}
					{#if sponsor.contactEmail}
						<p class="sponsor-contact">{sponsor.contactEmail}</p>
					{/if}
					{#if sponsor.budgetMin || sponsor.budgetMax}
						<p class="sponsor-budget">
							予算: {sponsor.budgetMin || '0'} - {sponsor.budgetMax || '∞'} 円
						</p>
					{/if}
					<div class="sponsor-actions">
						<button
							class="action-button"
							onclick|stopPropagation={() => handleEdit(sponsor)}
						>
							編集
						</button>
					</div>
				</div>
			{:else}
				<div class="empty-state">
					<p>スポンサーが見つかりません</p>
				</div>
			{/each}
		</div>
	</div>

	{#if selectedSponsor}
		<SponsorDetail
			sponsor={selectedSponsor}
			{orgId}
			{projectId}
			onClose={handleClose}
			onEdit={() => handleEdit(selectedSponsor)}
			onRefresh={onRefresh}
		/>
	{/if}
{/if}

<style>
	.sponsor-list-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.filters {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.search-box {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background-color: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
	}

	.search-box svg {
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: none;
		border: none;
		color: #ffffff;
		font-size: 0.875rem;
		outline: none;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		background-color: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #ffffff;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.sponsor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.sponsor-card {
		padding: 1rem;
		background-color: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.sponsor-card:hover {
		background-color: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.sponsor-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.sponsor-name {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		flex: 1;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
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

	.sponsor-industry,
	.sponsor-contact,
	.sponsor-budget {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0.25rem 0;
	}

	.sponsor-actions {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		gap: 0.5rem;
	}

	.action-button {
		padding: 0.375rem 0.75rem;
		background-color: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 4px;
		color: #3b82f6;
		font-size: 0.813rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-button:hover {
		background-color: rgba(59, 130, 246, 0.2);
		border-color: rgba(59, 130, 246, 0.5);
	}

	.empty-state {
		grid-column: 1 / -1;
		padding: 3rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
	}
</style>
