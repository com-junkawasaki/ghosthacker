<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const projectId = $derived($page.params.projectId);

	type EnvironmentItem = {
		id: string;
		name: string;
		description: string | null;
		locationId: string | null;
		locationName: string | null;
		weather: string | null;
		timeOfDay: string | null;
		lighting: string | null;
		temperature: string | null;
		atmosphere: string | null;
		items: string[];
		tags: string[];
		createdAt: string;
	};

	let environments = $state<EnvironmentItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateDialog = $state(false);
	let isCreating = $state(false);
	let editingId = $state<string | null>(null);

	// Form state
	let formName = $state('');
	let formDescription = $state('');
	let formLocationName = $state('');
	let formWeather = $state('');
	let formTimeOfDay = $state('');
	let formLighting = $state('');
	let formTemperature = $state('');
	let formAtmosphere = $state('');
	let formItems = $state<string[]>([]);
	let newItem = $state('');

	const weatherOptions = [
		'Clear',
		'Sunny',
		'Cloudy',
		'Overcast',
		'Partly Cloudy',
		'Rainy',
		'Heavy Rain',
		'Thunderstorm',
		'Snowy',
		'Blizzard',
		'Foggy',
		'Misty',
		'Windy',
		'Hail',
		'Sandstorm',
	];

	const timeOfDayOptions = [
		'Dawn',
		'Early Morning',
		'Morning',
		'Late Morning',
		'Noon',
		'Afternoon',
		'Late Afternoon',
		'Sunset',
		'Dusk',
		'Evening',
		'Night',
		'Midnight',
		'Late Night',
	];

	const lightingOptions = [
		'Natural - Bright',
		'Natural - Dim',
		'Natural - Dappled',
		'Artificial - Fluorescent',
		'Artificial - Warm',
		'Artificial - Cold',
		'Candlelight',
		'Firelight',
		'Moonlight',
		'Starlight',
		'Neon',
		'Mixed',
		'Dramatic Shadows',
		'Silhouette',
		'Backlit',
	];

	const temperatureOptions = [
		'Freezing',
		'Very Cold',
		'Cold',
		'Cool',
		'Mild',
		'Warm',
		'Hot',
		'Very Hot',
		'Sweltering',
	];

	const atmosphereOptions = [
		'Peaceful',
		'Tense',
		'Mysterious',
		'Romantic',
		'Melancholic',
		'Cheerful',
		'Ominous',
		'Chaotic',
		'Serene',
		'Nostalgic',
		'Surreal',
		'Dramatic',
		'Cozy',
		'Desolate',
		'Energetic',
	];

	async function loadEnvironments() {
		if (!browser) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/environments?projectId=${projectId}`);
			if (!response.ok) {
				throw new Error(`Failed to load environments: ${response.statusText}`);
			}
			const data = await response.json();
			environments = data.items || [];
		} catch (err) {
			console.error('[Environments] Error:', err);
			error = err instanceof Error ? err.message : 'Failed to load environments';
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
			const response = await fetch('/api/environments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					name: formName.trim(),
					description: formDescription.trim() || null,
					locationName: formLocationName.trim() || null,
					weather: formWeather || null,
					timeOfDay: formTimeOfDay || null,
					lighting: formLighting || null,
					temperature: formTemperature || null,
					atmosphere: formAtmosphere || null,
					items: formItems.length > 0 ? formItems : null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create environment');
			}

			await loadEnvironments();
			resetForm();
			showCreateDialog = false;
		} catch (err) {
			console.error('[Environments] Error creating:', err);
			error = err instanceof Error ? err.message : 'Failed to create environment';
		} finally {
			isCreating = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this environment?')) return;

		try {
			const response = await fetch(`/api/environments/${id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete environment');
			}

			environments = environments.filter((item) => item.id !== id);
		} catch (err) {
			console.error('[Environments] Error deleting:', err);
			error = err instanceof Error ? err.message : 'Failed to delete environment';
		}
	}

	function resetForm() {
		formName = '';
		formDescription = '';
		formLocationName = '';
		formWeather = '';
		formTimeOfDay = '';
		formLighting = '';
		formTemperature = '';
		formAtmosphere = '';
		formItems = [];
		newItem = '';
		editingId = null;
	}

	function addItem() {
		if (newItem.trim() && !formItems.includes(newItem.trim())) {
			formItems = [...formItems, newItem.trim()];
			newItem = '';
		}
	}

	function removeItem(item: string) {
		formItems = formItems.filter((i) => i !== item);
	}

	function startEdit(item: EnvironmentItem) {
		formName = item.name;
		formDescription = item.description || '';
		formLocationName = item.locationName || '';
		formWeather = item.weather || '';
		formTimeOfDay = item.timeOfDay || '';
		formLighting = item.lighting || '';
		formTemperature = item.temperature || '';
		formAtmosphere = item.atmosphere || '';
		formItems = item.items || [];
		editingId = item.id;
		showCreateDialog = true;
	}

	onMount(() => {
		loadEnvironments();
	});
