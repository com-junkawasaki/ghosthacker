<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';
	import AssetLibrary from '$lib/components/composer/AssetLibrary.svelte';
	import PreviewWindow from '$lib/components/composer/PreviewWindow.svelte';
	import AssetDetailsPanel from '$lib/components/composer/AssetDetailsPanel.svelte';
	import TimelineEditor from '$lib/components/composer/TimelineEditor.svelte';
	import SunoMusicGenerator from '$lib/components/composer/SunoMusicGenerator.svelte';
	import { composerStore } from '$lib/stores/composerStore.svelte';

	const { orgId, projectId: projectIdParam } = $page.params;
	const projectId: string = projectIdParam || '';

	// State management
	let selectedAssetType = $state<string>('audio');
	let selectedAsset: any = $state(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let composerId = $state<string | null>(null);
	let showSunoGenerator = $state(false);
	let showAddResourceDialog = $state(false);
	let showAddSampleDialog = $state(false);

	// Using grpc-go API instead of Houdini stores

	async function loadComposers() {
		if (!browser || !projectId) return;

		try {
			const response = await fetch(`/api/composers?projectId=${projectId}`, {
				headers: {
					'X-Org-Id': orgId,
				},
			});
			
			if (!response.ok) {
				throw new Error(`Failed to load composers: ${response.statusText}`);
			}
			
			const result = await response.json();
			if (result?.composers && result.composers.length > 0) {
				const composer = result.composers[0];
				composerId = composer.id;
				// Load tracks for this composer
				await loadTracks(composer.id);
			} else {
				// Create default composer if none exists
				await createDefaultComposer();
			}
		} catch (err) {
			console.error('[Composer] Error loading composers:', err);
		}
	}

	async function createDefaultComposer() {
		if (!browser || !projectId) return;

		try {
			const response = await fetch('/api/composers', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					projectId,
					title: 'New Composer',
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to create composer: ${response.statusText}`);
			}

			const result = await response.json();
			if (result?.id) {
				composerId = result.id;
				// Initialize composer store with empty tracks
				if (browser) {
					composerStore.initialize(result.id, []);
				}
			}
		} catch (err) {
			console.error('[Composer] Error creating composer:', err);
		}
	}

	async function handleGenerateSunoMusic(prompt: string, customMode: boolean, makeInstrumental: boolean, mv: string | null) {
		if (!browser || !composerId) return;

		try {
			const response = await fetch('/api/suno-music', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					composerId: composerId,
					prompt,
				}),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ error: response.statusText }));
				console.error('[Composer] Error generating Suno music:', error?.error || 'Unknown error');
			} else {
				const result = await response.json();
				console.log('[Composer] Suno music generation started:', result);
			}
		} catch (err) {
			console.error('[Composer] Error generating Suno music:', err);
		}

		showSunoGenerator = false;
	}

	async function handleAddSample() {
		if (!browser || !projectId) return;
		showAddSampleDialog = true;
		
		// TODO: Implement sample resource addition via API
		// For now, just show dialog or add mock sample
		console.log('[Composer] Add sample resource');
	}

	async function handleAddResource() {
		if (!browser || !projectId) return;
		showAddResourceDialog = true;
		
		// TODO: Implement resource addition via API
		// For now, just show dialog
		console.log('[Composer] Add resource');
	}

	async function loadTracks(composerIdToLoad: string) {
		if (!browser || !composerIdToLoad) return;

		try {
			// Try to load tracks from API (if endpoint exists)
			const response = await fetch(`/api/composers/${composerIdToLoad}/tracks`, {
				headers: {
					'X-Org-Id': orgId,
				},
			});
			
			if (!response.ok) {
				// If tracks endpoint doesn't exist yet, initialize with empty tracks
				composerStore.initialize(composerIdToLoad, []);
				return;
			}
			
			const result = await response.json();
			const tracks = result?.tracks || [];
			
			// Convert API tracks to store format
			const storeTracks = tracks.map((track: any) => ({
				id: track.id,
				composerId: track.composer_id,
				type: track.track_type as 'audio' | 'video' | 'overlay',
				name: track.name || `Track ${track.track_number}`,
				number: track.track_number,
				muted: false,
				locked: false,
				visible: true,
				clips: [], // Clips will be loaded separately if needed
			}));
			
			// Initialize composer store with loaded tracks
			composerStore.initialize(composerIdToLoad, storeTracks);
		} catch (err) {
			console.error('[Composer] Error loading tracks:', err);
			// Initialize with empty tracks on error
			composerStore.initialize(composerIdToLoad, []);
		}
	}

	// Initialize composer store when composerId changes
	$effect(() => {
		if (browser && composerId) {
			loadTracks(composerId);
		}
	});

	onMount(() => {
		if (!browser) return;
		loadComposers();
	});
</script>

<div class="composer-container">
	<ProjectSidebar projectId={projectId} />
	
	<div class="composer-main">
		<header class="composer-header">
			<div class="header-left">
				<h1>Composer</h1>
			</div>
			<div class="header-right">
				<div class="header-clerk-controls">
					<OrganizationSwitcher />
					<UserAccountMenu />
				</div>
			</div>
		</header>

		<div class="composer-content">
			<div class="composer-left-panel">
				<AssetLibrary 
					selectedType={selectedAssetType}
					onSelectType={(type) => {
						selectedAssetType = type;
						selectedAsset = null;
					}}
					onSelectAsset={(asset) => {
						if (asset?.type === 'suno-generator') {
							showSunoGenerator = true;
						} else {
							selectedAsset = asset;
						}
					}}
				/>
			</div>

			<div class="composer-right-panel">
				<div class="composer-top-right">
					<PreviewWindow 
						isPlaying={isPlaying}
						currentTime={currentTime}
						duration={duration}
						onPlay={() => isPlaying = true}
						onPause={() => isPlaying = false}
						onSeek={(time) => currentTime = time}
					/>
				</div>

				<div class="composer-middle-right">
					<AssetDetailsPanel 
						assetType={selectedAssetType}
						selectedAsset={selectedAsset}
						onAddSample={handleAddSample}
						onAddResource={handleAddResource}
					/>
				</div>
			</div>

			<div class="composer-bottom-panel">
				<TimelineEditor 
					composerId={composerId}
					currentTime={currentTime}
					onSeek={(time) => currentTime = time}
				/>
			</div>
		</div>
	</div>

	<SunoMusicGenerator
		open={showSunoGenerator}
		onClose={() => showSunoGenerator = false}
		onGenerate={handleGenerateSunoMusic}
	/>
</div>

<style>
	.composer-container {
		display: flex;
		height: 100vh;
		background: #0a0a0a;
		color: white;
		overflow: hidden;
	}

	.composer-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.composer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: #1a1a1a;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.header-left h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: white;
	}

	.header-clerk-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		padding-left: 1rem;
	}

	.composer-content {
		flex: 1;
		display: grid;
		grid-template-columns: 240px 1fr;
		grid-template-rows: 1fr auto;
		overflow: hidden;
	}

	.composer-left-panel {
		grid-column: 1;
		grid-row: 1 / -1;
		background: #1a1a1a;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		overflow-y: auto;
	}

	.composer-right-panel {
		grid-column: 2;
		grid-row: 1;
		display: grid;
		grid-template-columns: 1fr 300px;
		overflow: hidden;
	}

	.composer-top-right {
		background: #0a0a0a;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.composer-middle-right {
		background: #1a1a1a;
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		overflow-y: auto;
	}

	.composer-bottom-panel {
		grid-column: 2;
		grid-row: 2;
		background: #1a1a1a;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}
</style>

