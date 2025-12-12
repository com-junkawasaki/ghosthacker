<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const { lang, orgId, projectId } = $page.params;

	// SSR: Get scenarios from page data
	interface PageData {
		scenarios: Array<{
			id: string;
			projectId: string;
			title: string;
			description?: string | null;
			createdAt: string;
			updatedAt: string;
		}>;
	}
	const props = $props<{ data: PageData }>();
	
	let scenariosList = $state(props.data.scenarios || []);
	let loading = $state(false);
	let error = $state<Error | null>(null);

	// State
	let showCreateDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let showEpisodeDialog = $state(false);
	let showPartDialog = $state(false);
	let showScenePlanDialog = $state(false);
	let selectedScenarioId = $state<string | null>(null);
	let selectedEpisodeId = $state<string | null>(null);
	let selectedPartId = $state<string | null>(null);
	let expandedScenarios = $state<Set<string>>(new Set());
	let expandedEpisodes = $state<Set<string>>(new Set());
	let expandedParts = $state<Set<string>>(new Set());

	// Form state
	let newScenarioTitle = $state('');
	let newScenarioDescription = $state('');
	let editScenarioTitle = $state('');
	let editScenarioDescription = $state('');
	let newEpisodeTitle = $state('');
	let newEpisodeDescription = $state('');
	let newPartTitle = $state('');
	let newPartDescription = $state('');
	let newScenePlanDescription = $state('');

	let isCreating = $state(false);
	let isUpdating = $state(false);
	let isDeleting = $state(false);

	// Drag and drop state
	let draggedEpisodeId = $state<string | null>(null);
	let draggedPartId = $state<string | null>(null);
	let draggedScenePlanId = $state<string | null>(null);
	let dragOverEpisodeIndex = $state<number | null>(null);
	let dragOverPartIndex = $state<number | null>(null);
	let dragOverScenePlanIndex = $state<number | null>(null);

	async function loadScenarios() {
		if (!browser) return;
		
		try {
			loading = true;
			error = null;
			const response = await fetch(`/api/scenarios?projectId=${projectId}`, {
				headers: {
					'X-Org-Id': orgId,
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load scenarios: ${response.statusText}`);
			}
			
			const data = await response.json();
			scenariosList = data.scenarios || [];
		} catch (err) {
			console.error('[Scenario] Error loading scenarios:', err);
			error = err instanceof Error ? err : new Error('Failed to load scenarios');
		} finally {
			loading = false;
		}
	}

	async function handleCreateScenario() {
		if (!newScenarioTitle.trim()) return;

		isCreating = true;
		try {
			const response = await fetch('/api/scenarios', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					projectId: projectId,
					title: newScenarioTitle.trim(),
					description: newScenarioDescription.trim() || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create scenario');
			}

			await loadScenarios();
			showCreateDialog = false;
			newScenarioTitle = '';
			newScenarioDescription = '';
		} catch (err) {
			console.error('Failed to create scenario:', err);
			error = err instanceof Error ? err : new Error('Failed to create scenario');
			alert(`Failed to create scenario: ${error.message}`);
		} finally {
			isCreating = false;
		}
	}

	async function handleUpdateScenario() {
		if (!selectedScenarioId) return;

		isUpdating = true;
		try {
			const response = await fetch(`/api/scenarios/${selectedScenarioId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					title: editScenarioTitle.trim() || null,
					description: editScenarioDescription.trim() || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to update scenario');
			}

			await loadScenarios();
			showEditDialog = false;
			selectedScenarioId = null;
		} catch (err) {
			console.error('Failed to update scenario:', err);
			error = err instanceof Error ? err : new Error('Failed to update scenario');
			alert(`Failed to update scenario: ${error.message}`);
		} finally {
			isUpdating = false;
		}
	}

	async function handleDeleteScenario() {
		if (!selectedScenarioId) return;

		isDeleting = true;
		try {
			const response = await fetch(`/api/scenarios/${selectedScenarioId}`, {
				method: 'DELETE',
				headers: {
					'X-Org-Id': orgId,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to delete scenario');
			}

			await loadScenarios();
			showDeleteDialog = false;
			selectedScenarioId = null;
		} catch (err) {
			console.error('Failed to delete scenario:', err);
			error = err instanceof Error ? err : new Error('Failed to delete scenario');
			alert(`Failed to delete scenario: ${error.message}`);
		} finally {
			isDeleting = false;
		}
	}

	// TODO: Episode/Part/ScenePlan creation will be implemented when grpc-go supports them
	async function handleCreateEpisode() {
		alert('Episode creation not yet supported in grpc-go');
		showEpisodeDialog = false;
	}

	async function handleCreatePart() {
		alert('Part creation not yet supported in grpc-go');
		showPartDialog = false;
	}

	async function handleCreateScenePlan() {
		alert('Scene plan creation not yet supported in grpc-go');
		showScenePlanDialog = false;
	}

	function openEditDialog(scenario: { id: string; title: string; description: string | null }) {
		selectedScenarioId = scenario.id;
		editScenarioTitle = scenario.title;
		editScenarioDescription = scenario.description || '';
		showEditDialog = true;
	}

	function openDeleteDialog(scenarioId: string) {
		selectedScenarioId = scenarioId;
		showDeleteDialog = true;
	}

	function toggleScenario(scenarioId: string) {
		if (expandedScenarios.has(scenarioId)) {
			expandedScenarios.delete(scenarioId);
		} else {
			expandedScenarios.add(scenarioId);
			if (selectedScenarioId !== scenarioId) {
				selectedScenarioId = scenarioId;
			}
		}
	}

	function toggleEpisode(episodeId: string) {
		if (expandedEpisodes.has(episodeId)) {
			expandedEpisodes.delete(episodeId);
		} else {
			expandedEpisodes.add(episodeId);
		}
	}

	function togglePart(partId: string) {
		if (expandedParts.has(partId)) {
			expandedParts.delete(partId);
		} else {
			expandedParts.add(partId);
		}
	}

	// TODO: Episode/Part/ScenePlan support will be added later
	const selectedScenario = $derived(null);

	// Drag and drop handlers for episodes
	function handleEpisodeDragStart(e: DragEvent, episodeId: string) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'episode', id: episodeId }));
			draggedEpisodeId = episodeId;
		}
	}

	function handleEpisodeDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverEpisodeIndex = index;
	}

	function handleEpisodeDragLeave() {
		dragOverEpisodeIndex = null;
	}

	async function handleEpisodeDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		dragOverEpisodeIndex = null;

		if (!draggedEpisodeId || !selectedScenario || !selectedScenarioId || !reorderEpisodesStore) return;

		const episodes = selectedScenario.episodes || [];
		const dragIndex = episodes.findIndex((ep: { id: string }) => ep.id === draggedEpisodeId);
		
		if (dragIndex === -1 || dragIndex === dropIndex) {
			draggedEpisodeId = null;
			return;
		}

		// Reorder episodes array
		const reorderedEpisodes = [...episodes];
		const [draggedEpisode] = reorderedEpisodes.splice(dragIndex, 1);
		reorderedEpisodes.splice(dropIndex, 0, draggedEpisode);

		// TODO: Reorder episodes via grpc-go when supported
		alert('Episode reordering not yet supported in grpc-go');

		draggedEpisodeId = null;
	}

	function handleEpisodeDragEnd() {
		draggedEpisodeId = null;
		dragOverEpisodeIndex = null;
	}

	// Drag and drop handlers for parts
	function handlePartDragStart(e: DragEvent, partId: string) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'part', id: partId }));
			draggedPartId = partId;
		}
	}

	function handlePartDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverPartIndex = index;
	}

	function handlePartDragLeave() {
		dragOverPartIndex = null;
	}

	async function handlePartDrop(e: DragEvent, dropIndex: number, episodeId: string) {
		e.preventDefault();
		dragOverPartIndex = null;

		if (!draggedPartId || !selectedScenario || !reorderPartsStore) return;

		const episode = selectedScenario.episodes?.find((ep: { id: string }) => ep.id === episodeId);
		if (!episode || !episode.parts) {
			draggedPartId = null;
			return;
		}

		const parts = episode.parts;
		const dragIndex = parts.findIndex((part: { id: string }) => part.id === draggedPartId);
		
		if (dragIndex === -1 || dragIndex === dropIndex) {
			draggedPartId = null;
			return;
		}

		// Reorder parts array
		const reorderedParts = [...parts];
		const [draggedPart] = reorderedParts.splice(dragIndex, 1);
		reorderedParts.splice(dropIndex, 0, draggedPart);

		// TODO: Reorder parts via grpc-go when supported
		alert('Part reordering not yet supported in grpc-go');

		draggedPartId = null;
	}

	function handlePartDragEnd() {
		draggedPartId = null;
		dragOverPartIndex = null;
	}

	// Drag and drop handlers for scene plans
	function handleScenePlanDragStart(e: DragEvent, scenePlanId: string) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'scenePlan', id: scenePlanId }));
			draggedScenePlanId = scenePlanId;
		}
	}

	function handleScenePlanDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverScenePlanIndex = index;
	}

	function handleScenePlanDragLeave() {
		dragOverScenePlanIndex = null;
	}

	async function handleScenePlanDrop(e: DragEvent, dropIndex: number, partId: string) {
		e.preventDefault();
		dragOverScenePlanIndex = null;

		if (!draggedScenePlanId || !selectedScenario || !reorderScenePlansStore) return;

		// Find the part that contains this scene plan
		let targetPart: { id: string; scenePlans?: Array<{ id: string }> } | null = null;
		for (const episode of selectedScenario.episodes || []) {
			const part = episode.parts?.find((p: { id: string }) => p.id === partId);
			if (part) {
				targetPart = part;
				break;
			}
		}

		if (!targetPart || !targetPart.scenePlans) {
			draggedScenePlanId = null;
			return;
		}

		const scenePlans = targetPart.scenePlans;
		const dragIndex = scenePlans.findIndex((sp: { id: string }) => sp.id === draggedScenePlanId);
		
		if (dragIndex === -1 || dragIndex === dropIndex) {
			draggedScenePlanId = null;
			return;
		}

		// Reorder scene plans array
		const reorderedScenePlans = [...scenePlans];
		const [draggedScenePlan] = reorderedScenePlans.splice(dragIndex, 1);
		reorderedScenePlans.splice(dropIndex, 0, draggedScenePlan);

		// TODO: Reorder scene plans via grpc-go when supported
		alert('Scene plan reordering not yet supported in grpc-go');

		draggedScenePlanId = null;
	}

	function handleScenePlanDragEnd() {
		draggedScenePlanId = null;
		dragOverScenePlanIndex = null;
	}

	onMount(() => {
		if (browser && scenariosList.length === 0) {
			loadScenarios();
		}
	});
