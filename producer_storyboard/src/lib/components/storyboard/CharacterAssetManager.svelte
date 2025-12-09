<script lang="ts">
	import { browser } from '$app/environment';
	import { ListCharacterAssetsStore } from '../../../../.houdini/plugins/houdini-svelte/stores/ListCharacterAssets.js';
	import { UploadCharacterAssetStore } from '../../../../.houdini/plugins/houdini-svelte/stores/UploadCharacterAsset.js';
	import { DeleteCharacterAssetStore } from '../../../../.houdini/plugins/houdini-svelte/stores/DeleteCharacterAsset.js';

	type Props = {
		characterId: string;
		onAssetChange?: () => void;
	};

	let { characterId, onAssetChange = () => {} }: Props = $props();

	type CharacterAsset = {
		id: string;
		assetType: string;
		assetFormat: string | null;
		createdAt: string;
		updatedAt: string;
	};

	let assets = $state<CharacterAsset[]>([]);
	let loading = $state(false);
	let uploading = $state(false);
	let error = $state<string | null>(null);
	let dragOver = $state(false);

	let listCharacterAssetsStore: ListCharacterAssetsStore | null = null;
	let uploadCharacterAssetStore: UploadCharacterAssetStore | null = null;
	let deleteCharacterAssetStore: DeleteCharacterAssetStore | null = null;

	if (browser) {
		listCharacterAssetsStore = new ListCharacterAssetsStore();
		uploadCharacterAssetStore = new UploadCharacterAssetStore();
		deleteCharacterAssetStore = new DeleteCharacterAssetStore();
	}

	async function loadAssets() {
		if (!browser || !listCharacterAssetsStore || !characterId) return;

		try {
			loading = true;
			error = null;
			const result = await listCharacterAssetsStore.fetch({ variables: { characterId } });
			if (result?.data?.characterAssets) {
				assets = result.data.characterAssets as CharacterAsset[];
			}
		} catch (err) {
			console.error('[CharacterAssetManager] Error loading assets:', err);
			error = err instanceof Error ? err.message : 'Failed to load assets';
		} finally {
			loading = false;
		}
	}

	async function uploadAsset(file: File, assetType: 'image' | 'audio') {
		if (!browser || !uploadCharacterAssetStore || !characterId) return;

		try {
			uploading = true;
			error = null;

			// Validate file type
			if (assetType === 'image' && !file.type.startsWith('image/')) {
				throw new Error('File must be an image');
			}
			if (assetType === 'audio' && !file.type.startsWith('audio/')) {
				throw new Error('File must be an audio file');
			}

			// Read file as base64
			const reader = new FileReader();
			const base64Promise = new Promise<string>((resolve, reject) => {
				reader.onload = () => {
					const result = reader.result as string;
					// Keep data URL format for better format detection
					resolve(result);
				};
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});

			const assetData = await base64Promise;
			
			// Determine asset format from file type
			const assetFormat = file.type.split('/')[1] || (assetType === 'image' ? 'png' : 'mp3');
			
			const result = await uploadCharacterAssetStore.mutate({
				input: {
					characterId,
					assetData,
					assetType,
					assetFormat,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			await loadAssets();
			onAssetChange();
		} catch (err) {
			console.error('[CharacterAssetManager] Error uploading asset:', err);
			error = err instanceof Error ? err.message : 'Failed to upload asset';
		} finally {
			uploading = false;
		}
	}

	async function deleteAsset(assetId: string) {
		if (!browser || !deleteCharacterAssetStore) return;
		if (!confirm('Are you sure you want to delete this asset?')) return;

		try {
			const result = await deleteCharacterAssetStore.mutate({ assetId });

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			await loadAssets();
			onAssetChange();
		} catch (err) {
			console.error('[CharacterAssetManager] Error deleting asset:', err);
			error = err instanceof Error ? err.message : 'Failed to delete asset';
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
		dragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragOver = false;

		if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
			return;
		}

		const file = e.dataTransfer.files[0];
		if (file.type.startsWith('image/')) {
			await uploadAsset(file, 'image');
		} else if (file.type.startsWith('audio/')) {
			await uploadAsset(file, 'audio');
		} else {
			alert('Please drop an image or audio file');
		}
	}

	function handleFileInputChange(e: Event, assetType: 'image' | 'audio') {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			if (file) {
				uploadAsset(file, assetType);
				target.value = '';
			}
		}
	}

	function getAssetUrl(assetId: string): string {
		return `/api/character-assets/${assetId}`;
	}

	$effect(() => {
		if (browser && characterId) {
			loadAssets();
		}
	});
</script>

<div class="character-asset-manager">
	<h4>Assets</h4>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div
		class="upload-area"
		class:drag-over={dragOver}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		<div class="upload-buttons">
			<label class="upload-button" role="button" tabindex="0">
				<input
					type="file"
					accept="image/*"
					style="display: none;"
					disabled={uploading}
					onchange={(e) => handleFileInputChange(e, 'image')}
				/>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M8 3V13M3 8H13" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				Upload Image
			</label>
			<label class="upload-button" role="button" tabindex="0">
				<input
					type="file"
					accept="audio/*"
					style="display: none;"
					disabled={uploading}
					onchange={(e) => handleFileInputChange(e, 'audio')}
				/>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M8 3V13M3 8H13" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				Upload Audio
			</label>
		</div>
		<p class="upload-hint">Or drag and drop files here</p>
	</div>

	{#if loading}
		<div class="loading">Loading assets...</div>
	{:else if assets.length === 0}
		<div class="empty">No assets uploaded yet</div>
	{:else}
		<div class="assets-grid">
			{#each assets as asset (asset.id)}
				<div class="asset-item">
					{#if asset.assetType === 'image'}
						<img
							src={getAssetUrl(asset.id)}
							alt="Character asset"
							class="asset-preview"
						/>
					{:else}
						<div class="audio-preview">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<path d="M9 18V5L21 3V16M9 18C9 19.1046 8.10457 20 7 20C5.89543 20 5 19.1046 5 18C5 16.8954 5.89543 16 7 16C7.35064 16 7.68722 16.0602 8 16.1707M21 16C21 17.1046 20.1046 18 19 18C17.8954 18 17 17.1046 17 16C17 14.8954 17.8954 14 19 14C19.3506 14 19.6872 14.0602 20 14.1707" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<span>Audio ({asset.assetFormat || 'unknown'})</span>
						</div>
					{/if}
					<button
						class="delete-button"
						onclick={() => deleteAsset(asset.id)}
						aria-label="Delete asset"
					>
						✕
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.character-asset-manager {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.character-asset-manager h4 {
		margin: 0 0 0.75rem 0;
		color: white;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.error {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
		padding: 0.5rem;
		border-radius: 0.25rem;
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
	}

	.upload-area {
		border: 2px dashed rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		padding: 1rem;
		text-align: center;
		margin-bottom: 1rem;
		transition: border-color 0.2s;
	}

	.upload-area.drag-over {
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
	}

	.upload-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 0.5rem;
	}

	.upload-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		color: white;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background 0.2s;
	}

	.upload-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.upload-hint {
		margin: 0;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.75rem;
	}

	.loading,
	.empty {
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
		padding: 1rem;
		font-size: 0.875rem;
	}

	.assets-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.75rem;
	}

	.asset-item {
		position: relative;
		aspect-ratio: 1;
		border-radius: 0.25rem;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.3);
	}

	.asset-preview {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.audio-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.75rem;
	}

	.delete-button {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		background: rgba(0, 0, 0, 0.7);
		border: none;
		border-radius: 50%;
		width: 1.5rem;
		height: 1.5rem;
		color: white;
		cursor: pointer;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.delete-button:hover {
		background: rgba(239, 68, 68, 0.8);
	}
</style>

