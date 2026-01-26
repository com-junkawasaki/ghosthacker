<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const projectId = $derived($page.params.projectId);

	type PieceAsset = {
		id: string;
		name: string;
		description: string | null;
		imageUrl: string | null;
		category: string | null;
		tags: string[];
		createdAt: string;
	};

	let pieces = $state<PieceAsset[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showUploadDialog = $state(false);
	let isUploading = $state(false);

	// Upload form state
	let uploadName = $state('');
	let uploadDescription = $state('');
	let uploadCategory = $state('');
	let uploadFile = $state<File | null>(null);
	let uploadPreview = $state<string | null>(null);

	const pieceCategories = [
		'Decorations',
		'Plants & Nature',
		'Stationary',
		'Signs & Labels',
		'Containers',
		'Mechanical Parts',
		'Ornaments',
		'Textures',
		'Patterns',
		'UI Elements',
		'Symbols',
		'Other',
	];

	async function loadPieces() {
		if (!browser) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/pieces?projectId=${projectId}`);
			if (!response.ok) {
				throw new Error(`Failed to load pieces: ${response.statusText}`);
			}
			const data = await response.json();
			pieces = data.items || [];
		} catch (err) {
			console.error('[Pieces] Error:', err);
			error = err instanceof Error ? err.message : 'Failed to load pieces';
		} finally {
			loading = false;
		}
	}

	async function handleUpload() {
		if (!uploadFile) {
			alert('Please select an image file');
			return;
		}

		isUploading = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('file', uploadFile);
			formData.append('projectId', projectId);
			formData.append('name', uploadName.trim() || uploadFile.name);
			formData.append('description', uploadDescription.trim());
			formData.append('category', uploadCategory);

			const response = await fetch('/api/pieces', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to upload piece');
			}

			await loadPieces();

			// Reset form
			uploadName = '';
			uploadDescription = '';
			uploadCategory = '';
			uploadFile = null;
			uploadPreview = null;
			showUploadDialog = false;
		} catch (err) {
			console.error('[Pieces] Error uploading:', err);
			error = err instanceof Error ? err.message : 'Failed to upload piece';
		} finally {
			isUploading = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this piece?')) return;

		try {
			const response = await fetch(`/api/pieces/${id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete piece');
			}

			pieces = pieces.filter((item) => item.id !== id);
		} catch (err) {
			console.error('[Pieces] Error deleting:', err);
			error = err instanceof Error ? err.message : 'Failed to delete piece';
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			uploadFile = input.files[0];
			if (!uploadName) {
				uploadName = input.files[0].name.replace(/\.[^.]+$/, '');
			}
			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				uploadPreview = e.target?.result as string;
			};
			reader.readAsDataURL(input.files[0]);
		}
	}

	onMount(() => {
		loadPieces();
	});
</script>

