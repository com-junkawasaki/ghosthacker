<script lang="ts">
	type Props = {
		assetType: string;
		selectedAsset: unknown;
		onAddSample?: () => void;
		onAddResource?: () => void;
	};

	let { assetType, selectedAsset: _selectedAsset, onAddSample, onAddResource }: Props = $props();
	void _selectedAsset; // Will be used for asset details display

	// Mock data for demonstration
	const mockAssets = [
		{ id: '1', name: 'Music_Tokyo night p...', duration: '00:02:33', createdAt: '2025/12/09 10:36:53', durationSeconds: 153 },
		{ id: '2', name: 'Music_Beats_Ads & Tr...', duration: '00:00:19', createdAt: '2025/12/09 10:01:27', durationSeconds: 19 },
	];

	function handleDragStart(e: DragEvent, asset: typeof mockAssets[0]) {
		if (e.dataTransfer) {
			e.dataTransfer.setData('application/json', JSON.stringify({
				type: 'resource',
				assetType,
				id: asset.id,
				name: asset.name,
				duration: asset.durationSeconds || 0,
			}));
			e.dataTransfer.effectAllowed = 'copy';
			// Add visual feedback
			if (e.target instanceof HTMLElement) {
				e.target.style.opacity = '0.5';
			}
		}
	}

	function handleDragEnd(e: DragEvent) {
		if (e.target instanceof HTMLElement) {
			e.target.style.opacity = '1';
		}
	}
</script>

<div class="asset-details-panel">
	<div class="panel-header">
		<h3>
			{#if assetType === 'audio'}
				AI Music
			{:else}
				{assetType.charAt(0).toUpperCase() + assetType.slice(1)}
			{/if}
		</h3>
		<div class="header-actions">
			{#if onAddSample}
				<button class="action-button" onclick={() => onAddSample?.()}>
					<span>+</span> Sample
				</button>
			{/if}
			{#if onAddResource}
				<button class="action-button" onclick={() => onAddResource?.()}>
					<span>+</span> Resource
				</button>
			{/if}
		</div>
		<div class="search-bar">
			<input type="text" placeholder="Search..." class="search-input" />
		</div>
	</div>

	<div class="asset-list">
		{#if assetType === 'audio'}
			<table class="asset-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Duration</th>
						<th>Created</th>
					</tr>
				</thead>
				<tbody>
					{#each mockAssets as asset}
						<tr 
							class="asset-row" 
							draggable="true"
							onclick={() => selectedAsset = asset}
							ondragstart={(e) => handleDragStart(e, asset)}
							ondragend={handleDragEnd}
						>
							<td>{asset.name}</td>
							<td>{asset.duration}</td>
							<td>{asset.createdAt}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div class="empty-state">
				<p>No {assetType} assets available</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.asset-details-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #1a1a1a;
	}

	.panel-header {
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.panel-header h3 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.action-button {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		background: rgba(59, 130, 246, 0.2);
		border: 1px solid rgba(59, 130, 246, 0.4);
		border-radius: 0.25rem;
		color: #3b82f6;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-button:hover {
		background: rgba(59, 130, 246, 0.3);
		border-color: rgba(59, 130, 246, 0.6);
	}

	.action-button span {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.search-bar {
		width: 100%;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.asset-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.asset-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.asset-table thead {
		position: sticky;
		top: 0;
		background: #1a1a1a;
	}

	.asset-table th {
		padding: 0.5rem;
		text-align: left;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 600;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.asset-row {
		cursor: grab;
		transition: background 0.2s;
	}

	.asset-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.asset-row:active {
		cursor: grabbing;
	}

	.asset-table td {
		padding: 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.875rem;
	}
</style>
