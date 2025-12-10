<script lang="ts">
	type Props = {
		assetType: string;
		selectedAsset: any;
	};

	let { assetType, selectedAsset }: Props = $props();

	// Mock data for demonstration
	const mockAssets = [
		{ id: '1', name: 'Music_Tokyo night p...', duration: '00:02:33', createdAt: '2025/12/09 10:36:53' },
		{ id: '2', name: 'Music_Beats_Ads & Tr...', duration: '00:00:19', createdAt: '2025/12/09 10:01:27' },
	];
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
						<tr class="asset-row" onclick={() => selectedAsset = asset}>
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
		cursor: pointer;
		transition: background 0.2s;
	}

	.asset-row:hover {
		background: rgba(255, 255, 255, 0.05);
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