<div class="page-layout">
	<ProjectSidebar {projectId} />
	<main class="page-content">
		<div class="manager">
			<header class="manager-header">
				<div class="header-info">
					<h1 class="page-title">Pieces</h1>
					<p class="page-subtitle">Decorative elements, small objects, and scene details</p>
				</div>
				<div class="header-actions">
					<button class="btn btn-primary" onclick={() => (showUploadDialog = true)}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path d="M8 2v8M4 6l4-4 4 4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						Upload Piece
					</button>
				</div>
			</header>

			{#if error}
				<div class="error-banner">
					<span>{error}</span>
					<button onclick={() => (error = null)}>✕</button>
				</div>
			{/if}

			{#if loading}
				<div class="loading-state">
					<div class="spinner"></div>
					<p>Loading pieces...</p>
				</div>
			{:else if pieces.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor">
							<path d="M20 16h8a4 4 0 014 4v4a8 8 0 1016 0v-4a4 4 0 014-4h4a4 4 0 014 4v8a8 8 0 110 16h4a4 4 0 014 4v4a4 4 0 01-4 4h-8a8 8 0 11-16 0H28a4 4 0 01-4-4v-4a8 8 0 110-16h-4a4 4 0 01-4-4v-8a4 4 0 014-4z" stroke-width="2" stroke-linejoin="round"/>
						</svg>
					</div>
					<h2>No pieces yet</h2>
					<p>Upload decorative pieces - small objects, textures, and scene details.</p>
					<button class="btn btn-primary" onclick={() => (showUploadDialog = true)}>
						Upload Piece
					</button>
				</div>
			{:else}
				<div class="image-grid">
					{#each pieces as item (item.id)}
						<div class="image-card">
							<div class="image-preview">
								{#if item.imageUrl}
									<img src={item.imageUrl} alt={item.name} />
								{:else}
									<div class="placeholder">🧩</div>
								{/if}
							</div>
							<div class="card-info">
								<div class="item-details">
									<span class="item-name">{item.name}</span>
									{#if item.category}
										<span class="item-category">{item.category}</span>
									{/if}
								</div>
								<button
									class="delete-btn"
									onclick={() => handleDelete(item.id)}
									aria-label="Delete"
								>
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
										<path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M12 4v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4" stroke-width="1.5" stroke-linecap="round" />
									</svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<!-- Upload Dialog -->
{#if showUploadDialog}
	<div
		class="dialog-overlay"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => e.target === e.currentTarget && (showUploadDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showUploadDialog = false)}
	>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<div class="dialog-header">
				<h2>Upload Piece</h2>
				<button class="close-btn" onclick={() => (showUploadDialog = false)}>✕</button>
			</div>
			<div class="dialog-content">
				<div class="form-group">
					<label for="upload-file">Image File *</label>
					<input
						id="upload-file"
						type="file"
						accept="image/*"
						onchange={handleFileSelect}
						disabled={isUploading}
					/>
					{#if uploadPreview}
						<div class="upload-preview">
							<img src={uploadPreview} alt="Preview" />
						</div>
					{/if}
				</div>
				<div class="form-group">
					<label for="upload-name">Name</label>
					<input
						id="upload-name"
						type="text"
						bind:value={uploadName}
						placeholder="Enter a name"
						disabled={isUploading}
					/>
				</div>
				<div class="form-group">
					<label for="upload-category">Category</label>
					<select
						id="upload-category"
						bind:value={uploadCategory}
						disabled={isUploading}
					>
						<option value="">Select a category</option>
						{#each pieceCategories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="upload-desc">Description</label>
					<textarea
						id="upload-desc"
						bind:value={uploadDescription}
						placeholder="Optional description"
						rows="2"
						disabled={isUploading}
					></textarea>
				</div>
			</div>
			<div class="dialog-actions">
				<button class="btn btn-secondary" onclick={() => (showUploadDialog = false)} disabled={isUploading}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={handleUpload}
					disabled={!uploadFile || isUploading}
				>
					{isUploading ? 'Uploading...' : 'Upload'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-layout {
		display: flex;
		min-height: 100vh;
		background: #0a0a0a;
	}

	.page-content {
		flex: 1;
		overflow-y: auto;
	}

	.manager {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}

	.header-info {
		flex: 1;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0 0 0.25rem;
	}

	.page-subtitle {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		border: none;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #ef4444;
		margin-bottom: 1.5rem;
	}

	.error-banner button {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.7);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-icon {
		margin-bottom: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.empty-state h2 {
		font-size: 1.25rem;
		margin: 0 0 0.5rem;
		color: white;
	}

	.empty-state p {
		margin: 0 0 1.5rem;
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
	}

	.image-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		overflow: hidden;
		transition: all 0.2s;
	}

	.image-card:hover {
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
	}

	.image-preview {
		aspect-ratio: 1;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder {
		font-size: 2.5rem;
		opacity: 0.3;
	}

	.card-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.625rem;
		gap: 0.5rem;
	}

	.item-details {
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-size: 0.8125rem;
		color: white;
		font-weight: 500;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-category {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.5);
		display: block;
	}

	.delete-btn {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 4px;
		color: white;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.delete-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	/* Dialog styles */
	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.dialog {
		background: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.dialog-header h2 {
		margin: 0;
		font-size: 1.125rem;
		color: white;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 1.25rem;
		cursor: pointer;
	}

	.dialog-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
	}

	.form-group input,
	.form-group textarea,
	.form-group select {
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		color: white;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.upload-preview {
		margin-top: 0.5rem;
		border-radius: 6px;
		overflow: hidden;
	}

	.upload-preview img {
		width: 100%;
		max-height: 200px;
		object-fit: cover;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>

