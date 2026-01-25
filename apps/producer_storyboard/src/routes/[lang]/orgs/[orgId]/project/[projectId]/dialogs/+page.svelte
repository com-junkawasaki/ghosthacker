<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const projectId = $derived($page.params.projectId);

	type DialogItem = {
		id: string;
		name: string;
		content: string;
		characterId: string | null;
		characterName: string | null;
		emotion: string | null;
		tags: string[];
		createdAt: string;
	};

	let dialogs = $state<DialogItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateDialog = $state(false);
	let isCreating = $state(false);
	let editingId = $state<string | null>(null);

	// Form state
	let formName = $state('');
	let formContent = $state('');
	let formCharacterName = $state('');
	let formEmotion = $state('');

	const emotions = [
		'Neutral',
		'Happy',
		'Sad',
		'Angry',
		'Surprised',
		'Scared',
		'Confused',
		'Excited',
		'Thoughtful',
		'Embarrassed',
		'Determined',
		'Playful',
	];

	async function loadDialogs() {
		if (!browser) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/dialogs?projectId=${projectId}`);
			if (!response.ok) {
				throw new Error(`Failed to load dialogs: ${response.statusText}`);
			}
			const data = await response.json();
			dialogs = data.items || [];
		} catch (err) {
			console.error('[Dialogs] Error:', err);
			error = err instanceof Error ? err.message : 'Failed to load dialogs';
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		if (!formName.trim() || !formContent.trim()) {
			alert('Please enter a name and content');
			return;
		}

		isCreating = true;
		error = null;

		try {
			const response = await fetch('/api/dialogs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					name: formName.trim(),
					content: formContent.trim(),
					characterName: formCharacterName.trim() || null,
					emotion: formEmotion || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create dialog');
			}

			await loadDialogs();
			resetForm();
			showCreateDialog = false;
		} catch (err) {
			console.error('[Dialogs] Error creating:', err);
			error = err instanceof Error ? err.message : 'Failed to create dialog';
		} finally {
			isCreating = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this dialog?')) return;

		try {
			const response = await fetch(`/api/dialogs/${id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete dialog');
			}

			dialogs = dialogs.filter((item) => item.id !== id);
		} catch (err) {
			console.error('[Dialogs] Error deleting:', err);
			error = err instanceof Error ? err.message : 'Failed to delete dialog';
		}
	}

	function resetForm() {
		formName = '';
		formContent = '';
		formCharacterName = '';
		formEmotion = '';
		editingId = null;
	}

	function startEdit(item: DialogItem) {
		formName = item.name;
		formContent = item.content;
		formCharacterName = item.characterName || '';
		formEmotion = item.emotion || '';
		editingId = item.id;
		showCreateDialog = true;
	}

	onMount(() => {
		loadDialogs();
	});
</script>

