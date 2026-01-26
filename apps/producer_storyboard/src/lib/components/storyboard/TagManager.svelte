<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	type Props = {
		projectId: string;
		open: boolean;
	};

	let { projectId, open = $bindable(false) }: Props = $props();

	type Tag = {
		id: string;
		projectId: string;
		name: string;
		color: string | null;
		createdAt: string;
	};

	let tags = $state<Tag[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let editingTag: Tag | null = $state(null);
	let showForm = $state(false);
	let deletingTagId = $state<string | null>(null);
	let showDeleteConfirm = $state(false);

	const orgId = $derived($page.params.orgId);

	const defaultColors = [
		'#3b82f6', // blue
		'#ef4444', // red
		'#10b981', // green
		'#f59e0b', // amber
		'#8b5cf6', // purple
		'#ec4899', // pink
		'#06b6d4', // cyan
		'#84cc16', // lime
	];

	async function loadTags() {
		if (!browser || !projectId) return;

		try {
			loading = true;
			error = null;
			const response = await fetch(`/api/tags?projectId=${projectId}`, {
				headers: {
					'X-Org-Id': orgId || '',
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load tags: ${response.statusText}`);
			}
			
			const result = await response.json();
			if (result?.tags) {
				tags = result.tags as Tag[];
			}
		} catch (err) {
			console.error('[TagManager] Error loading tags:', err);
			error = err instanceof Error ? err.message : 'Failed to load tags';
		} finally {
			loading = false;
		}
	}

	async function createTag(name: string, color: string | null) {
		if (!browser || !projectId) return;

		try {
			const response = await fetch('/api/tags', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					projectId,
					name,
					color: color || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create tag');
			}

			await loadTags();
			showForm = false;
		} catch (err) {
			console.error('[TagManager] Error creating tag:', err);
			error = err instanceof Error ? err.message : 'Failed to create tag';
		}
	}

	async function updateTag(id: string, name: string, color: string | null) {
		if (!browser) return;

		try {
			const response = await fetch(`/api/tags/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					name,
					color: color || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to update tag');
			}

			await loadTags();
			editingTag = null;
		} catch (err) {
			console.error('[TagManager] Error updating tag:', err);
			error = err instanceof Error ? err.message : 'Failed to update tag';
		}
	}

	function requestDelete(id: string) {
		deletingTagId = id;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		deletingTagId = null;
		showDeleteConfirm = false;
	}

	async function confirmDelete() {
		if (!browser || !deletingTagId) return;

		try {
			const response = await fetch(`/api/tags/${deletingTagId}`, {
				method: 'DELETE',
				headers: {
					'X-Org-Id': orgId || '',
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to delete tag');
			}

			await loadTags();
			deletingTagId = null;
			showDeleteConfirm = false;
		} catch (err) {
			console.error('[TagManager] Error deleting tag:', err);
			error = err instanceof Error ? err.message : 'Failed to delete tag';
			deletingTagId = null;
			showDeleteConfirm = false;
		}
	}

	$effect(() => {
		if (open && projectId) {
			loadTags();
		}
	});
</script>

{#if open}
	<div class="tag-manager-overlay" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="tag-manager-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				open = false;
			}
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				open = false;
			}
		}}
	>
		<div class="tag-manager" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="header">
				<h2 id="tag-manager-title">Tags</h2>
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
						editingTag = null;
						showForm = true;
					}}
				>
					+ Add Tag
				</button>
			</div>

			{#if showForm}
				<div class="form-container">
					<h3>{editingTag ? 'Edit Tag' : 'Create Tag'}</h3>
					<form
						onsubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.target as HTMLFormElement);
							const name = formData.get('name') as string;
							const color = formData.get('color') as string | null;
							
							if (editingTag) {
								updateTag(editingTag.id, name, color);
							} else {
								createTag(name, color);
							}
						}}
					>
						<div class="form-field">
							<label for="name">Name *</label>
							<input type="text" id="name" name="name" value={editingTag?.name || ''} required maxlength="50" />
						</div>
						<div class="form-field">
							<label for="color">Color</label>
							<div class="color-picker">
								<input type="color" id="color" name="color" value={editingTag?.color || defaultColors[0]} />
								<div class="color-presets">
									{#each defaultColors as color}
										<button
											type="button"
											class="color-preset"
											style="background-color: {color};"
											onclick={() => {
												const colorInput = document.getElementById('color') as HTMLInputElement;
												if (colorInput) colorInput.value = color;
											}}
										/>
									{/each}
								</div>
							</div>
						</div>
						<div class="form-actions">
							<button type="submit" class="save-button">Save</button>
							<button
								type="button"
								class="cancel-button"
								onclick={() => {
									showForm = false;
									editingTag = null;
								}}
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			{/if}

			{#if loading}
				<div class="loading">Loading tags...</div>
			{:else}
				<div class="tag-list">
					{#if tags.length === 0}
						<div class="empty-state">No tags found. Create your first tag to get started.</div>
					{:else}
						{#each tags as tag (tag.id)}
							<div class="tag-item">
								<div class="tag-info">
									<div class="tag-badge" style="background-color: {tag.color || defaultColors[0]};">
										{tag.name}
									</div>
								</div>
								<div class="tag-actions">
									<button
										type="button"
										class="edit-button"
										onclick={() => {
											editingTag = tag;
											showForm = true;
										}}
									>
										Edit
									</button>
									<button
										type="button"
										class="delete-button"
										onclick={() => requestDelete(tag.id)}
									>
										Delete
									</button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			{/if}

			{#if showDeleteConfirm && deletingTagId}
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
						<h3>Delete Tag</h3>
						<p>Are you sure you want to delete this tag? This will remove it from all resources.</p>
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
	</div>
{/if}

<style>
	.tag-manager-overlay {
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

	.tag-manager {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 600px;
		width: 90%;
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

	.form-field input {
		width: 100%;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
	}

	.color-picker {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.color-picker input[type="color"] {
		width: 60px;
		height: 40px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.color-presets {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-preset {
		width: 32px;
		height: 32px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.25rem;
		cursor: pointer;
		padding: 0;
	}

	.color-preset:hover {
		border-color: white;
		transform: scale(1.1);
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

	.tag-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.tag-item {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.tag-info {
		flex: 1;
	}

	.tag-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.tag-actions {
		display: flex;
		gap: 0.5rem;
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
