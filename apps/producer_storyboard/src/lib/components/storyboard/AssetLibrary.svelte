<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	type Props = {
		projectId: string;
		open?: boolean;
	};

	let { projectId, open = $bindable(true) }: Props = $props();

	type ProjectAsset = {
		id: string;
		projectId: string;
		assetType: string;
		assetFormat: string | null;
		filename: string | null;
		description: string | null;
		tags: string[];
		metadata: string | null;
		createdAt: string;
		updatedAt: string;
	};

	let assets = $state<ProjectAsset[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let selectedAssetType = $state<string>('all');
	let searchQuery = $state('');
	let uploading = $state(false);
	let dragOver = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	const orgId = $derived($page.params.orgId);

	const assetTypes = [
		{ id: 'all', label: 'All' },
		{ id: 'image', label: 'Images' },
		{ id: 'video', label: 'Videos' },
		{ id: 'audio', label: 'Audio' },
		{ id: 'document', label: 'Documents' },
	];

	async function loadAssets() {
		if (!browser || !projectId) return;

		try {
			loading = true;
			error = null;
			const params = new URLSearchParams({ projectId });
			if (selectedAssetType !== 'all') {
				params.append('assetType', selectedAssetType);
			}
			
			const response = await fetch(`/api/project-assets?${params.toString()}`, {
				headers: {
					'X-Org-Id': orgId || '',
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load assets: ${response.statusText}`);
			}
			
			const result = await response.json();
			if (result?.assets) {
				assets = result.assets as ProjectAsset[];
			}
		} catch (err) {
			console.error('[AssetLibrary] Error loading assets:', err);
			error = err instanceof Error ? err.message : 'Failed to load assets';
		} finally {
			loading = false;
		}
	}

	async function uploadAsset(file: File) {
		if (!browser || !projectId) return;

		try {
			uploading = true;
			error = null;

			// Determine asset type from file
			const assetType = file.type.startsWith('image/') ? 'image' :
				file.type.startsWith('video/') ? 'video' :
				file.type.startsWith('audio/') ? 'audio' : 'document';

			// Read file as base64
			const reader = new FileReader();
			const base64Promise = new Promise<string>((resolve, reject) => {
				reader.onload = () => {
					const result = reader.result as string;
					// Remove data URL prefix
					const base64 = result.split(',')[1] || result;
					resolve(base64);
				};
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});

			const assetDataBase64 = await base64Promise;
			const assetFormat = file.type.split('/')[1] || null;

			const response = await fetch('/api/project-assets', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					projectId,
					assetType,
					assetDataBase64,
					assetFormat,
					filename: file.name,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to upload asset');
			}

			await loadAssets();
		} catch (err) {
			console.error('[AssetLibrary] Error uploading asset:', err);
			error = err instanceof Error ? err.message : 'Failed to upload asset';
		} finally {
			uploading = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			uploadAsset(files[0]);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			uploadAsset(files[0]);
		}
	}

	const filteredAssets = $derived.by(() => {
		if (!searchQuery) return assets;
		const query = searchQuery.toLowerCase();
		return assets.filter(asset => 
			asset.filename?.toLowerCase().includes(query) ||
			asset.description?.toLowerCase().includes(query) ||
			asset.tags.some(tag => tag.toLowerCase().includes(query))
		);
	});

	const isModal = $derived(open === true && browser);

	$effect(() => {
		if (projectId) {
			loadAssets();
		}
	});
</script>

{#if open}
	<div 
		class="asset-library-wrapper" 
		class:modal-overlay={isModal}
		role="dialog"
		tabindex="-1"
		aria-modal={isModal}
		aria-labelledby="asset-library-title"
		onclick={(e) => {
			if (isModal && e.target === e.currentTarget) {
				open = false;
			}
		}}
		onkeydown={(e) => {
			if (isModal && e.key === 'Escape') {
				open = false;
			}
		}}
	>
		<div class="asset-library-container" onclick={(e) => e.stopPropagation()}>
			<div class="header">
				<h2 id="asset-library-title">Media Library</h2>
				{#if isModal}
					<button type="button" class="close-button" onclick={() => open = false}>✕</button>
				{/if}
			</div>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			<div class="controls">
				<div class="filter-tabs">
					{#each assetTypes as type}
						<button
							type="button"
							class="filter-tab"
							class:active={selectedAssetType === type.id}
							onclick={() => {
								selectedAssetType = type.id;
								loadAssets();
							}}
						>
							{type.label}
						</button>
					{/each}
				</div>

				<div class="search-box">
					<input
						type="text"
						placeholder="Search assets..."
						bind:value={searchQuery}
						class="search-input"
					/>
				</div>

				<button
					type="button"
					class="upload-button"
					onclick={() => fileInputRef?.click()}
					disabled={uploading}
				>
					{uploading ? 'Uploading...' : '+ Upload Asset'}
				</button>
				<input
					type="file"
					bind:this={fileInputRef}
					onchange={handleFileSelect}
					style="display: none;"
					accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
				/>
			</div>

			<div
				class="drop-zone"
				class:drag-over={dragOver}
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
			>
				{#if loading}
					<div class="loading">Loading assets...</div>
				{:else if filteredAssets.length === 0}
					<div class="empty-state">
						<p>No assets found. Drag and drop files here or click "Upload Asset" to add assets.</p>
					</div>
				{:else}
					<div class="asset-grid">
						{#each filteredAssets as asset (asset.id)}
							<div class="asset-item">
								{#if asset.assetType === 'image'}
									<img
										src={`/api/project-assets/${asset.id}?data=true`}
										alt={asset.filename || 'Asset'}
										class="asset-preview"
									/>
								{:else}
									<div class="asset-placeholder">
										{asset.assetType === 'video' ? '🎬' : asset.assetType === 'audio' ? '🎵' : '📄'}
									</div>
								{/if}
								<div class="asset-info">
									<div class="asset-filename">{asset.filename || 'Untitled'}</div>
									{#if asset.description}
										<div class="asset-description">{asset.description}</div>
									{/if}
									{#if asset.tags.length > 0}
										<div class="asset-tags">
											{#each asset.tags as tag}
												<span class="tag">{tag}</span>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.asset-library-wrapper {
		width: 100%;
	}

	.asset-library-wrapper.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.asset-library-container {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 1200px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.asset-library-wrapper.modal-overlay .asset-library-container {
		max-height: 80vh;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.header h2 {
		margin: 0;
		color: white;
	}

	.close-button {
		background: none;
		border: none;
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.error {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
		padding: 0.75rem;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.filter-tabs {
		display: flex;
		gap: 0.5rem;
	}

	.filter-tab {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.filter-tab:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.filter-tab.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.search-box {
		flex: 1;
		min-width: 200px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.upload-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background 0.2s;
	}

	.upload-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.upload-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.drop-zone {
		min-height: 400px;
		border: 2px dashed rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		padding: 2rem;
		transition: all 0.2s;
	}

	.drop-zone.drag-over {
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
	}

	.loading,
	.empty-state {
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		padding: 2rem;
	}

	.asset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.asset-item {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.25rem;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s;
	}

	.asset-item:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-2px);
	}

	.asset-preview,
	.asset-placeholder {
		width: 100%;
		height: 150px;
		object-fit: cover;
		background: rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
	}

	.asset-info {
		padding: 0.75rem;
	}

	.asset-filename {
		font-weight: 500;
		color: white;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.asset-description {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.75rem;
		margin-bottom: 0.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.asset-tags {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.tag {
		background: rgba(59, 130, 246, 0.2);
		color: #93c5fd;
		padding: 0.125rem 0.5rem;
		border-radius: 0.125rem;
		font-size: 0.625rem;
	}
</style>