<div class="page-layout">
	<ProjectSidebar {projectId} />
	<main class="page-content">
		<div class="manager">
			<header class="manager-header">
				<h1 class="page-title">Dialogs</h1>
				<div class="header-actions">
					<button class="btn btn-primary" onclick={() => (showCreateDialog = true)}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path d="M8 2v12M2 8h12" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						New Dialog
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
					<p>Loading dialogs...</p>
				</div>
			{:else if dialogs.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor">
							<path d="M56 32c0 12-10.8 21-24 21a25.5 25.5 0 01-9-1.5L8 56l4.5-10.5C9.5 42.5 8 38 8 32c0-12 10.8-21 24-21s24 9 24 21z" stroke-width="2" stroke-linejoin="round"/>
							<circle cx="24" cy="32" r="2" fill="currentColor"/>
							<circle cx="32" cy="32" r="2" fill="currentColor"/>
							<circle cx="40" cy="32" r="2" fill="currentColor"/>
						</svg>
					</div>
					<h2>No dialogs yet</h2>
					<p>Create dialog lines for your characters and scenes.</p>
					<button class="btn btn-primary" onclick={() => (showCreateDialog = true)}>
						Create Dialog
					</button>
				</div>
			{:else}
				<div class="dialog-list">
					{#each dialogs as item (item.id)}
						<div class="dialog-card">
							<div class="dialog-header-row">
								<div class="dialog-meta">
									<span class="dialog-name">{item.name}</span>
									{#if item.characterName}
										<span class="dialog-character">{item.characterName}</span>
									{/if}
									{#if item.emotion}
										<span class="dialog-emotion">{item.emotion}</span>
									{/if}
								</div>
								<div class="dialog-actions-row">
									<button
										class="action-btn edit"
										onclick={() => startEdit(item)}
										aria-label="Edit"
									>
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
											<path d="M10 2l2 2L5 11H3V9l7-7z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>
									</button>
									<button
										class="action-btn delete"
										onclick={() => handleDelete(item.id)}
										aria-label="Delete"
									>
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
											<path d="M2 4h10M4 4V3a1 1 0 011-1h4a1 1 0 011 1v1M10 4v7a1 1 0 01-1 1H5a1 1 0 01-1-1V4" stroke-width="1.5" stroke-linecap="round" />
										</svg>
									</button>
								</div>
							</div>
							<div class="dialog-content-box">
								<p>{item.content}</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<!-- Create/Edit Dialog -->
{#if showCreateDialog}
	<div
		class="dialog-overlay"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => e.target === e.currentTarget && (showCreateDialog = false, resetForm())}
		onkeydown={(e) => e.key === 'Escape' && (showCreateDialog = false, resetForm())}
	>
		<div class="dialog-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingId ? 'Edit Dialog' : 'New Dialog'}</h2>
				<button class="close-btn" onclick={() => (showCreateDialog = false, resetForm())}>✕</button>
			</div>
			<div class="modal-content">
				<div class="form-group">
					<label for="form-name">Title / Label *</label>
					<input
						id="form-name"
						type="text"
						bind:value={formName}
						placeholder="e.g., Scene 1 - Greeting"
						disabled={isCreating}
					/>
				</div>
				<div class="form-row">
					<div class="form-group">
						<label for="form-character">Character</label>
						<input
							id="form-character"
							type="text"
							bind:value={formCharacterName}
							placeholder="Who is speaking?"
							disabled={isCreating}
						/>
					</div>
					<div class="form-group">
						<label for="form-emotion">Emotion</label>
						<select id="form-emotion" bind:value={formEmotion} disabled={isCreating}>
							<option value="">Select emotion</option>
							{#each emotions as emotion}
								<option value={emotion}>{emotion}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="form-group">
					<label for="form-content">Dialog Content *</label>
					<textarea
						id="form-content"
						bind:value={formContent}
						placeholder="Enter the dialog text..."
						rows="5"
						disabled={isCreating}
					></textarea>
				</div>
			</div>
			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={() => (showCreateDialog = false, resetForm())} disabled={isCreating}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={handleCreate}
					disabled={!formName.trim() || !formContent.trim() || isCreating}
				>
					{isCreating ? 'Saving...' : editingId ? 'Update' : 'Create'}
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
		max-width: 1000px;
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

	.dialog-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.dialog-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		overflow: hidden;
		transition: all 0.2s;
	}

	.dialog-card:hover {
		border-color: rgba(255, 255, 255, 0.2);
	}

	.dialog-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.dialog-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.dialog-name {
		font-size: 0.9375rem;
		font-weight: 500;
		color: white;
	}

	.dialog-character {
		padding: 0.2rem 0.5rem;
		background: rgba(59, 130, 246, 0.2);
		border-radius: 4px;
		font-size: 0.75rem;
		color: #60a5fa;
	}

	.dialog-emotion {
		padding: 0.2rem 0.5rem;
		background: rgba(168, 85, 247, 0.2);
		border-radius: 4px;
		font-size: 0.75rem;
		color: #c084fc;
	}

	.dialog-actions-row {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}

	.action-btn.delete:hover {
		background: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.dialog-content-box {
		padding: 1rem;
	}

	.dialog-content-box p {
		margin: 0;
		color: rgba(255, 255, 255, 0.85);
		line-height: 1.6;
		font-size: 0.9375rem;
		white-space: pre-wrap;
	}

	/* Modal styles */
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

	.dialog-modal {
		background: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		width: 100%;
		max-width: 560px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
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

	.modal-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
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

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>