</script>

<div class="resource-page">
	<ProjectSidebar projectId={projectId} />
	
	<div class="main-content">
		<header class="page-header">
			<h1 class="page-title">Scenario</h1>
			<button 
				class="create-button" 
				onclick={() => showCreateDialog = true}
				disabled={isCreating}
			>
				+ Create Scenario
			</button>
		</header>

		<main class="page-content">
			{#if loading}
				<div class="loading-state">
					<p>Loading scenarios...</p>
				</div>
			{:else if error}
				<div class="error-state">
					<div class="error-message">Error: {error.message}</div>
				<button
					onclick={loadScenarios}
					class="retry-button"
				>
					Retry
				</button>
				</div>
			{:else if scenariosList.length === 0}
				<div class="empty-state">
					<svg width="64" height="64" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
						<path d="M4 3C4 2.44772 4.44772 2 5 2H15C15.5523 2 16 2.44772 16 3V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V3Z"/>
						<path d="M4 6H16"/>
					</svg>
					<h2>No Scenarios</h2>
					<p>Create your first scenario to start planning your story structure.</p>
				</div>
			{:else}
				<div class="scenarios-list">
					{#each scenariosList as scenario (scenario.id)}
						<div class="scenario-item">
							<div class="scenario-header" onclick={() => toggleScenario(scenario.id)}>
								<button class="expand-button">
									{expandedScenarios.has(scenario.id) ? '▼' : '▶'}
								</button>
								<div class="scenario-info">
									<h3 class="scenario-title">{scenario.title}</h3>
									{#if scenario.description}
										<p class="scenario-description">{scenario.description}</p>
									{/if}
								</div>
								<div class="scenario-actions">
									<button 
										class="action-button"
										onclick={(e) => {
											e.stopPropagation();
											openEditDialog(scenario);
										}}
									>
										Edit
									</button>
									<button 
										class="action-button delete-button"
										onclick={(e) => {
											e.stopPropagation();
											openDeleteDialog(scenario.id);
										}}
									>
										Delete
									</button>
								</div>
							</div>
							{#if expandedScenarios.has(scenario.id)}
								<!-- TODO: Episode/Part/ScenePlan display will be added when grpc-go supports them -->
								<div class="scenario-content">
									<p style="padding: 1rem; color: rgba(255, 255, 255, 0.5);">
										Episode/Part/ScenePlan support coming soon
									</p>
								</div>
							{/if}
							{#if false && expandedScenarios.has(scenario.id) && selectedScenario}
								<div class="scenario-content">
									<div class="episodes-section">
										<div class="section-header">
											<h4>Episodes</h4>
											<button 
												class="add-button"
												onclick={() => {
													selectedScenarioId = scenario.id;
													showEpisodeDialog = true;
												}}
											>
												+ Add Episode
											</button>
										</div>
										{#if selectedScenario.episodes && selectedScenario.episodes.length > 0}
											{#each selectedScenario.episodes as episode, episodeIndex (episode.id)}
												<div 
													class="episode-item"
													class:dragging={draggedEpisodeId === episode.id}
													class:drag-over={dragOverEpisodeIndex === episodeIndex}
													draggable="true"
													ondragstart={(e) => handleEpisodeDragStart(e, episode.id)}
													ondragover={(e) => handleEpisodeDragOver(e, episodeIndex)}
													ondragleave={handleEpisodeDragLeave}
													ondrop={(e) => handleEpisodeDrop(e, episodeIndex)}
													ondragend={handleEpisodeDragEnd}
												>
													<div class="episode-header" onclick={() => toggleEpisode(episode.id)}>
														<button class="expand-button">
															{expandedEpisodes.has(episode.id) ? '▼' : '▶'}
														</button>
														<h5 class="episode-title">{episode.title}</h5>
													</div>
													{#if expandedEpisodes.has(episode.id) && episode.parts}
														<div class="parts-section">
															<div class="section-header">
																<h6>Parts</h6>
																<button 
																	class="add-button"
																	onclick={() => {
																		selectedEpisodeId = episode.id;
																		showPartDialog = true;
																	}}
																>
																	+ Add Part
																</button>
															</div>
															{#if episode.parts.length > 0}
																{#each episode.parts as part, partIndex (part.id)}
																	<div 
																		class="part-item"
																		class:dragging={draggedPartId === part.id}
																		class:drag-over={dragOverPartIndex === partIndex}
																		draggable="true"
																		ondragstart={(e) => handlePartDragStart(e, part.id)}
																		ondragover={(e) => handlePartDragOver(e, partIndex)}
																		ondragleave={handlePartDragLeave}
																		ondrop={(e) => handlePartDrop(e, partIndex, episode.id)}
																		ondragend={handlePartDragEnd}
																	>
																		<div class="part-header" onclick={() => togglePart(part.id)}>
																			<button class="expand-button">
																				{expandedParts.has(part.id) ? '▼' : '▶'}
																			</button>
																			<h6 class="part-title">{part.title}</h6>
																		</div>
																		{#if expandedParts.has(part.id) && part.scenePlans}
																			<div class="scene-plans-section">
																				<div class="section-header">
																					<h6>Scene Plans</h6>
																					<button 
																						class="add-button"
																						onclick={() => {
																							selectedPartId = part.id;
																							showScenePlanDialog = true;
																						}}
																					>
																						+ Add Scene Plan
																					</button>
																				</div>
																				{#if part.scenePlans.length > 0}
																					<ul class="scene-plans-list">
																						{#each part.scenePlans as scenePlan, scenePlanIndex (scenePlan.id)}
																							<li 
																								class="scene-plan-item"
																								class:dragging={draggedScenePlanId === scenePlan.id}
																								class:drag-over={dragOverScenePlanIndex === scenePlanIndex}
																								draggable="true"
																								ondragstart={(e) => handleScenePlanDragStart(e, scenePlan.id)}
																								ondragover={(e) => handleScenePlanDragOver(e, scenePlanIndex)}
																								ondragleave={handleScenePlanDragLeave}
																								ondrop={(e) => handleScenePlanDrop(e, scenePlanIndex, part.id)}
																								ondragend={handleScenePlanDragEnd}
																							>{scenePlan.description}</li>
																						{/each}
																					</ul>
																				{:else}
																					<p class="empty-text">No scene plans yet</p>
																				{/if}
																			</div>
																		{/if}
																	</div>
																{/each}
															{:else}
																<p class="empty-text">No parts yet</p>
															{/if}
														</div>
													{/if}
												</div>
											{/each}
										{:else}
											<p class="empty-text">No episodes yet</p>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</main>
	</div>
</div>

<!-- Create Scenario Dialog -->
{#if showCreateDialog}
	<div class="dialog-overlay" onclick={() => showCreateDialog = false}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>Create Scenario</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateScenario();
				}}
			>
				<div class="form-group">
					<label for="scenario-title">Title *</label>
					<input
						id="scenario-title"
						type="text"
						bind:value={newScenarioTitle}
						placeholder="Enter scenario title"
						required
						disabled={isCreating}
					/>
				</div>
				<div class="form-group">
					<label for="scenario-description">Description</label>
					<textarea
						id="scenario-description"
						bind:value={newScenarioDescription}
						placeholder="Enter scenario description (optional)"
						disabled={isCreating}
						rows="3"
					></textarea>
				</div>
				<div class="dialog-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={() => {
							showCreateDialog = false;
							newScenarioTitle = '';
							newScenarioDescription = '';
						}}
						disabled={isCreating}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="create-button"
						disabled={isCreating || !newScenarioTitle.trim()}
					>
						{isCreating ? 'Creating...' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Scenario Dialog -->
{#if showEditDialog}
	<div class="dialog-overlay" onclick={() => showEditDialog = false}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>Edit Scenario</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleUpdateScenario();
				}}
			>
				<div class="form-group">
					<label for="edit-scenario-title">Title</label>
					<input
						id="edit-scenario-title"
						type="text"
						bind:value={editScenarioTitle}
						placeholder="Enter scenario title"
						disabled={isUpdating}
					/>
				</div>
				<div class="form-group">
					<label for="edit-scenario-description">Description</label>
					<textarea
						id="edit-scenario-description"
						bind:value={editScenarioDescription}
						placeholder="Enter scenario description (optional)"
						disabled={isUpdating}
						rows="3"
					></textarea>
				</div>
				<div class="dialog-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={() => {
							showEditDialog = false;
							selectedScenarioId = null;
						}}
						disabled={isUpdating}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="create-button"
						disabled={isUpdating}
					>
						{isUpdating ? 'Updating...' : 'Update'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Scenario Dialog -->
{#if showDeleteDialog}
	<div class="dialog-overlay" onclick={() => showDeleteDialog = false}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Scenario</h2>
			<p>Are you sure you want to delete this scenario? This action cannot be undone.</p>
			<div class="dialog-actions">
				<button
					type="button"
					class="cancel-button"
					onclick={() => {
						showDeleteDialog = false;
						selectedScenarioId = null;
					}}
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="delete-button"
					onclick={handleDeleteScenario}
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Create Episode Dialog -->
{#if showEpisodeDialog}
	<div class="dialog-overlay" onclick={() => showEpisodeDialog = false}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>Create Episode</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateEpisode();
				}}
			>
				<div class="form-group">
					<label for="episode-title">Title *</label>
					<input
						id="episode-title"
						type="text"
						bind:value={newEpisodeTitle}
						placeholder="Enter episode title"
						required
						disabled={isCreating}
					/>
				</div>
				<div class="form-group">
					<label for="episode-description">Description</label>
					<textarea
						id="episode-description"
						bind:value={newEpisodeDescription}
						placeholder="Enter episode description (optional)"
						disabled={isCreating}
						rows="3"
					></textarea>
				</div>
				<div class="dialog-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={() => {
							showEpisodeDialog = false;
							newEpisodeTitle = '';
							newEpisodeDescription = '';
						}}
						disabled={isCreating}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="create-button"
						disabled={isCreating || !newEpisodeTitle.trim()}
					>
						{isCreating ? 'Creating...' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Create Part Dialog -->
{#if showPartDialog}
	<div class="dialog-overlay" onclick={() => showPartDialog = false}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>Create Part</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreatePart();
				}}
			>
				<div class="form-group">
					<label for="part-title">Title *</label>
					<input
						id="part-title"
						type="text"
						bind:value={newPartTitle}
						placeholder="Enter part title"
						required
						disabled={isCreating}
					/>
				</div>
				<div class="form-group">
					<label for="part-description">Description</label>
					<textarea
						id="part-description"
						bind:value={newPartDescription}
						placeholder="Enter part description (optional)"
						disabled={isCreating}
						rows="3"
					></textarea>
				</div>
				<div class="dialog-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={() => {
							showPartDialog = false;
							newPartTitle = '';
							newPartDescription = '';
						}}
						disabled={isCreating}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="create-button"
						disabled={isCreating || !newPartTitle.trim()}
					>
						{isCreating ? 'Creating...' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Create Scene Plan Dialog -->
{#if showScenePlanDialog}
	<div class="dialog-overlay" onclick={() => showScenePlanDialog = false}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>Create Scene Plan</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateScenePlan();
				}}
			>
				<div class="form-group">
					<label for="scene-plan-description">Description *</label>
					<textarea
						id="scene-plan-description"
						bind:value={newScenePlanDescription}
						placeholder="Enter scene plan description"
						required
						disabled={isCreating}
						rows="4"
					></textarea>
				</div>
				<div class="dialog-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={() => {
							showScenePlanDialog = false;
							newScenePlanDescription = '';
						}}
						disabled={isCreating}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="create-button"
						disabled={isCreating || !newScenePlanDescription.trim()}
					>
						{isCreating ? 'Creating...' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.resource-page {
		display: flex;
		flex-direction: row;
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.page-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background-color: #1a1a1a;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 500;
		margin: 0;
		color: #ffffff;
	}

	.page-content {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
	}

	.create-button {
		padding: 0.5rem 1rem;
		background-color: #ffffff;
		color: #000000;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.create-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.9);
	}

	.create-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
	}

	.error-message {
		color: #ff6b6b;
		margin-bottom: 1rem;
	}

	.retry-button {
		padding: 0.5rem 1rem;
		background-color: #ffffff;
		color: #000000;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.scenarios-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.scenario-item {
		background-color: #2a2a2a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		overflow: hidden;
	}

	.scenario-header {
		display: flex;
		align-items: center;
		padding: 1rem;
		cursor: pointer;
		gap: 0.75rem;
	}

	.expand-button {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0.25rem;
	}

	.scenario-info {
		flex: 1;
	}

	.scenario-title {
		font-size: 1.125rem;
		font-weight: 500;
		margin: 0 0 0.25rem 0;
		color: #ffffff;
	}

	.scenario-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}

	.scenario-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-button {
		padding: 0.375rem 0.75rem;
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.action-button:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}

	.delete-button {
		background-color: rgba(255, 107, 107, 0.2);
		border-color: rgba(255, 107, 107, 0.5);
	}

	.delete-button:hover {
		background-color: rgba(255, 107, 107, 0.3);
	}

	.scenario-content {
		padding: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background-color: #1f1f1f;
	}

	.episodes-section,
	.parts-section,
	.scene-plans-section {
		margin-top: 1rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-header h4,
	.section-header h6 {
		font-size: 1rem;
		font-weight: 500;
		margin: 0;
		color: #ffffff;
	}

	.add-button {
		padding: 0.375rem 0.75rem;
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.add-button:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}

	.episode-item,
	.part-item {
		cursor: move;
		transition: opacity 0.2s, transform 0.2s;
	}

	.episode-item.dragging,
	.part-item.dragging {
		opacity: 0.5;
	}

	.episode-item.drag-over,
	.part-item.drag-over {
		border-top: 2px solid #ffffff;
		transform: translateY(-2px);
	}

	.scene-plan-item {
		cursor: move;
		transition: opacity 0.2s, transform 0.2s;
	}

	.scene-plan-item.dragging {
		opacity: 0.5;
	}

	.scene-plan-item.drag-over {
		border-top: 2px solid #ffffff;
		transform: translateY(-2px);
	}

	.episode-item,
	.part-item {
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		background-color: #252525;
		border-radius: 4px;
	}

	.episode-header,
	.part-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.scenario-title-link {
		text-decoration: none;
		color: inherit;
		flex: 1;
	}

	.scenario-title-link:hover .scenario-title {
		text-decoration: underline;
	}

	.episode-title,
	.part-title {
		font-size: 0.9375rem;
		font-weight: 500;
		margin: 0;
		color: #ffffff;
	}

	.scene-plans-list {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0 0;
	}

	.scene-plan-item {
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		background-color: #1f1f1f;
		border-radius: 4px;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.empty-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0.5rem 0;
	}

	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.dialog {
		background-color: #2a2a2a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 2rem;
		min-width: 400px;
		max-width: 600px;
		color: #ffffff;
	}

	.dialog h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		font-size: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #ffffff;
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: #ffffff;
		font-size: 1rem;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.5);
	}

	.form-group input:disabled,
	.form-group textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
	}

	.cancel-button {
		padding: 0.75rem 1.5rem;
		background-color: transparent;
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.cancel-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.cancel-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
