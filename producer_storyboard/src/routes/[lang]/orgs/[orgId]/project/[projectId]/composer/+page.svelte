<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { ListComposersStore } from '../../../../../../../../.houdini/plugins/houdini-svelte/stores/ListComposers.js';
	import { CreateComposerStore } from '../../../../../../../../.houdini/plugins/houdini-svelte/stores/CreateComposer.js';
	import { GenerateSunoMusicStore } from '../../../../../../../../.houdini/plugins/houdini-svelte/stores/GenerateSunoMusic.js';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';
	import AssetLibrary from '$lib/components/composer/AssetLibrary.svelte';
	import PreviewWindow from '$lib/components/composer/PreviewWindow.svelte';
	import AssetDetailsPanel from '$lib/components/composer/AssetDetailsPanel.svelte';
	import TimelineEditor from '$lib/components/composer/TimelineEditor.svelte';
	import SunoMusicGenerator from '$lib/components/composer/SunoMusicGenerator.svelte';

	const { projectId: projectIdParam } = $page.params;
	const projectId: string = projectIdParam || '';

	// State management
	let selectedAssetType = $state<string>('audio');
	let selectedAsset: any = $state(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let composerId = $state<string | null>(null);
	let showSunoGenerator = $state(false);

	// Houdini stores
	let listComposersStore: ListComposersStore | null = null;
	let createComposerStore: CreateComposerStore | null = null;
	let generateSunoMusicStore: GenerateSunoMusicStore | null = null;

	if (browser) {
		listComposersStore = new ListComposersStore();
		createComposerStore = new CreateComposerStore();
		generateSunoMusicStore = new GenerateSunoMusicStore();
	}

	async function loadComposers() {
		if (!browser || !listComposersStore || !projectId) return;

		try {
			const result = await listComposersStore.fetch({ variables: { projectId } });
			if (result?.data?.composers && result.data.composers.length > 0) {
				composerId = result.data.composers[0].id;
			} else {
				// Create default composer if none exists
				await createDefaultComposer();
			}
		} catch (err) {
			console.error('[Composer] Error loading composers:', err);
		}
	}

	async function createDefaultComposer() {
		if (!browser || !createComposerStore || !projectId) return;

		try {
			const result = await createComposerStore.mutate({
				input: {
					projectId,
					title: 'New Composer',
				},
			});

			if (result?.data?.createComposer?.id) {
				composerId = result.data.createComposer.id;
			}
		} catch (err) {
			console.error('[Composer] Error creating composer:', err);
		}
	}

	async function handleGenerateSunoMusic(prompt: string, customMode: boolean, makeInstrumental: boolean, mv: string | null) {
		if (!browser || !generateSunoMusicStore || !composerId) return;

		try {
			const result = await generateSunoMusicStore.mutate({
				input: {
					composerId: composerId,
					prompt,
					customMode,
					makeInstrumental,
					mv: mv || null,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				const error = result.errors[0];
				console.error('[Composer] Error generating Suno music:', error?.message || 'Unknown error');
			} else {
				console.log('[Composer] Suno music generation started:', result?.data?.generateSunoMusic);
			}
		} catch (err) {
			console.error('[Composer] Error generating Suno music:', err);
		}

		showSunoGenerator = false;
	}

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

