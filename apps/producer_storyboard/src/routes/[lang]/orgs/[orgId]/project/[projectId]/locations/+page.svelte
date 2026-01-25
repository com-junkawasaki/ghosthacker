<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const projectId = $derived($page.params.projectId);

	type LocationItem = {
		id: string;
		name: string;
		description: string | null;
		imageUrl: string | null;
		locationType: string | null;
		address: string | null;
		tags: string[];
		createdAt: string;
	};

	let locations = $state<LocationItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateDialog = $state(false);
	let isCreating = $state(false);

	// Form state
	let formName = $state('');
	let formDescription = $state('');
	let formLocationType = $state('');
	let formAddress = $state('');
	let formFile = $state<File | null>(null);
	let formPreview = $state<string | null>(null);

	const locationTypes = [
		'Indoor',
		'Outdoor',
		'Urban',
		'Rural',
		'Fantasy',
		'Sci-Fi',
		'Historical',
		'Modern',
		'Underground',
		'Aerial',
		'Other',
	];

	async function loadLocations() {
		if (!browser) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/locations?projectId=${projectId}`);
			if (!response.ok) {
				throw new Error(`Failed to load locations: ${response.statusText}`);
			}
			const data = await response.json();
			locations = data.items || [];
		} catch (err) {
			console.error('[Locations] Error:', err);
			error = err instanceof Error ? err.message : 'Failed to load locations';
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		if (!formName.trim()) {
			alert('Please enter a name');
			return;
		}

		isCreating = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('projectId', projectId);
			formData.append('name', formName.trim());
			formData.append('description', formDescription.trim());
			formData.append('locationType', formLocationType);
			formData.append('address', formAddress.trim());
			if (formFile) {
				formData.append('file', formFile);
			}

			const response = await fetch('/api/locations', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create location');
			}

			await loadLocations();
			resetForm();
			showCreateDialog = false;
		} catch (err) {
			console.error('[Locations] Error creating:', err);
			error = err instanceof Error ? err.message : 'Failed to create location';
		} finally {
			isCreating = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this location?')) return;

		try {
			const response = await fetch(`/api/locations/${id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete location');
			}

			locations = locations.filter((item) => item.id !== id);
		} catch (err) {
			console.error('[Locations] Error deleting:', err);
			error = err instanceof Error ? err.message : 'Failed to delete location';
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			formFile = input.files[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				formPreview = e.target?.result as string;
			};
			reader.readAsDataURL(input.files[0]);
		}
	}

	function resetForm() {
		formName = '';
		formDescription = '';
		formLocationType = '';
		formAddress = '';
		formFile = null;
		formPreview = null;
	}

	onMount(() => {
		loadLocations();
	});
</script>

<div class="page-layout">
	<ProjectSidebar {projectId} />
	<main class="page-content">
		<div class="manager">
			<header class="manager-header">
				<h1 class="page-title">Locations</h1>
				<div class="header-actions">
					<button class="btn btn-primary" onclick={() => (showCreateDialog = true)}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path d="M8 2v12M2 8h12" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						New Location
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
					<p>Loading locations...</p>
				</div>
			{:else if locations.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor">
							<path d="M32 56S48 40 48 26A16 16 0 0016 26c0 14 16 30 16 30z" stroke-width="2"/>
							<circle cx="32" cy="26" r="6" stroke-width="2"/>
						</svg>
					</div>
					<h2>No locations yet</h2>
					<p>Create locations to use in your scenes and storyboards.</p>
					<button class="btn btn-primary" onclick={() => (showCreateDialog = true)}>
						Create Location
					</button>
				</div>
			{:else}
				<div class="card-grid">
					{#each locations as item (item.id)}
						<div class="location-card">
							<div class="card-preview">
								{#if item.imageUrl}
									<img src={item.imageUrl} alt={item.name} />
								{:else}
									<div class="placeholder">📍</div>
								{/if}
								{#if item.locationType}
									<span class="type-badge">{item.locationType}</span>
								{/if}
							</div>
							<div class="card-info">
								<div class="item-details">
									<span class="item-name">{item.name}</span>
									{#if item.description}
										<span class="item-desc">{item.description}</span>
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

<!-- Create Dialog -->
{#if showCreateDialog}
	<div
		class="dialog-overlay"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => e.target === e.currentTarget && (showCreateDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showCreateDialog = false)}
	>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<div class="dialog-header">
				<h2>New Location</h2>
				<button class="close-btn" onclick={() => (showCreateDialog = false)}>✕</button>
			</div>
			<div class="dialog-content">
				<div class="form-group">
					<label for="form-name">Name *</label>
					<input
						id="form-name"
						type="text"
						bind:value={formName}
						placeholder="e.g., Tokyo Station, Forest Clearing"
						disabled={isCreating}
					/>
				</div>
				<div class="form-group">
					<label for="form-type">Location Type</label>
					<select id="form-type" bind:value={formLocationType} disabled={isCreating}>
						<option value="">Select a type</option>
						{#each locationTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="form-address">Address / Reference</label>
					<input
						id="form-address"
						type="text"
						bind:value={formAddress}
						placeholder="Optional address or reference"
						disabled={isCreating}
					/>
				</div>
				<div class="form-group">
					<label for="form-desc">Description</label>
					<textarea
						id="form-desc"
						bind:value={formDescription}
						placeholder="Describe the location..."
						rows="3"
						disabled={isCreating}
					></textarea>
				</div>
				<div class="form-group">
					<label for="form-file">Reference Image</label>
					<input
						id="form-file"
						type="file"
						accept="image/*"
						onchange={handleFileSelect}
						disabled={isCreating}
					/>
					{#if formPreview}
						<div class="upload-preview">
							<img src={formPreview} alt="Preview" />
						</div>
					{/if}
				</div>
			</div>
			<div class="dialog-actions">
				<button class="btn btn-secondary" onclick={() => (showCreateDialog = false)} disabled={isCreating}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={handleCreate}
					disabled={!formName.trim() || isCreating}
				>
					{isCreating ? 'Creating...' : 'Create'}
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
		align-items: center;
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: #ffffff;
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

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	.location-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.2s;
	}

	.location-card:hover {
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
	}

	.card-preview {
		position: relative;
		aspect-ratio: 16/10;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder {
		font-size: 3rem;
		opacity: 0.3;
	}

	.type-badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		padding: 0.25rem 0.5rem;
		background: rgba(0, 0, 0, 0.7);
		border-radius: 4px;
		font-size: 0.75rem;
		color: white;
	}

	.card-info {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1rem;
		gap: 0.75rem;
	}

	.item-details {
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-size: 0.9375rem;
		color: white;
		font-weight: 500;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-desc {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		display: block;
		margin-top: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.delete-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 6px;
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
		max-width: 500px;
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
		max-height: 150px;
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

