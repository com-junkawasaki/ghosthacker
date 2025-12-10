<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';
	import OrganizationSwitcher from '$lib/components/clerk/OrganizationSwitcher.svelte';
	import UserAccountMenu from '$lib/components/clerk/UserAccountMenu.svelte';
	import AssetLibrary from '$lib/components/composer/AssetLibrary.svelte';
	import PreviewWindow from '$lib/components/composer/PreviewWindow.svelte';
	import AssetDetailsPanel from '$lib/components/composer/AssetDetailsPanel.svelte';
	import TimelineEditor from '$lib/components/composer/TimelineEditor.svelte';

	const { lang, orgId, projectId } = $page.params;
	const projectIdParam: string = projectId || '';

	// State management
	let selectedAssetType = $state<string>('audio');
	let selectedAsset: any = $state(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);

	onMount(() => {
		if (!browser) return;
		// Initialize composer page
	});
</script>

<div class="composer-container">
	<ProjectSidebar projectId={projectIdParam} />
	
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
					onSelectType={(type) => selectedAssetType = type}
					onSelectAsset={(asset) => selectedAsset = asset}
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
					currentTime={currentTime}
					onSeek={(time) => currentTime = time}
				/>
			</div>
		</div>
	</div>
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
