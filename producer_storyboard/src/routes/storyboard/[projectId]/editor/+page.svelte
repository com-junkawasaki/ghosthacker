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
	import { GenerateSceneImageStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/GenerateSceneImage.js';
	import { GetGeneratedImagesStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/GetGeneratedImages.js';
	import { UploadSceneImageStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/UploadSceneImage.js';
	import { ListCharactersStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/ListCharacters.js';
	import { ListDialoguesStore } from '../../../../../.houdini/plugins/houdini-svelte/stores/ListDialogues.js';
	import CharacterManager from '$lib/components/storyboard/CharacterManager.svelte';
	import DialogueEditor from '$lib/components/storyboard/DialogueEditor.svelte';
	import VideoPreview from '$lib/components/storyboard/VideoPreview.svelte';

	type Scene = {
		id: string;
		sceneNumber: number;
		textDescription: string | null;
		startTimeSeconds: number | null;
		durationSeconds: number | null;
		mediaUrl: string | null;
		// Include generated images for preview
		generatedImages?: GeneratedImage[];
	};

	type GeneratedImage = {
		id: string;
		sceneId: string;
		imageType: string | null;
		imageFormat: string | null;
		createdAt: string;
	};

	type Character = {
		id: string;
		projectId: string;
		name: string;
		description: string | null;
	};

	type Dialogue = {
		id: string;
		sceneId: string;
		characterId: string;
		language: string;
		text: string;
		humeVoiceId: string | null;
		audioUrl: string | null;
	};

	const projectId: string = $page.params.projectId || '';
	
	// Houdini stores - initialize only in browser
	let storyboardsStore: ListStoryboardsStore | null = null;
	let scenesStore: ListScenesStore | null = null;
	let createSceneStore: CreateSceneStore | null = null;
	let updateSceneStore: UpdateSceneStore | null = null;
	let deleteSceneStore: DeleteSceneStore | null = null;
	let reorderScenesStore: ReorderScenesStore | null = null;
	let generateSceneImageStore: GenerateSceneImageStore | null = null;
	let getGeneratedImagesStore: GetGeneratedImagesStore | null = null;
	let uploadSceneImageStore: UploadSceneImageStore | null = null;
	let listCharactersStore: ListCharactersStore | null = null;
	let listDialoguesStore: ListDialoguesStore | null = null;

	if (browser) {
		storyboardsStore = new ListStoryboardsStore();
		scenesStore = new ListScenesStore();
		createSceneStore = new CreateSceneStore();
		updateSceneStore = new UpdateSceneStore();
		deleteSceneStore = new DeleteSceneStore();
		reorderScenesStore = new ReorderScenesStore();
		generateSceneImageStore = new GenerateSceneImageStore();
		getGeneratedImagesStore = new GetGeneratedImagesStore();
		uploadSceneImageStore = new UploadSceneImageStore();
		listCharactersStore = new ListCharactersStore();
		listDialoguesStore = new ListDialoguesStore();
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
	
	// Store generated images by scene ID
	let sceneImages = $state<Record<string, GeneratedImage[]>>({});
	
	// Characters and dialogues
	let characters = $state<Character[]>([]);
	let sceneDialogues = $state<Record<string, Dialogue[]>>({});
	let showCharacterManager = $state(false);
	
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

	// Load characters
	async function loadCharacters() {
		if (!browser || !listCharactersStore || !projectId) return;

		try {
			const result = await listCharactersStore.fetch({ variables: { projectId } });
			if (result?.data?.characters) {
				characters = result.data.characters as Character[];
			}
		} catch (err) {
			console.error('[Editor] Error loading characters:', err);
		}
	}

	// Load dialogues for a scene
	async function loadDialogues(sceneId: string) {
		if (!browser || !listDialoguesStore) return;

		try {
			const result = await listDialoguesStore.fetch({ variables: { sceneId } });
			if (result?.data?.dialogues) {
				sceneDialogues[sceneId] = result.data.dialogues as Dialogue[];
			}
		} catch (err) {
			console.error('[Editor] Error loading dialogues:', err);
		}
	}

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

			// Load images for all scenes (don't await to avoid blocking)
			Promise.all(loadedScenes.map(s => loadSceneImages(s.id))).catch(err => {
				console.error('[Editor] Error loading scene images:', err);
			});

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
		
		// Calculate scene number: insert at index means the new scene will be at position index + 1
		// But we need to check existing scenes to avoid conflicts
		// If inserting at index 0, new scene_number should be 1
		// If inserting at index 1, new scene_number should be 2, etc.
		const sceneNumber = index + 1;

		try {
			const result = await createSceneStore.mutate({
				input: {
					storyboardId,
					sceneNumber: sceneNumber,
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
		
		// Update scene numbers locally for immediate UI update
		let currentTime = 0;
		const updatedScenes = currentScenes.map((scene, index) => {
			const updated = {
				...scene,
				sceneNumber: index + 1,
				startTimeSeconds: currentTime,
			};
			currentTime += scene.durationSeconds || 0;
			return updated;
		});
		
		// Optimistically update UI
		scenes = updatedScenes;
		
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
				// Revert on error
				await loadScenes(storyboardId);
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.reorderScenes && result.data.reorderScenes.length > 0) {
				// Update with server response to ensure consistency
				// Map server response to local scene format
				const serverScenes: Scene[] = result.data.reorderScenes.map((s: {
					id: string;
					sceneNumber: number;
					textDescription: string | null;
					startTimeSeconds: number | null;
					durationSeconds: number | null;
					mediaUrl?: string | null;
				}) => ({
					id: s.id,
					sceneNumber: s.sceneNumber,
					textDescription: s.textDescription || '',
					startTimeSeconds: s.startTimeSeconds || 0,
					durationSeconds: s.durationSeconds || 0,
					mediaUrl: s.mediaUrl || null,
				}));
				
				// Recalculate timestamps
				let time = 0;
				const finalScenes: Scene[] = serverScenes.map((scene) => {
					const updated: Scene = {
						...scene,
						startTimeSeconds: time,
					};
					time += scene.durationSeconds || 0;
					return updated;
				});
				
				scenes = finalScenes;
			} else {
				// Fallback: reload from server
				await loadScenes(storyboardId);
			}
		} catch (err) {
			console.error('[Editor] Error reordering scenes:', err);
			// Revert on error
			await loadScenes(storyboardId);
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
		if (sceneId && !sceneDialogues[sceneId]) {
			loadDialogues(sceneId);
		}
	}

	// Load generated images for a scene
	async function loadSceneImages(sceneId: string) {
		if (!browser || !getGeneratedImagesStore) {
			return;
		}

		try {
			const result = await getGeneratedImagesStore.fetch({ variables: { sceneId } });
			
			if (result.errors && result.errors.length > 0) {
				console.error('[Editor] Error loading images:', result.errors[0].message);
				return;
			}

			const images = result.data?.generatedImages || [];
			sceneImages = {
				...sceneImages,
				[sceneId]: images.map((img: any) => ({
					id: img.id,
					sceneId: img.sceneId,
					imageType: img.imageType || null,
					imageFormat: img.imageFormat || null,
					createdAt: img.createdAt || '',
				})),
			};
		} catch (err) {
			console.error('[Editor] Error loading scene images:', err);
		}
	}

	// Get image URL for display
	function getImageUrl(imageId: string): string {
		return `/api/images/${imageId}`;
	}

	// Get images for a scene by type
	function getSceneImagesByType(sceneId: string, imageType: 'start' | 'end'): GeneratedImage | null {
		const images = sceneImages[sceneId] || [];
		return images.find(img => img.imageType === imageType) || null;
	}

	// Generate image for a scene
	async function generateSceneImage(sceneId: string, imageType: 'start' | 'end') {
		if (!browser || !generateSceneImageStore) {
			return;
		}

		try {
			generating = true;
			const result = await generateSceneImageStore.mutate({
				input: {
					sceneId,
					imageType,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.generateSceneImage) {
				// Reload images for this scene
				await loadSceneImages(sceneId);
			}
		} catch (err) {
			console.error('[Editor] Error generating image:', err);
			alert(err instanceof Error ? err.message : 'Failed to generate image');
		} finally {
			generating = false;
		}
	}

	// Upload image for a scene
	async function uploadSceneImage(sceneId: string, file: File, imageType: string = 'uploaded') {
		if (!browser || !uploadSceneImageStore) {
			return;
		}

		try {
			generating = true;
			
			// Validate file type
			if (!file.type.startsWith('image/')) {
				throw new Error('File must be an image');
			}

			// Read file as base64
			const reader = new FileReader();
			const base64Promise = new Promise<string>((resolve, reject) => {
				reader.onload = () => {
					const result = reader.result as string;
					// Remove data URL prefix if present
					const base64 = result.includes(',') ? result.split(',')[1] : result;
					resolve(base64);
				};
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});

			const imageData = await base64Promise;
			
			// Determine image format from file type
			const imageFormat = file.type.split('/')[1] || 'png';
			
			const result = await uploadSceneImageStore.mutate({
				input: {
					sceneId,
					imageData,
					imageType,
					imageFormat,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.uploadSceneImage) {
				// Reload images for this scene
				await loadSceneImages(sceneId);
			}
		} catch (err) {
			console.error('[Editor] Error uploading image:', err);
			alert(err instanceof Error ? err.message : 'Failed to upload image');
		} finally {
			generating = false;
		}
	}

	// Handle drag and drop for image upload
	let dragOverSceneId = $state<string | null>(null);

	function handleImageDragOver(e: DragEvent, sceneId: string) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
		dragOverSceneId = sceneId;
	}

	function handleImageDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragOverSceneId = null;
	}

	async function handleImageDrop(e: DragEvent, sceneId: string) {
		e.preventDefault();
		e.stopPropagation();
		dragOverSceneId = null;

		if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
			return;
		}

		const file = e.dataTransfer.files[0];
		if (file && file.type.startsWith('image/')) {
			await uploadSceneImage(sceneId, file);
		} else {
			alert('Please drop an image file');
		}
	}

	// Handle file input change
	function handleFileInputChange(e: Event, sceneId: string) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			if (file) {
				uploadSceneImage(sceneId, file);
				// Reset input
				target.value = '';
			}
		}
	}

	// Update scene duration
	async function updateSceneDuration(sceneId: string, newDuration: number) {
		if (!browser || !updateSceneStore) {
			return;
		}

		const scene = scenes.find(s => s.id === sceneId);
		if (!scene) return;

		// Optimistically update UI
		const sceneIndex = scenes.findIndex(s => s.id === sceneId);
		if (sceneIndex >= 0) {
			const updatedScenes = [...scenes];
			updatedScenes[sceneIndex] = {
				...updatedScenes[sceneIndex]!,
				durationSeconds: newDuration,
			};
			// Recalculate start times
			let currentTime = 0;
			const recalculatedScenes = updatedScenes.map((s) => {
				const updated = {
					...s,
					startTimeSeconds: currentTime,
				};
				currentTime += s.durationSeconds || 0;
				return updated;
			});
			scenes = recalculatedScenes;
		}

		try {
			const result = await updateSceneStore.mutate({
				input: {
					id: sceneId,
					durationSeconds: newDuration,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				// Revert on error
				if (storyboardId) {
					await loadScenes(storyboardId);
				}
				throw new Error(result.errors[0].message);
			}

			if (result?.data?.updateScene && storyboardId) {
				// Reload scenes to get the updated list
				await loadScenes(storyboardId);
			}
		} catch (err) {
			console.error('[Editor] Error updating scene duration:', err);
			alert(err instanceof Error ? err.message : 'Failed to update scene duration');
		}
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
				<div 
					class="scene-content"
					class:drag-over={dragOverSceneId === scene.id}
					ondragover={(e) => handleImageDragOver(e, scene.id)}
					ondragleave={handleImageDragLeave}
					ondrop={(e) => handleImageDrop(e, scene.id)}
					role="region"
					aria-label="Scene content area"
				>
					<!-- Generated Images -->
					{#if sceneImages[scene.id]}
						{@const images = sceneImages[scene.id] || []}
						{@const startImage = images.find(img => img.imageType === 'start') || null}
						{@const endImage = images.find(img => img.imageType === 'end') || null}
						{@const uploadedImages = images.filter(img => img.imageType === 'uploaded' || (!img.imageType && img.imageType !== 'start' && img.imageType !== 'end'))}
						<div class="scene-images">
							{#if startImage}
								<div class="scene-image-container">
									<img
										src={getImageUrl(startImage.id)}
										alt="Start image"
										class="scene-image"
										loading="lazy"
									/>
									<span class="image-label">Start</span>
								</div>
							{/if}
							
							{#if endImage}
								<div class="scene-image-container">
									<img
										src={getImageUrl(endImage.id)}
										alt="End image"
										class="scene-image"
										loading="lazy"
									/>
									<span class="image-label">End</span>
								</div>
							{/if}
							
							{#each uploadedImages as uploadedImage}
								<div class="scene-image-container">
									<img
										src={getImageUrl(uploadedImage.id)}
										alt="Uploaded image"
										class="scene-image"
										loading="lazy"
									/>
									<span class="image-label">Uploaded</span>
								</div>
							{/each}
						</div>
					{:else}
						<!-- Drop zone hint when no images -->
						<div class="drop-zone-hint">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="17 8 12 3 7 8"/>
								<line x1="12" y1="3" x2="12" y2="15"/>
							</svg>
							<p>Drop image here or click to upload</p>
						</div>
					{/if}
						
						<div class="scene-description">{scene.textDescription || 'Click to edit description'}</div>
						
						<!-- Dialogue Editor -->
						{#if selectedSceneId === scene.id}
							<DialogueEditor
								sceneId={scene.id}
								characters={characters}
								dialogues={sceneDialogues[scene.id] || []}
								onDialogueChange={() => loadDialogues(scene.id)}
							/>
						{/if}
					</div>
					
					<!-- Scene Controls -->
					<div class="scene-controls">
						<span class="timestamp">{formatTime(scene.startTimeSeconds)}</span>
						
						<!-- Duration Slider -->
						<div class="duration-control" onclick={(e) => e.stopPropagation()}>
							<label for="duration-{scene.id}" class="duration-label">Duration: {scene.durationSeconds?.toFixed(1)}s</label>
							<input
								id="duration-{scene.id}"
								type="range"
								min="0.5"
								max="10"
								step="0.1"
								value={scene.durationSeconds || 2.0}
								oninput={(e) => {
									const value = parseFloat((e.target as HTMLInputElement).value);
									updateSceneDuration(scene.id, value);
								}}
								class="duration-slider"
								aria-label="Scene duration"
							/>
						</div>
						
						<!-- Image Generation Buttons -->
						<div class="image-generation-controls" onclick={(e) => e.stopPropagation()} role="group" aria-label="Image generation controls">
							<button
								class="image-gen-button"
								onclick={() => generateSceneImage(scene.id, 'start')}
								disabled={generating}
								aria-label="Generate start image"
								title="Generate start image"
							>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
									<path d="M7 2V12M2 7H12" stroke-width="1.5" stroke-linecap="round"/>
								</svg>
								Start
							</button>
							<button
								class="image-gen-button"
								onclick={() => generateSceneImage(scene.id, 'end')}
								disabled={generating}
								aria-label="Generate end image"
								title="Generate end image"
							>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
									<path d="M7 2V12M2 7H12" stroke-width="1.5" stroke-linecap="round"/>
								</svg>
								End
							</button>
							<label class="image-gen-button" tabindex="0" title="Upload image">
								<input
									type="file"
									accept="image/*"
									style="display: none;"
									onchange={(e) => handleFileInputChange(e, scene.id)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											(e.target as HTMLElement).click();
										}
									}}
								/>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
									<path d="M7 2V12M2 7H12" stroke-width="1.5" stroke-linecap="round"/>
								</svg>
								Upload
							</label>
						</div>
						
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

	<!-- Character Manager -->
	<CharacterManager projectId={projectId} bind:open={showCharacterManager} />

	<!-- Bottom Toolbar -->
	<div class="toolbar">
		<!-- Character Manager Button -->
		<button
			class="toolbar-button"
			onclick={() => showCharacterManager = true}
			aria-label="Manage characters"
			title="Manage characters"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
				<path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke-width="1.5"/>
				<path d="M10 12C5.58172 12 2 15.5817 2 20H18C18 15.5817 14.4183 12 10 12Z" stroke-width="1.5"/>
			</svg>
			<span>Characters</span>
		</button>
		
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
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;
		position: relative;
		overflow-y: auto;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.scene-content.drag-over {
		background-color: rgba(59, 130, 246, 0.1);
		border: 2px dashed rgba(59, 130, 246, 0.5);
		border-radius: 4px;
	}

	.drop-zone-hint {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		height: 100%;
		min-height: 200px;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.875rem;
		text-align: center;
		padding: 2rem;
	}

	.drop-zone-hint svg {
		opacity: 0.5;
	}

	.scene-content.drag-over .drop-zone-hint {
		color: rgba(59, 130, 246, 0.8);
	}

	.scene-content.drag-over .drop-zone-hint svg {
		opacity: 1;
		color: rgba(59, 130, 246, 0.8);
	}

	.scene-description {
		color: #ffffff;
		font-size: 0.875rem;
		line-height: 1.5;
		width: 100%;
	}

	.scene-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #2a2a2a;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.scene-controls > *:first-child {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.timestamp {
		font-size: 0.875rem;
		color: #ffffff;
		font-weight: 500;
	}

	.duration-control {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
	}

	.duration-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.duration-slider {
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.2);
		outline: none;
		-webkit-appearance: none;
	}

	.duration-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #ffffff;
		cursor: pointer;
	}

	.duration-slider::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #ffffff;
		cursor: pointer;
		border: none;
	}

	.image-generation-controls {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.image-gen-button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.375rem 0.5rem;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.image-gen-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
		color: #ffffff;
	}

	.image-gen-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.scene-actions {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
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