</script>

<div class="page-layout">
	<ProjectSidebar {projectId} />
	<main class="page-content">
		<div class="manager">
			<header class="manager-header">
				<div class="header-info">
					<h1 class="page-title">Environments</h1>
					<p class="page-subtitle">Combine location, weather, lighting, and atmosphere conditions</p>
				</div>
				<div class="header-actions">
					<button class="btn btn-primary" onclick={() => (showCreateDialog = true)}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
							<path d="M8 2v12M2 8h12" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						New Environment
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
					<p>Loading environments...</p>
				</div>
			{:else if environments.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor">
							<path d="M32 8L8 20l24 12 24-12L32 8z" stroke-width="2" stroke-linejoin="round"/>
							<path d="M8 32l24 12 24-12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M8 44l24 12 24-12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
					<h2>No environments yet</h2>
					<p>Create environments to define scene conditions - combine location, weather, time, lighting, and more.</p>
					<button class="btn btn-primary" onclick={() => (showCreateDialog = true)}>
						Create Environment
					</button>
				</div>
			{:else}
				<div class="env-grid">
					{#each environments as item (item.id)}
						<div class="env-card">
							<div class="env-header">
								<h3 class="env-name">{item.name}</h3>
								<div class="env-actions">
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
							{#if item.description}
								<p class="env-desc">{item.description}</p>
							{/if}
							<div class="env-conditions">
								{#if item.locationName}
									<div class="condition">
										<span class="condition-icon">📍</span>
										<span class="condition-label">Location</span>
										<span class="condition-value">{item.locationName}</span>
									</div>
								{/if}
								{#if item.weather}
									<div class="condition">
										<span class="condition-icon">🌤️</span>
										<span class="condition-label">Weather</span>
										<span class="condition-value">{item.weather}</span>
									</div>
								{/if}
								{#if item.timeOfDay}
									<div class="condition">
										<span class="condition-icon">🕐</span>
										<span class="condition-label">Time</span>
										<span class="condition-value">{item.timeOfDay}</span>
									</div>
								{/if}
								{#if item.lighting}
									<div class="condition">
										<span class="condition-icon">💡</span>
										<span class="condition-label">Lighting</span>
										<span class="condition-value">{item.lighting}</span>
									</div>
								{/if}
								{#if item.temperature}
									<div class="condition">
										<span class="condition-icon">🌡️</span>
										<span class="condition-label">Temp</span>
										<span class="condition-value">{item.temperature}</span>
									</div>
								{/if}
								{#if item.atmosphere}
									<div class="condition">
										<span class="condition-icon">✨</span>
										<span class="condition-label">Atmosphere</span>
										<span class="condition-value">{item.atmosphere}</span>
									</div>
								{/if}
							</div>
							{#if item.items && item.items.length > 0}
								<div class="env-items">
									<span class="items-label">Items:</span>
									<div class="items-list">
										{#each item.items as itemName}
											<span class="item-tag">{itemName}</span>
										{/each}
									</div>
								</div>
							{/if}
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
				<h2>{editingId ? 'Edit Environment' : 'New Environment'}</h2>
				<button class="close-btn" onclick={() => (showCreateDialog = false, resetForm())}>✕</button>
			</div>
			<div class="modal-content">
				<div class="form-group">
					<label for="form-name">Name *</label>
					<input
						id="form-name"
						type="text"
						bind:value={formName}
						placeholder="e.g., Rainy City Night, Sunny Forest Morning"
						disabled={isCreating}
					/>
				</div>
				<div class="form-group">
					<label for="form-desc">Description</label>
					<textarea
						id="form-desc"
						bind:value={formDescription}
						placeholder="Describe the overall environment..."
						rows="2"
						disabled={isCreating}
					></textarea>
				</div>

				<div class="section-title">Conditions</div>

				<div class="form-row">
					<div class="form-group">
						<label for="form-location">Location</label>
						<input
							id="form-location"
							type="text"
							bind:value={formLocationName}
							placeholder="e.g., Downtown, Forest, Beach"
							disabled={isCreating}
						/>
					</div>
					<div class="form-group">
						<label for="form-weather">Weather</label>
						<select id="form-weather" bind:value={formWeather} disabled={isCreating}>
							<option value="">Select weather</option>
							{#each weatherOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="form-time">Time of Day</label>
						<select id="form-time" bind:value={formTimeOfDay} disabled={isCreating}>
							<option value="">Select time</option>
							{#each timeOfDayOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="form-lighting">Lighting</label>
						<select id="form-lighting" bind:value={formLighting} disabled={isCreating}>
							<option value="">Select lighting</option>
							{#each lightingOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="form-temp">Temperature</label>
						<select id="form-temp" bind:value={formTemperature} disabled={isCreating}>
							<option value="">Select temperature</option>
							{#each temperatureOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="form-atmosphere">Atmosphere</label>
						<select id="form-atmosphere" bind:value={formAtmosphere} disabled={isCreating}>
							<option value="">Select atmosphere</option>
							{#each atmosphereOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="section-title">Items in Environment</div>
				<div class="form-group">
					<label for="new-item">Add Items</label>
					<div class="item-input-row">
						<input
							id="new-item"
							type="text"
							bind:value={newItem}
							placeholder="e.g., Street lamps, Umbrella"
							disabled={isCreating}
							onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
						/>
						<button class="btn btn-secondary btn-sm" onclick={addItem} disabled={isCreating || !newItem.trim()}>
							Add
						</button>
					</div>
					{#if formItems.length > 0}
						<div class="items-tags">
							{#each formItems as item}
								<span class="item-tag removable">
									{item}
									<button class="remove-tag" onclick={() => removeItem(item)}>✕</button>
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>
			<div class="modal-actions">
				<button class="btn btn-secondary" onclick={() => (showCreateDialog = false, resetForm())} disabled={isCreating}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={handleCreate}
					disabled={!formName.trim() || isCreating}
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
		max-width: 1200px;
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

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
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
		max-width: 400px;
	}

	.env-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 1.25rem;
	}

	.env-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.25rem;
		transition: all 0.2s;
	}

	.env-card:hover {
		border-color: rgba(255, 255, 255, 0.2);
	}

	.env-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.env-name {
		font-size: 1.0625rem;
		font-weight: 600;
		color: white;
		margin: 0;
	}

	.env-actions {
		display: flex;
		gap: 0.375rem;
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

	.env-desc {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1rem;
		line-height: 1.5;
	}

	.env-conditions {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.condition {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 6px;
	}

	.condition-icon {
		font-size: 0.875rem;
	}

	.condition-label {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.condition-value {
		font-size: 0.8125rem;
		color: white;
		margin-left: auto;
	}

	.env-items {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.items-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		display: block;
		margin-bottom: 0.5rem;
	}

	.items-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.item-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		background: rgba(59, 130, 246, 0.15);
		border-radius: 4px;
		font-size: 0.75rem;
		color: #60a5fa;
	}

	.item-tag.removable {
		padding-right: 0.25rem;
	}

	.remove-tag {
		background: none;
		border: none;
		color: inherit;
		font-size: 0.625rem;
		cursor: pointer;
		padding: 0.125rem;
		opacity: 0.7;
	}

	.remove-tag:hover {
		opacity: 1;
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
		max-width: 600px;
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

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-top: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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

	.item-input-row {
		display: flex;
		gap: 0.5rem;
	}

	.item-input-row input {
		flex: 1;
	}

	.items-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>

