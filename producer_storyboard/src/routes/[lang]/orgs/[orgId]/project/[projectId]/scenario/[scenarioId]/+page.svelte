<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { GetScenarioStore } from '$houdini/plugins/houdini-svelte/stores/GetScenario.js';
	import { 
		CreateEpisodeStore,
		CreatePartStore,
		CreateScenePlanStore,
		ReorderEpisodesStore,
		ReorderPartsStore,
		ReorderScenePlansStore,
		UpdateScenarioStore,
		DeleteScenarioStore
	} from '$houdini/plugins/houdini-svelte/stores/index.js';
	import { ConvertScenarioToStoryboardStore } from '$houdini/plugins/houdini-svelte/stores/ConvertScenarioToStoryboard.js';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const { lang, orgId, projectId, scenarioId } = $page.params;

	// SSR: Get the GetScenario store from page data
	interface PageData {
		GetScenario: GetScenarioStore;
	}
	const props = $props<{ data: PageData }>();
	const scenarioStore = $derived(props.data.GetScenario);

	// Initialize stores
	let createEpisodeStore: CreateEpisodeStore | null = null;
	let createPartStore: CreatePartStore | null = null;
	let createScenePlanStore: CreateScenePlanStore | null = null;
	let reorderEpisodesStore: ReorderEpisodesStore | null = null;
	let reorderPartsStore: ReorderPartsStore | null = null;
	let reorderScenePlansStore: ReorderScenePlansStore | null = null;
	let updateScenarioStore: UpdateScenarioStore | null = null;
	let deleteScenarioStore: DeleteScenarioStore | null = null;
	let convertScenarioToStoryboardStore: ConvertScenarioToStoryboardStore | null = null;

	if (browser) {
		createEpisodeStore = new CreateEpisodeStore();
		createPartStore = new CreatePartStore();
		createScenePlanStore = new CreateScenePlanStore();
		reorderEpisodesStore = new ReorderEpisodesStore();
		reorderPartsStore = new ReorderPartsStore();
		reorderScenePlansStore = new ReorderScenePlansStore();
		updateScenarioStore = new UpdateScenarioStore();
		deleteScenarioStore = new DeleteScenarioStore();
		convertScenarioToStoryboardStore = new ConvertScenarioToStoryboardStore();
	}

	// State
	let showEpisodeDialog = $state(false);
	let showPartDialog = $state(false);
	let showScenePlanDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let selectedEpisodeId = $state<string | null>(null);
	let selectedPartId = $state<string | null>(null);
	let expandedEpisodes = $state<Set<string>>(new Set());
	let expandedParts = $state<Set<string>>(new Set());

	// Form state
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
	let isConverting = $state(false);

	// Drag and drop state
	let draggedEpisodeId = $state<string | null>(null);
	let draggedPartId = $state<string | null>(null);
	let draggedScenePlanId = $state<string | null>(null);
	let dragOverEpisodeIndex = $state<number | null>(null);
	let dragOverPartIndex = $state<number | null>(null);
	let dragOverScenePlanIndex = $state<number | null>(null);

	// Computed properties
	const loading = $derived($scenarioStore.fetching && !$scenarioStore.data);
	const error = $derived($scenarioStore.errors?.[0] ? new Error($scenarioStore.errors[0].message) : null);
	const scenario = $derived($scenarioStore.data?.scenario);

	// Load scenario data when scenarioId changes
	$effect(() => {
		if (scenarioId && browser && scenarioStore) {
			scenarioStore.fetch({
				variables: { id: scenarioId },
			});
		}
	});

	async function handleUpdateScenario() {
		if (!scenarioId || !updateScenarioStore) return;

		isUpdating = true;
		try {
			const result = await updateScenarioStore.mutate({
				input: {
					id: scenarioId,
					title: editScenarioTitle.trim() || null,
					description: editScenarioDescription.trim() || null,
				},
			});

			if (result?.data?.updateScenario) {
				await scenarioStore.fetch({ blocking: true });
				showEditDialog = false;
			}
		} catch (error) {
			console.error('Failed to update scenario:', error);
			alert(`Failed to update scenario: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isUpdating = false;
		}
	}

	async function handleDeleteScenario() {
		if (!scenarioId || !deleteScenarioStore) return;

		isDeleting = true;
		try {
			const result = await deleteScenarioStore.mutate({
				id: scenarioId,
			});

			if (result?.data?.deleteScenario) {
				// Navigate back to scenario list
				await goto(`/${lang}/orgs/${orgId}/project/${projectId}/scenario`);
			}
		} catch (error) {
			console.error('Failed to delete scenario:', error);
			alert(`Failed to delete scenario: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isDeleting = false;
		}
	}

	async function handleCreateEpisode() {
		if (!scenarioId || !newEpisodeTitle.trim() || !createEpisodeStore) return;

		isCreating = true;
		try {
			const result = await createEpisodeStore.mutate({
				input: {
					scenarioId: scenarioId,
					title: newEpisodeTitle.trim(),
					description: newEpisodeDescription.trim() || null,
				},
			});

			if (result?.data?.createEpisode) {
				await scenarioStore.fetch({ blocking: true });
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

			if (result?.data?.createPart) {
				await scenarioStore.fetch({ blocking: true });
				showPartDialog = false;
				newPartTitle = '';
				newPartDescription = '';
			}
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

			if (result?.data?.createScenePlan) {
				await scenarioStore.fetch({ blocking: true });
				showScenePlanDialog = false;
				newScenePlanDescription = '';
			}
		} catch (error) {
			console.error('Failed to create scene plan:', error);
			alert(`Failed to create scene plan: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isCreating = false;
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

	function openEditDialog() {
		if (scenario) {
			editScenarioTitle = scenario.title;
			editScenarioDescription = scenario.description || '';
			showEditDialog = true;
		}
	}

	function openDeleteDialog() {
		showDeleteDialog = true;
	}

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

		if (!draggedEpisodeId || !scenario || !scenarioId || !reorderEpisodesStore) return;

		const episodes = scenario.episodes || [];
		const dragIndex = episodes.findIndex((ep: { id: string }) => ep.id === draggedEpisodeId);
		
		if (dragIndex === -1 || dragIndex === dropIndex) {
			draggedEpisodeId = null;
			return;
		}

		// Reorder episodes array
		const reorderedEpisodes = [...episodes];
		const [draggedEpisode] = reorderedEpisodes.splice(dragIndex, 1);
		reorderedEpisodes.splice(dropIndex, 0, draggedEpisode);

		// Update order via GraphQL mutation
		try {
			const result = await reorderEpisodesStore.mutate({
				input: {
					scenarioId: scenarioId,
					episodeIds: reorderedEpisodes.map((ep: { id: string }) => ep.id),
				},
			});

			if (result?.data?.reorderEpisodes) {
				// Refresh scenario data
				await scenarioStore.fetch({
					variables: { id: scenarioId },
					blocking: true,
				});
			}
		} catch (error) {
			console.error('Failed to reorder episodes:', error);
			alert(`Failed to reorder episodes: ${error instanceof Error ? error.message : String(error)}`);
		}

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

		if (!draggedPartId || !scenario || !reorderPartsStore) return;

		const episode = scenario.episodes?.find((ep: { id: string }) => ep.id === episodeId);
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

		// Update order via GraphQL mutation
		try {
			const result = await reorderPartsStore.mutate({
				input: {
					episodeId: episodeId,
					partIds: reorderedParts.map((part: { id: string }) => part.id),
				},
			});

			if (result?.data?.reorderParts) {
				// Refresh scenario data
				await scenarioStore.fetch({
					variables: { id: scenarioId },
					blocking: true,
				});
			}
		} catch (error) {
			console.error('Failed to reorder parts:', error);
			alert(`Failed to reorder parts: ${error instanceof Error ? error.message : String(error)}`);
		}

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

		if (!draggedScenePlanId || !scenario || !reorderScenePlansStore) return;

		// Find the part that contains this scene plan
		let targetPart: { id: string; scenePlans?: Array<{ id: string }> } | null = null;
		for (const episode of scenario.episodes || []) {
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

		// Update order via GraphQL mutation
		try {
			const result = await reorderScenePlansStore.mutate({
				input: {
					partId: partId,
					scenePlanIds: reorderedScenePlans.map((sp: { id: string }) => sp.id),
				},
			});

			if (result?.data?.reorderScenePlans) {
				// Refresh scenario data
				await scenarioStore.fetch({
					variables: { id: scenarioId },
					blocking: true,
				});
			}
		} catch (error) {
			console.error('Failed to reorder scene plans:', error);
			alert(`Failed to reorder scene plans: ${error instanceof Error ? error.message : String(error)}`);
		}

		draggedScenePlanId = null;
	}

	function handleScenePlanDragEnd() {
		draggedScenePlanId = null;
		dragOverScenePlanIndex = null;
	}

	async function handleConvertToStoryboard() {
		if (!scenarioId || !convertScenarioToStoryboardStore) return;

		isConverting = true;
		try {
			const result = await convertScenarioToStoryboardStore.mutate({
				input: {
					scenarioId: scenarioId,
					storyboardTitle: scenario ? `${scenario.title} - Storyboard` : null,
				},
			});

			if (result?.data?.convertScenarioToStoryboard) {
				const storyboardId = result.data.convertScenarioToStoryboard.id;
				// Navigate to storyboard editor
				await goto(`/${lang}/orgs/${orgId}/project/${projectId}/${storyboardId}/editor`);
			}
		} catch (error) {
			console.error('Failed to convert scenario to storyboard:', error);
			alert(`Failed to convert scenario to storyboard: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isConverting = false;
		}
	}
</script>

<div class="resource-page">
	<ProjectSidebar projectId={projectId} />
	
	<div class="main-content">
		<header class="page-header">
			<a 
				href={`/${lang}/orgs/${orgId}/project/${projectId}/scenario`}
				class="back-link"
			>
				← Back to Scenarios
			</a>
			<div class="header-actions">
				<h1 class="page-title">{scenario?.title || 'Loading...'}</h1>
				<div class="action-buttons">
					<button 
						class="convert-button" 
						onclick={handleConvertToStoryboard}
						disabled={isConverting || !scenario}
					>
						{isConverting ? 'Converting...' : 'Convert to Storyboard'}
					</button>
					<button 
						class="edit-button" 
						onclick={openEditDialog}
						disabled={isUpdating || !scenario}
					>
						Edit
					</button>
					<button 
						class="delete-button" 
						onclick={openDeleteDialog}
						disabled={isDeleting || !scenario}
					>
						Delete
					</button>
				</div>
			</div>
			{#if scenario?.description}
				<p class="scenario-description">{scenario.description}</p>
			{/if}
		</header>

		<main class="page-content">
			{#if loading}
				<div class="loading-state">
					<p>Loading scenario...</p>
				</div>
			{:else if error}
				<div class="error-state">
					<div class="error-message">Error: {error.message}</div>
					<button
						onclick={async () => {
							try {
								await scenarioStore.fetch();
							} catch (error) {
								console.error('Failed to retry:', error);
							}
						}}
						class="retry-button"
					>
						Retry
					</button>
				</div>
			{:else if !scenario}
				<div class="empty-state">
					<p>Scenario not found</p>
				</div>
			{:else}
				<div class="scenario-detail">
					<div class="episodes-section">
						<div class="section-header">
							<h2>Episodes</h2>
							<button 
								class="add-button"
								onclick={() => showEpisodeDialog = true}
								disabled={isCreating}
							>
								+ Add Episode
							</button>
						</div>
						{#if scenario.episodes && scenario.episodes.length > 0}
							<div class="episodes-list">
								{#each scenario.episodes as episode, episodeIndex (episode.id)}
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
											<h3 class="episode-title">{episode.title}</h3>
										</div>
										{#if expandedEpisodes.has(episode.id) && episode.parts}
											<div class="parts-section">
												<div class="section-header">
													<h4>Parts</h4>
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
													<div class="parts-list">
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
																	<h4 class="part-title">{part.title}</h4>
																</div>
																{#if expandedParts.has(part.id) && part.scenePlans}
																	<div class="scene-plans-section">
																		<div class="section-header">
																			<h5>Scene Plans</h5>
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
													</div>
												{:else}
													<p class="empty-text">No parts yet</p>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<p class="empty-text">No episodes yet. Create your first episode to start planning.</p>
						{/if}
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<!-- Edit Scenario Dialog -->
{#if showEditDialog && scenario}
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
		min-height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
	}

	.main-content {
		flex: 1;
		padding: 2rem;
		margin-left: 250px;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1rem;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		color: #ffffff;
		text-decoration: underline;
	}

	.header-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 600;
		margin: 0;
		color: #ffffff;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.convert-button {
		padding: 0.5rem 1rem;
		background-color: #4a90e2;
		color: #ffffff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.convert-button:hover:not(:disabled) {
		background-color: #357abd;
	}

	.convert-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.edit-button,
	.delete-button {
		padding: 0.5rem 1rem;
		background-color: #252525;
		color: #ffffff;
		border: 1px solid #404040;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.edit-button:hover:not(:disabled) {
		background-color: #303030;
	}

	.delete-button:hover:not(:disabled) {
		background-color: #4a1a1a;
		border-color: #6a2a2a;
	}

	.edit-button:disabled,
	.delete-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.scenario-description {
		color: rgba(255, 255, 255, 0.7);
		margin-top: 0.5rem;
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

	.scenario-detail {
		max-width: 1200px;
	}

	.episodes-section {
		margin-top: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2,
	.section-header h4,
	.section-header h5 {
		margin: 0;
		color: #ffffff;
	}

	.section-header h2 {
		font-size: 1.5rem;
	}

	.section-header h4 {
		font-size: 1.125rem;
	}

	.section-header h5 {
		font-size: 1rem;
	}

	.add-button {
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

	.add-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.9);
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.episodes-list,
	.parts-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.episode-item,
	.part-item {
		cursor: move;
		transition: opacity 0.2s, transform 0.2s;
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		background-color: #252525;
		border-radius: 4px;
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

	.episode-header,
	.part-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.expand-button {
		background: none;
		border: none;
		color: #ffffff;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0.25rem;
	}

	.episode-title,
	.part-title {
		font-size: 0.9375rem;
		font-weight: 500;
		margin: 0;
		color: #ffffff;
	}

	.parts-section,
	.scene-plans-section {
		margin-top: 1rem;
		margin-left: 1.5rem;
	}

	.scene-plans-list {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0 0;
	}

	.scene-plan-item {
		cursor: move;
		transition: opacity 0.2s, transform 0.2s;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		background-color: #1f1f1f;
		border-radius: 4px;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.scene-plan-item.dragging {
		opacity: 0.5;
	}

	.scene-plan-item.drag-over {
		border-top: 2px solid #ffffff;
		transform: translateY(-2px);
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
		background-color: #252525;
		border-radius: 8px;
		padding: 2rem;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.dialog h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: #ffffff;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem;
		background-color: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 4px;
		color: #ffffff;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #ffffff;
	}

	.form-group input:disabled,
	.form-group textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	.cancel-button {
		padding: 0.5rem 1rem;
		background-color: #404040;
		color: #ffffff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.cancel-button:hover:not(:disabled) {
		background-color: #505050;
	}

	.cancel-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
</style>
