<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		ListStoryboardsStore,
		ListScenesStore,
	} from '$houdini';
	import { CreateSceneStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/CreateScene.js';
	import { UpdateSceneStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/UpdateScene.js';
	import { DeleteSceneStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/DeleteScene.js';
	import { ReorderScenesStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/ReorderScenes.js';

	type Scene = {
		id: string;
		sceneNumber: number;
		textDescription: string | null;
		startTimeSeconds: number | null;
		durationSeconds: number | null;
		mediaUrl: string | null;
	};

	const projectId: string = $page.params.projectId || '';
	
	// Houdini stores - initialize only in browser
	let storyboardsStore: ListStoryboardsStore | null = null;
	let scenesStore: ListScenesStore | null = null;
	let createSceneStore: CreateSceneStore | null = null;
	let updateSceneStore: UpdateSceneStore | null = null;
	let deleteSceneStore: DeleteSceneStore | null = null;
	let reorderScenesStore: ReorderScenesStore | null = null;

	if (browser) {
		storyboardsStore = new ListStoryboardsStore();
		scenesStore = new ListScenesStore();
		createSceneStore = new CreateSceneStore();
		updateSceneStore = new UpdateSceneStore();
		deleteSceneStore = new DeleteSceneStore();
		reorderScenesStore = new ReorderScenesStore();
	}

	// State management with $state for reactive updates
	let scenes = $state<Scene[]>([]);
	let storyboardId = $state<string | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let generating = $state(false);
	let draggedSceneId = $state<string | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let hoveredInsertIndex = $state<number | null>(null);

	let selectedSceneId = $state<string | null>(null);
	
	// Initialize selected scene
	$effect(() => {
		if (!selectedSceneId && scenes.length > 0 && scenes[0]) {
			selectedSceneId = scenes[0].id;
		}
	});

	// Calculate total duration from scenes
	const totalDuration = $derived.by(() => {
		return scenes.reduce((sum, scene) => sum + (scene.durationSeconds || 0), 0) || 5;
	});

	// Load storyboards and scenes
	async function loadData() {
		if (!projectId || !browser || !storyboardsStore || !scenesStore) {
			if (!browser) {
				error = 'This page requires browser environment';
			} else if (!storyboardsStore || !scenesStore) {
				error = 'Stores not initialized';
			} else {
				error = 'Project ID is required';
			}
			loading = false;
			return;
		}

		try {
			loading = true;
			error = null;

			// Load storyboards for the project
			const storyboardsResult = await storyboardsStore.fetch({ variables: { projectId } });
			
			if (storyboardsResult.errors && storyboardsResult.errors.length > 0) {
				throw new Error(storyboardsResult.errors[0].message);
			}

			const storyboards = storyboardsResult.data?.storyboards || [];
			
			if (storyboards.length === 0) {
				error = 'No storyboard found for this project. Please create a storyboard first.';
				loading = false;
				return;
			}

			// Use the first storyboard (or we could let user select)
			const firstStoryboard = storyboards[0];
			storyboardId = firstStoryboard.id;

			// Load scenes for the storyboard
			await loadScenes(firstStoryboard.id);
		} catch (err) {
			console.error('[Editor] Error loading data:', err);
			error = err instanceof Error ? err.message : 'Failed to load data';
			loading = false;
		}
	}

	// Load scenes for a storyboard
	async function loadScenes(sbId: string) {
		if (!browser || !scenesStore) {
			return;
		}

		try {
			const scenesResult = await scenesStore.fetch({ variables: { storyboardId: sbId } });
			
			if (scenesResult.errors && scenesResult.errors.length > 0) {
				throw new Error(scenesResult.errors[0].message);
			}

			const loadedScenes = scenesResult.data?.scenes || [];
			
			// Convert GraphQL scenes to local Scene type
			scenes = loadedScenes.map((s) => ({
				id: s.id,
				sceneNumber: s.sceneNumber,
				textDescription: s.textDescription || '',
				startTimeSeconds: s.startTimeSeconds || 0,
				durationSeconds: s.durationSeconds || 2.0,
				mediaUrl: s.mediaUrl || null,
			}));

			if (scenes.length > 0 && !selectedSceneId) {
				selectedSceneId = scenes[0].id;
			}

			loading = false;
		} catch (err) {
			console.error('[Editor] Error loading scenes:', err);
			error = err instanceof Error ? err.message : 'Failed to load scenes';
			loading = false;
		}
	}

	// Recalculate scene numbers and timestamps
	function recalculateScenes() {
		let currentTime = 0;
		const updatedScenes = scenes.map((scene, index) => {
			const updated = {
				...scene,
				sceneNumber: index + 1,
				startTimeSeconds: currentTime,
			};
			currentTime += scene.durationSeconds || 0;
			return updated;
		});
		scenes = updatedScenes;
	}

	// Add scene at specific index
	async function addScene(index: number) {
		if (!storyboardId || !browser || !createSceneStore) {
			if (!browser) return;
			alert('Storyboard ID is required or stores not initialized');
			return;
		}

		const defaultDuration = 2.0;
		const startTime = scenes.slice(0, index).reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

		try {
			const result = await createSceneStore.mutate({
				input: {
					storyboardId,
					sceneNumber: index + 1,
					textDescription: '',
					durationSeconds: defaultDuration,
					startTimeSeconds: startTime,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.createScene) {
				// Reload scenes to get the updated list
				await loadScenes(storyboardId);
				selectedSceneId = result.data.createScene.id;
			}
		} catch (err) {
			console.error('[Editor] Error creating scene:', err);
			alert(err instanceof Error ? err.message : 'Failed to create scene');
		}
	}

	// Delete scene
	async function deleteScene(sceneId: string) {
		if (!browser || !deleteSceneStore) {
			return;
		}

		if (!confirm('Are you sure you want to delete this scene?')) {
			return;
		}

		try {
			const result = await deleteSceneStore.mutate({
				id: sceneId,
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.deleteScene) {
				// Reload scenes to get the updated list
				if (storyboardId) {
					await loadScenes(storyboardId);
				}
				if (selectedSceneId === sceneId) {
					selectedSceneId = scenes[0]?.id || null;
				}
			}
		} catch (err) {
			console.error('[Editor] Error deleting scene:', err);
			alert(err instanceof Error ? err.message : 'Failed to delete scene');
		}
	}

	// Move scene from one index to another
	async function moveScene(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex || !storyboardId || !browser || !reorderScenesStore) return;

		const currentScenes = [...scenes];
		const [moved] = currentScenes.splice(fromIndex, 1);
		if (!moved) return;

		currentScenes.splice(toIndex, 0, moved);
		
		// Update scene numbers
		const sceneIds = currentScenes.map((s) => s.id);

		try {
			const result = await reorderScenesStore.mutate({
				input: {
					storyboardId,
					sceneIds,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.reorderScenes) {
				// Reload scenes to get the updated list
				await loadScenes(storyboardId);
			}
		} catch (err) {
			console.error('[Editor] Error reordering scenes:', err);
			alert(err instanceof Error ? err.message : 'Failed to reorder scenes');
		}
	}

	// Update scene
	async function updateScene(sceneId: string, updates: Partial<Scene>) {
		if (!browser || !updateSceneStore) {
			return;
		}

		try {
			const result = await updateSceneStore.mutate({
				input: {
					id: sceneId,
					textDescription: updates.textDescription !== undefined ? updates.textDescription : undefined,
					durationSeconds: updates.durationSeconds !== undefined ? updates.durationSeconds : undefined,
					startTimeSeconds: updates.startTimeSeconds !== undefined ? updates.startTimeSeconds : undefined,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.updateScene && storyboardId) {
				// Reload scenes to get the updated list
				await loadScenes(storyboardId);
			}
		} catch (err) {
			console.error('[Editor] Error updating scene:', err);
			alert(err instanceof Error ? err.message : 'Failed to update scene');
		}
	}

	function handleSceneSelect(sceneId: string) {
		selectedSceneId = sceneId;
	}

	function handleGenerateVideo() {
		generating = true;
		// Simulate generation
		setTimeout(() => {
			generating = false;
			alert('Video generation started!');
		}, 1000);
	}

	function formatTime(seconds: number | null): string {
		if (seconds === null) return '00';
		const mins = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(2);
		if (mins === 0) {
			return secs.padStart(5, '0');
		}
		return `${mins.toString().padStart(2, '0')}.${secs}`;
	}

	// Drag and Drop handlers
	function handleDragStart(e: DragEvent, sceneId: string, index: number) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify({ sceneId, index }));
			draggedSceneId = sceneId;
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	function handleDragLeave(e: DragEvent) {
		// Only clear if we're actually leaving the element
		const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect();
		if (rect) {
			const x = e.clientX;
			const y = e.clientY;
			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
				dragOverIndex = null;
			}
		}
	}

	function handleDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		e.stopPropagation();
		dragOverIndex = null;
		
		if (e.dataTransfer) {
			const data = e.dataTransfer.getData('text/plain');
			if (data) {
				try {
					const { index: dragIndex } = JSON.parse(data);
					if (dragIndex !== undefined && dragIndex !== dropIndex) {
						moveScene(dragIndex, dropIndex);
					}
				} catch (err) {
					console.error('Failed to parse drag data:', err);
				}
			}
		}
		draggedSceneId = null;
	}

	function handleDragEnd() {
		draggedSceneId = null;
		dragOverIndex = null;
	}

	// Keyboard shortcuts
	onMount(async () => {
		if (!browser) return;
		
		// Load initial data
		await loadData();
		
		const handleKeyDown = (e: KeyboardEvent) => {
			// Prevent shortcuts when typing in inputs
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSceneId) {
				e.preventDefault();
				deleteScene(selectedSceneId);
			} else if ((e.key === '+' || e.key === '=') && !e.shiftKey) {
				e.preventDefault();
				const selectedIndex = scenes.findIndex(s => s.id === selectedSceneId);
				const insertIndex = selectedIndex >= 0 ? selectedIndex + 1 : scenes.length;
				addScene(insertIndex);
			} else if (e.key === 'ArrowLeft' && selectedSceneId) {
				e.preventDefault();
				const selectedIndex = scenes.findIndex(s => s.id === selectedSceneId);
				if (selectedIndex > 0) {
					const sceneToMove = scenes[selectedIndex];
					if (sceneToMove) {
						moveScene(selectedIndex, selectedIndex - 1);
						// After move, the scene is now at selectedIndex - 1
						selectedSceneId = sceneToMove.id;
					}
				}
			} else if (e.key === 'ArrowRight' && selectedSceneId) {
				e.preventDefault();
				const selectedIndex = scenes.findIndex(s => s.id === selectedSceneId);
				if (selectedIndex < scenes.length - 1) {
					const sceneToMove = scenes[selectedIndex];
					if (sceneToMove) {
						moveScene(selectedIndex, selectedIndex + 1);
						// After move, the scene is now at selectedIndex + 1
						selectedSceneId = sceneToMove.id;
					}
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<div class="storyboard-editor">
	<!-- Header Bar -->
	<header class="header-bar">
		<div class="header-left">
			<div class="logo">S</div>
		</div>
		<div class="header-center">
			<h1 class="title">Storyboard</h1>
		</div>
		<div class="header-right">
			<button class="icon-button" aria-label="Undo">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
					<path d="M3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M7 7L3 10L7 13" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button class="icon-button" aria-label="Redo">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
					<path d="M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M13 7L17 10L13 13" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button class="icon-button" aria-label="Help">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
					<circle cx="10" cy="10" r="7" stroke-width="1.5"/>
					<path d="M10 7V10M10 13H10.01" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
			<button class="icon-button" aria-label="Notifications">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
					<path d="M10 3C7.23858 3 5 5.23858 5 8C5 11.5 4 13 4 13H16C16 13 15 11.5 15 8C15 5.23858 12.7614 3 10 3Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M8 13C8 14.1046 8.89543 15 10 15C11.1046 15 12 14.1046 12 13" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button class="icon-button user-button" aria-label="User profile">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
					<circle cx="10" cy="7" r="3" stroke-width="1.5"/>
					<path d="M5 17C5 14.2386 7.23858 12 10 12C12.7614 12 15 14.2386 15 17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		</div>
	</header>

	<!-- Loading State -->
	{#if loading}
		<div class="loading-container">
			<p>Loading storyboard...</p>
		</div>
	<!-- Error State -->
	{:else if error}
		<div class="error-container">
			<p class="error-message">{error}</p>
			<button onclick={loadData} class="retry-button">Retry</button>
		</div>
	<!-- Main Content: Scene Panels -->
	{:else}
	<main class="scene-panels-container">
		<div class="scene-panels-wrapper">
			{#each scenes as scene, index}
			<!-- Insert button before scene (shown on hover) -->
			<div
				class="insert-button-container"
				class:hovered={hoveredInsertIndex === index}
				class:drag-over={dragOverIndex === index}
				onmouseenter={() => hoveredInsertIndex = index}
				onmouseleave={() => hoveredInsertIndex = null}
				role="button"
				tabindex="0"
				ondragover={(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (e.dataTransfer) {
						e.dataTransfer.dropEffect = 'move';
					}
					dragOverIndex = index;
				}}
				ondragleave={(e) => {
					const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect();
					if (rect) {
						const x = e.clientX;
						const y = e.clientY;
						if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
							if (dragOverIndex === index) {
								dragOverIndex = null;
							}
						}
					}
				}}
				ondrop={(e) => {
					e.preventDefault();
					e.stopPropagation();
					dragOverIndex = null;
					if (e.dataTransfer) {
						const data = e.dataTransfer.getData('text/plain');
						if (data) {
							try {
								const { index: dragIndex } = JSON.parse(data);
								if (dragIndex !== undefined && dragIndex !== index) {
									moveScene(dragIndex, index);
								}
							} catch (err) {
								console.error('Failed to parse drag data:', err);
							}
						}
					}
					draggedSceneId = null;
				}}
			>
					<button
						class="insert-button"
						onclick={() => addScene(index)}
						aria-label="Insert scene before"
						title="Insert scene before"
					>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
							<path d="M10 4V16M4 10H16" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</button>
				</div>

				<!-- Scene Panel -->
				<div
					class="scene-panel"
					class:selected={selectedSceneId === scene.id}
					class:dragging={draggedSceneId === scene.id}
					class:drag-over={dragOverIndex === index}
					draggable="true"
					ondragstart={(e) => handleDragStart(e, scene.id, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
					onclick={() => handleSceneSelect(scene.id)}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleSceneSelect(scene.id);
						}
					}}
				>
					<!-- Scene Content Area (Dark) -->
					<div class="scene-content">
						<div class="scene-description">{scene.textDescription || 'Click to edit description'}</div>
					</div>
					
					<!-- Scene Controls -->
					<div class="scene-controls">
						<span class="timestamp">{formatTime(scene.startTimeSeconds)}</span>
						<div class="scene-actions">
							<button class="action-button" onclick={(e) => { e.stopPropagation(); }} aria-label="Edit scene">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
									<path d="M11 2L14 5L5 14H2V11L11 2Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
							<button class="action-button" onclick={(e) => { e.stopPropagation(); deleteScene(scene.id); }} aria-label="Delete scene">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
									<path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M13 4V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V4H13Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}

			<!-- Add button at the end -->
			<div class="add-scene-end">
				<button
					class="add-scene-button"
					onclick={() => addScene(scenes.length)}
					aria-label="Add scene at end"
					title="Add scene at end"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M12 5V19M5 12H19" stroke-width="2" stroke-linecap="round"/>
					</svg>
					<span>Add Scene</span>
				</button>
			</div>
		</div>
	</main>
	{/if}

	<!-- Timeline -->
	{#if !loading && !error}
	<div class="timeline-container">
		<div class="timeline">
			<!-- Time Markers -->
			<div class="time-markers">
				{#each Array(Math.ceil(totalDuration) + 1) as _, i}
					<div class="time-marker" style="left: {(i / totalDuration) * 100}%">
						<span class="time-label">{i.toString().padStart(2, '0')}</span>
					</div>
				{/each}
			</div>

			<!-- Scene Blocks -->
			<div class="scene-blocks">
				{#each scenes as scene, index}
					{@const startPercent = ((scene.startTimeSeconds || 0) / totalDuration) * 100}
					{@const widthPercent = ((scene.durationSeconds || 0) / totalDuration) * 100}
					<div
						class="scene-block"
						class:selected={selectedSceneId === scene.id}
						class:dragging={draggedSceneId === scene.id}
						draggable="true"
						ondragstart={(e) => handleDragStart(e, scene.id, index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, index)}
						ondragend={handleDragEnd}
						style="left: {startPercent}%; width: {widthPercent}%"
						onclick={() => handleSceneSelect(scene.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleSceneSelect(scene.id);
							}
						}}
					>
						<span class="scene-block-number">{scene.sceneNumber}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Bottom Toolbar -->
	<div class="toolbar">
		<button class="toolbar-button" aria-label="Aspect Ratio">
			16:9
		</button>
		<button class="toolbar-button" aria-label="Resolution">
			480p
		</button>
		<button class="toolbar-button" aria-label="Segment Duration">
			{Math.max(...scenes.map(s => s.durationSeconds || 0)).toFixed(0)}s
		</button>
		<button class="toolbar-button" aria-label="Video Track">
			1v
		</button>
		<button class="toolbar-button" aria-label="Filter">
			None
		</button>
		<button
			class="toolbar-button add-scene-toolbar-button"
			onclick={() => addScene(scenes.length)}
			aria-label="Add scene"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
				<path d="M8 3V13M3 8H13" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
			Add Scene
		</button>
		<button class="toolbar-button help-button" aria-label="Help">
			Help
		</button>
		<button
			class="toolbar-button create-button"
			onclick={handleGenerateVideo}
			disabled={generating}
			aria-label="Create video"
		>
			Create
		</button>
	</div>
	{/if}
</div>

<style>
	.storyboard-editor {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		overflow: hidden;
	}

	/* Header Bar */
	.header-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background-color: #1a1a1a;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.logo {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 600;
		color: #ffffff;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}

	.header-center {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.title {
		font-size: 1.25rem;
		font-weight: 400;
		margin: 0;
		color: #ffffff;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.icon-button {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.2s, color 0.2s;
	}

	.icon-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}

	.user-button {
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	/* Scene Panels Container */
	.scene-panels-container {
		flex: 1;
		overflow-x: auto;
		overflow-y: hidden;
		min-height: 0;
		position: relative;
	}

	.scene-panels-wrapper {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		padding: 1.5rem;
		min-width: min-content;
		height: 100%;
		align-items: stretch;
	}

	/* Insert Button Container */
	.insert-button-container {
		flex-shrink: 0;
		width: 60px;
		opacity: 0;
		transition: opacity 0.2s;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.insert-button-container:hovered,
	.insert-button-container.drag-over {
		opacity: 1;
		pointer-events: all;
	}

	.insert-button {
		width: 100%;
		height: 100%;
		min-height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(255, 255, 255, 0.05);
		border: 2px dashed rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s;
	}

	.insert-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.5);
		color: #ffffff;
	}

	/* Scene Panel */
	.scene-panel {
		flex-shrink: 0;
		width: 400px;
		display: flex;
		flex-direction: column;
		background-color: #2a2a2a;
		border-radius: 8px;
		overflow: hidden;
		cursor: move;
		transition: all 0.2s;
		border: 2px solid transparent;
		position: relative;
	}

	.scene-panel.selected {
		border-color: #ffffff;
	}

	.scene-panel.dragging {
		opacity: 0.5;
		transform: scale(0.95);
	}

	.scene-panel.drag-over {
		border-color: #ffffff;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
	}

	.scene-content {
		flex: 1;
		background-color: #000000;
		min-height: 300px;
		padding: 1rem;
		display: flex;
		align-items: flex-start;
		position: relative;
	}

	.scene-description {
		color: #ffffff;
		font-size: 0.875rem;
		line-height: 1.5;
		width: 100%;
	}

	.scene-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background-color: #2a2a2a;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.timestamp {
		font-size: 0.875rem;
		color: #ffffff;
		font-weight: 500;
	}

	.scene-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-button {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.2s, color 0.2s;
	}

	.action-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}

	/* Add Scene End Button */
	.add-scene-end {
		flex-shrink: 0;
		width: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.add-scene-button {
		width: 100%;
		height: 100%;
		min-height: 300px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background-color: rgba(255, 255, 255, 0.05);
		border: 2px dashed rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.add-scene-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.5);
		color: #ffffff;
	}

	/* Timeline Container */
	.timeline-container {
		padding: 1rem 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background-color: #1a1a1a;
	}

	.timeline {
		position: relative;
		height: 80px;
		background-color: #2a2a2a;
		border-radius: 4px;
		overflow: hidden;
	}

	.time-markers {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 100%;
	}

	.time-marker {
		position: absolute;
		top: 0;
		width: 1px;
		height: 100%;
		background-color: rgba(255, 255, 255, 0.2);
	}

	.time-label {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		transform: translateX(-50%);
	}

	.scene-blocks {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 32px;
		transform: translateY(-50%);
	}

	.scene-block {
		position: absolute;
		height: 100%;
		background-color: #000000;
		border-radius: 2px;
		cursor: move;
		transition: all 0.2s;
		border: 2px solid transparent;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.scene-block.selected {
		border-color: #ffffff;
	}

	.scene-block.dragging {
		opacity: 0.5;
		transform: scale(0.9);
	}

	.scene-block-number {
		font-size: 0.875rem;
		font-weight: 500;
		color: #ffffff;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background-color: #2a2a2a;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.toolbar-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: #ffffff;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.toolbar-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.toolbar-button:focus {
		outline: 2px solid #ffffff;
		outline-offset: 2px;
	}

	.toolbar-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-scene-toolbar-button {
		margin-left: auto;
	}

	.help-button {
		margin-left: 0;
	}

	.create-button {
		background-color: #ffffff;
		color: #000000;
		font-weight: 500;
		border-color: #ffffff;
	}

	.create-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.9);
	}
</style>
