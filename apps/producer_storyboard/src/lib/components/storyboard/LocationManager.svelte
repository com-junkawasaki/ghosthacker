<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	type Props = {
		projectId: string;
		open: boolean;
	};

	let { projectId, open = $bindable(false) }: Props = $props();

	type Location = {
		id: string;
		projectId: string;
		name: string;
		description: string | null;
		parentLocationId: string | null;
		imageId: string | null;
		metadata: string | null;
		createdAt: string;
		updatedAt: string;
	};

	let locations = $state<Location[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let editingLocation: Location | null = $state(null);
	let showForm = $state(false);
	let deletingLocationId = $state<string | null>(null);
	let showDeleteConfirm = $state(false);
	let parentLocationId = $state<string | null>(null);

	const orgId = $derived($page.params.orgId);

	async function loadLocations() {
		if (!browser || !projectId) return;

		try {
			loading = true;
			error = null;
			const params = new URLSearchParams({ projectId });
			if (parentLocationId) {
				params.append('parentLocationId', parentLocationId);
			}
			
			const response = await fetch(`/api/locations?${params.toString()}`, {
				headers: {
					'X-Org-Id': orgId || '',
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load locations: ${response.statusText}`);
			}
			
			const result = await response.json();
			if (result?.locations) {
				locations = result.locations as Location[];
			}
		} catch (err) {
			console.error('[LocationManager] Error loading locations:', err);
			error = err instanceof Error ? err.message : 'Failed to load locations';
		} finally {
			loading = false;
		}
	}

	async function createLocation(
		name: string,
		description: string | null,
		parentLocationId: string | null,
		imageId: string | null,
		metadata: string | null
	) {
		if (!browser || !projectId) return;

		try {
			const response = await fetch('/api/locations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					projectId,
					name,
					description: description || null,
					parentLocationId: parentLocationId || null,
					imageId: imageId || null,
					metadata: metadata || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create location');
			}

			await loadLocations();
			showForm = false;
		} catch (err) {
			console.error('[LocationManager] Error creating location:', err);
			error = err instanceof Error ? err.message : 'Failed to create location';
		}
	}

	async function updateLocation(
		id: string,
		name: string,
		description: string | null,
		parentLocationId: string | null,
		imageId: string | null,
		metadata: string | null
	) {
		if (!browser) return;

		try {
			const response = await fetch(`/api/locations/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					name,
					description: description || null,
					parentLocationId: parentLocationId || null,
					imageId: imageId || null,
					metadata: metadata || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to update location');
			}

			await loadLocations();
			editingLocation = null;
		} catch (err) {
			console.error('[LocationManager] Error updating location:', err);
			error = err instanceof Error ? err.message : 'Failed to update location';
		}
	}

	function requestDelete(id: string) {
		deletingLocationId = id;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		deletingLocationId = null;
		showDeleteConfirm = false;
	}

	async function confirmDelete() {
		if (!browser || !deletingLocationId) return;

		try {
			const response = await fetch(`/api/locations/${deletingLocationId}`, {
				method: 'DELETE',
				headers: {
					'X-Org-Id': orgId || '',
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to delete location');
			}

			await loadLocations();
			deletingLocationId = null;
			showDeleteConfirm = false;
		} catch (err) {
			console.error('[LocationManager] Error deleting location:', err);
			error = err instanceof Error ? err.message : 'Failed to delete location';
			deletingLocationId = null;
			showDeleteConfirm = false;
		}
	}

	const topLevelLocations = $derived.by(() => {
		return locations.filter(loc => !loc.parentLocationId);
	});

	const getChildLocations = (parentId: string) => {
		return locations.filter(loc => loc.parentLocationId === parentId);
	};

	$effect(() => {
		if (open && projectId) {
			loadLocations();
		}
	});
</script>

{#if open}
	<div class="location-manager-container">
		<div class="header">
			<h2>Locations</h2>
			<button type="button" class="close-button" onclick={() => open = false}>✕</button>
		</div>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<div class="actions">
			<button
				type="button"
				class="add-button"
				onclick={() => {
					editingLocation = null;
					showForm = true;
				}}
			>
				+ Add Location
			</button>
		</div>

		{#if showForm}
			<div class="form-container">
				<h3>{editingLocation ? 'Edit Location' : 'Create Location'}</h3>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						const formData = new FormData(e.target as HTMLFormElement);
						const name = formData.get('name') as string;
						const description = formData.get('description') as string | null;
						const parentId = formData.get('parentLocationId') as string | null;
						
						if (editingLocation) {
							updateLocation(editingLocation.id, name, description, parentId || null, null, null);
						} else {
							createLocation(name, description, parentId || null, null, null);
						}
					}}
				>
					<div class="form-field">
						<label for="name">Name *</label>
						<input type="text" id="name" name="name" value={editingLocation?.name || ''} required />
					</div>
					<div class="form-field">
						<label for="description">Description</label>
						<textarea id="description" name="description">{editingLocation?.description || ''}</textarea>
					</div>
					<div class="form-field">
						<label for="parentLocationId">Parent Location</label>
						<select id="parentLocationId" name="parentLocationId">
							<option value="">None (Top Level)</option>
							{#each locations.filter(l => !editingLocation || l.id !== editingLocation.id) as loc}
								<option value={loc.id} selected={editingLocation?.parentLocationId === loc.id}>
									{loc.name}
								</option>
							{/each}
						</select>
					</div>
					<div class="form-actions">
						<button type="submit" class="save-button">Save</button>
						<button
							type="button"
							class="cancel-button"
							onclick={() => {
								showForm = false;
								editingLocation = null;
							}}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}

		{#if loading}
			<div class="loading">Loading locations...</div>
		{:else}
			<div class="location-list">
				{#if topLevelLocations.length === 0}
					<div class="empty-state">No locations found. Create your first location to get started.</div>
				{:else}
					{#each topLevelLocations as location (location.id)}
						<div class="location-item">
							<div class="location-info">
								<h3>{location.name}</h3>
								{#if location.description}
									<p class="location-description">{location.description}</p>
								{/if}
							</div>
							<div class="location-actions">
								<button
									type="button"
									class="edit-button"
									onclick={() => {
										editingLocation = location;
										showForm = true;
									}}
								>
									Edit
								</button>
								<button
									type="button"
									class="delete-button"
									onclick={() => requestDelete(location.id)}
								>
									Delete
								</button>
							</div>
						</div>
						{#each getChildLocations(location.id) as childLocation (childLocation.id)}
							<div class="location-item child-location">
								<div class="location-info">
									<h4>{childLocation.name}</h4>
									{#if childLocation.description}
										<p class="location-description">{childLocation.description}</p>
									{/if}
								</div>
								<div class="location-actions">
									<button
										type="button"
										class="edit-button"
										onclick={() => {
											editingLocation = childLocation;
											showForm = true;
										}}
									>
										Edit
									</button>
									<button
										type="button"
										class="delete-button"
										onclick={() => requestDelete(childLocation.id)}
									>
										Delete
									</button>
								</div>
							</div>
						{/each}
					{/each}
				{/if}
			</div>
		{/if}

		{#if showDeleteConfirm && deletingLocationId}
			<div
				class="delete-confirm-overlay"
				role="dialog"
				tabindex="-1"
				aria-modal="true"
				onclick={(e) => {
					if (e.target === e.currentTarget) {
						cancelDelete();
					}
				}}
			>
				<div class="delete-confirm-dialog">
					<h3>Delete Location</h3>
					<p>Are you sure you want to delete this location? This action cannot be undone.</p>
					<div class="delete-confirm-actions">
						<button type="button" class="cancel-button" onclick={() => cancelDelete()}>
							Cancel
						</button>
						<button type="button" class="confirm-delete-button" onclick={() => confirmDelete()}>
							Delete
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.location-manager-container {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 800px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
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

	.actions {
		margin-bottom: 1rem;
	}

	.add-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.add-button:hover {
		background: #2563eb;
	}

	.form-container {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}

	.form-container h3 {
		margin: 0 0 1rem 0;
		color: white;
	}

	.form-field {
		margin-bottom: 1rem;
	}

	.form-field label {
		display: block;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	.form-field input,
	.form-field textarea,
	.form-field select {
		width: 100%;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.save-button,
	.cancel-button {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		border: none;
	}

	.save-button {
		background: #3b82f6;
		color: white;
	}

	.save-button:hover {
		background: #2563eb;
	}

	.cancel-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.cancel-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.loading,
	.empty-state {
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		padding: 2rem;
	}

	.location-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.location-item {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
	}

	.location-item.child-location {
		margin-left: 2rem;
		background: rgba(255, 255, 255, 0.03);
	}

	.location-info {
		margin-bottom: 0.75rem;
	}

	.location-info h3,
	.location-info h4 {
		margin: 0 0 0.5rem 0;
		color: white;
	}

	.location-info h4 {
		font-size: 1rem;
	}

	.location-description {
		margin: 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
	}

	.location-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.edit-button,
	.delete-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.edit-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.delete-button:hover {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.delete-confirm-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.delete-confirm-dialog {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.delete-confirm-dialog h3 {
		margin: 0 0 1rem 0;
		color: #fca5a5;
		font-size: 1.25rem;
	}

	.delete-confirm-dialog p {
		margin: 0 0 1.5rem 0;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
	}

	.delete-confirm-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.confirm-delete-button {
		background: #ef4444;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		border: none;
	}

	.confirm-delete-button:hover {
		background: #dc2626;
	}
</style>
