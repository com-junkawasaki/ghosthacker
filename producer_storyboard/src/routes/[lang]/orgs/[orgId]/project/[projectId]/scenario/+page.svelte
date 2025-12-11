<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { 
		type ListScenariosStore, 
		CreateScenarioStore,
		UpdateScenarioStore,
		DeleteScenarioStore,
		CreateEpisodeStore,
		CreatePartStore,
		CreateScenePlanStore,
		type GetScenarioStore
	} from '$houdini';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const { lang, orgId, projectId } = $page.params;

	// SSR: Get the ListScenarios store from page data
	interface PageData {
		ListScenarios: ListScenariosStore;
	}
	const props = $props<{ data: PageData }>();
	const scenarios = $derived(props.data.ListScenarios);

	// Initialize stores
	let createScenarioStore: CreateScenarioStore | null = null;
	let updateScenarioStore: UpdateScenarioStore | null = null;
	let deleteScenarioStore: DeleteScenarioStore | null = null;
	let createEpisodeStore: CreateEpisodeStore | null = null;
	let createPartStore: CreatePartStore | null = null;
	let createScenePlanStore: CreateScenePlanStore | null = null;
	let getScenarioStore: GetScenarioStore | null = null;

	if (browser) {
		createScenarioStore = new CreateScenarioStore();
		updateScenarioStore = new UpdateScenarioStore();
		deleteScenarioStore = new DeleteScenarioStore();
		createEpisodeStore = new CreateEpisodeStore();
		createPartStore = new CreatePartStore();
		createScenePlanStore = new CreateScenePlanStore();
		getScenarioStore = new GetScenarioStore();
	}

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

	// Computed properties
	const scenariosStore = $derived(scenarios);
	const loading = $derived($scenariosStore.fetching && !$scenariosStore.data);
	const error = $derived($scenariosStore.errors?.[0] ? new Error($scenariosStore.errors[0].message) : null);
	const scenariosList = $derived($scenariosStore.data?.scenarios ?? []);

	// Load scenario details when selected
	$effect(() => {
		if (selectedScenarioId && getScenarioStore && browser) {
			getScenarioStore.fetch({
				variables: { id: selectedScenarioId },
			});
		}
	});

	async function handleCreateScenario() {
		if (!newScenarioTitle.trim() || !createScenarioStore) return;

		isCreating = true;
		try {
			const result = await createScenarioStore.mutate({
				input: {
					projectId: projectId,
					title: newScenarioTitle.trim(),
					description: newScenarioDescription.trim() || null,
				},
			});

			if (result?.data?.createScenario) {
				await scenariosStore.fetch({ blocking: true });
				showCreateDialog = false;
				newScenarioTitle = '';
				newScenarioDescription = '';
			}
		} catch (error) {
			console.error('Failed to create scenario:', error);
			alert(`Failed to create scenario: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isCreating = false;
		}
	}

	async function handleUpdateScenario() {
		if (!selectedScenarioId || !updateScenarioStore) return;

		isUpdating = true;
		try {
			const result = await updateScenarioStore.mutate({
				input: {
					id: selectedScenarioId,
					title: editScenarioTitle.trim() || null,
					description: editScenarioDescription.trim() || null,
				},
			});

			if (result?.data?.updateScenario) {
				await scenariosStore.fetch({ blocking: true });
				showEditDialog = false;
				selectedScenarioId = null;
			}
		} catch (error) {
			console.error('Failed to update scenario:', error);
			alert(`Failed to update scenario: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isUpdating = false;
		}
	}

	async function handleDeleteScenario() {
		if (!selectedScenarioId || !deleteScenarioStore) return;

		isDeleting = true;
		try {
			const result = await deleteScenarioStore.mutate({
				id: selectedScenarioId,
			});

			if (result?.data?.deleteScenario) {
				await scenariosStore.fetch({ blocking: true });
				showDeleteDialog = false;
				selectedScenarioId = null;
			}
		} catch (error) {
			console.error('Failed to delete scenario:', error);
			alert(`Failed to delete scenario: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isDeleting = false;
		}
	}

	async function handleCreateEpisode() {
		if (!selectedScenarioId || !newEpisodeTitle.trim() || !createEpisodeStore) return;

		isCreating = true;
		try {
			const result = await createEpisodeStore.mutate({
				input: {
					scenarioId: selectedScenarioId,
					title: newEpisodeTitle.trim(),
					description: newEpisodeDescription.trim() || null,
				},
			});

			if (result?.data?.createEpisode) {
				if (getScenarioStore) {
					await getScenarioStore.fetch({
						variables: { id: selectedScenarioId },
						blocking: true,
					});
				}
				showEpisodeDialog = false;
				newEpisodeTitle = '';
				newEpisodeDescription = '';
			}
		} catch (error) {
			console.error('Failed to create episode:', error);
			alert(`Failed to create episode: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isCreating = false;
		}
	}

	async function handleCreatePart() {
		if (!selectedEpisodeId || !newPartTitle.trim() || !createPartStore) return;

		isCreating = true;
		try {
			const result = await createPartStore.mutate({
				input: {
					episodeId: selectedEpisodeId,
					title: newPartTitle.trim(),
					description: newPartDescription.trim() || null,
				},
			});

			if (result?.data?.createPart && selectedScenarioId && getScenarioStore) {
				await getScenarioStore.fetch({
					variables: { id: selectedScenarioId },
					blocking: true,
				});
			}
			showPartDialog = false;
			newPartTitle = '';
			newPartDescription = '';
		} catch (error) {
			console.error('Failed to create part:', error);
			alert(`Failed to create part: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isCreating = false;
		}
	}

	async function handleCreateScenePlan() {
		if (!selectedPartId || !newScenePlanDescription.trim() || !createScenePlanStore) return;

		isCreating = true;
		try {
			const result = await createScenePlanStore.mutate({
				input: {
					partId: selectedPartId,
					description: newScenePlanDescription.trim(),
				},
			});

			if (result?.data?.createScenePlan && selectedScenarioId && getScenarioStore) {
				await getScenarioStore.fetch({
					variables: { id: selectedScenarioId },
					blocking: true,
				});
			}
			showScenePlanDialog = false;
			newScenePlanDescription = '';
		} catch (error) {
			console.error('Failed to create scene plan:', error);
			alert(`Failed to create scene plan: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isCreating = false;
		}
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

	const selectedScenario = $derived(
		selectedScenarioId && getScenarioStore && $getScenarioStore?.data?.scenario
			? $getScenarioStore.data.scenario
			: null
	);
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
						onclick={async () => {
							try {
								await scenariosStore.fetch();
							} catch (error) {
								console.error('Failed to retry:', error);
							}
						}}
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
							{#if expandedScenarios.has(scenario.id) && selectedScenario}
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
											{#each selectedScenario.episodes as episode (episode.id)}
												<div class="episode-item">
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
																{#each episode.parts as part (part.id)}
																	<div class="part-item">
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
																						{#each part.scenePlans as scenePlan (scenePlan.id)}
																							<li class="scene-plan-item">{scenePlan.description}</li>
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
