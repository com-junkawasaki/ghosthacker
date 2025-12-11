<script lang="ts">
	import { browser } from '$app/environment';
	import { composerStore, type Track } from '$lib/stores/composerStore';
	import ComposerToolbar from './ComposerToolbar.svelte';
	import CanvasPreview from './CanvasPreview.svelte';
	import TimelineEditor from './TimelineEditor.svelte';
	import AssetLibrary from './AssetLibrary.svelte';
	import AssetDetailsPanel from './AssetDetailsPanel.svelte';
	import SunoMusicGenerator from './SunoMusicGenerator.svelte';

	type Props = {
		composerId: string;
		projectId: string;
		initialTracks?: Track[];
	};

	let { composerId, projectId, initialTracks = [] }: Props = $props();

	let selectedAssetType = $state('audio');
	let selectedAsset = $state<unknown>(null);
	let showMusicGenerator = $state(false);
	let showAddTrackDialog = $state(false);
	let newTrackType = $state<'audio' | 'video' | 'overlay'>('audio');
	let newTrackName = $state('');

	// Panel sizes (resizable)
	let leftPanelWidth = $state(240);
	let rightPanelWidth = $state(320);
	let timelineHeight = $state(280);

	// Initialize composer store
	$effect(() => {
		if (browser && composerId) {
			composerStore.initialize(composerId, initialTracks);
		}
	});

	function handleAssetTypeSelect(type: string) {
		selectedAssetType = type;
		selectedAsset = null;
	}

	function handleAssetSelect(asset: unknown) {
		selectedAsset = asset;
		if (asset && typeof asset === 'object' && 'type' in asset) {
			const assetObj = asset as { type: string };
			if (assetObj.type === 'suno-generator') {
				showMusicGenerator = true;
			}
		}
	}

	function handleMusicGenerate(prompt: string, customMode: boolean, makeInstrumental: boolean, mv: string | null) {
		console.log('[Composer] Generate music:', { prompt, customMode, makeInstrumental, mv });
		// TODO: Call Suno API via GraphQL mutation
		showMusicGenerator = false;
	}

	function handleAddTrack() {
		showAddTrackDialog = true;
		newTrackName = `${newTrackType.charAt(0).toUpperCase() + newTrackType.slice(1)} Track ${composerStore.state.tracks.length + 1}`;
	}

	function confirmAddTrack() {
		if (!newTrackName.trim()) return;

		const trackId = `track-${Date.now()}`;
		composerStore.addTrack({
			id: trackId,
			composerId,
			type: newTrackType,
			name: newTrackName,
			number: composerStore.state.tracks.length + 1,
			muted: false,
			locked: false,
			visible: true,
		});

		showAddTrackDialog = false;
		newTrackName = '';
	}

	function handleExport() {
		console.log('[Composer] Export video');
		// TODO: Implement export functionality
	}

	function handleSave() {
		console.log('[Composer] Save project');
		// TODO: Save via GraphQL mutation
	}

	// Handle drag and drop from asset library to timeline
	function handleDragStart(e: DragEvent, asset: unknown) {
		if (e.dataTransfer) {
			e.dataTransfer.setData('application/json', JSON.stringify(asset));
			e.dataTransfer.effectAllowed = 'copy';
		}
	}
</script>

<div class="composer-layout">
	<!-- Toolbar -->
	<ComposerToolbar
		onAddTrack={handleAddTrack}
		onExport={handleExport}
		onSave={handleSave}
	/>

	<!-- Main content area -->
	<div class="composer-main">
		<!-- Left panel: Asset Library -->
		<div class="panel left-panel" style="width: {leftPanelWidth}px">
			<AssetLibrary
				selectedType={selectedAssetType}
				onSelectType={handleAssetTypeSelect}
				onSelectAsset={handleAssetSelect}
			/>
		</div>

		<!-- Center area: Preview + Timeline -->
		<div class="center-area">
			<!-- Preview area -->
			<div class="preview-area">
				<CanvasPreview />
			</div>

			<!-- Timeline area -->
			<div class="timeline-area" style="height: {timelineHeight}px">
				<TimelineEditor composerId={composerId} />
			</div>
		</div>

		<!-- Right panel: Asset Details / Properties -->
		<div class="panel right-panel" style="width: {rightPanelWidth}px">
			<AssetDetailsPanel
				assetType={selectedAssetType}
				selectedAsset={selectedAsset}
			/>
		</div>
	</div>

	<!-- Suno Music Generator Dialog -->
	<SunoMusicGenerator
		open={showMusicGenerator}
		onClose={() => showMusicGenerator = false}
		onGenerate={handleMusicGenerate}
	/>

	<!-- Add Track Dialog -->
	{#if showAddTrackDialog}
		<div
			class="dialog-overlay"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			onclick={(e) => e.target === e.currentTarget && (showAddTrackDialog = false)}
			onkeydown={(e) => e.key === 'Escape' && (showAddTrackDialog = false)}
		>
			<div class="dialog">
				<div class="dialog-header">
					<h3>Add Track</h3>
					<button class="close-btn" onclick={() => showAddTrackDialog = false}>✕</button>
				</div>
				<div class="dialog-content">
					<div class="form-group">
						<label for="track-type">Track Type</label>
						<select id="track-type" bind:value={newTrackType}>
							<option value="audio">Audio</option>
							<option value="video">Video</option>
							<option value="overlay">Overlay</option>
						</select>
					</div>
					<div class="form-group">
						<label for="track-name">Track Name</label>
						<input
							id="track-name"
							type="text"
							bind:value={newTrackName}
							placeholder="Enter track name"
						/>
					</div>
				</div>
				<div class="dialog-actions">
					<button class="btn secondary" onclick={() => showAddTrackDialog = false}>Cancel</button>
					<button class="btn primary" onclick={confirmAddTrack} disabled={!newTrackName.trim()}>
						Add Track
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.composer-layout {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #0a0a0a;
		overflow: hidden;
	}

	.composer-main {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.panel {
		flex-shrink: 0;
		background: #141414;
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.left-panel {
		border-right: 1px solid rgba(255, 255, 255, 0.08);
	}

	.right-panel {
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		border-right: none;
	}

	.center-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
	}

	.preview-area {
		flex: 1;
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #0a0a0a;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.timeline-area {
		flex-shrink: 0;
		min-height: 200px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	/* Dialog styles */
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

	.dialog {
		background: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		width: 400px;
		max-width: 90%;
		overflow: hidden;
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.dialog-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: white;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		font-size: 18px;
		cursor: pointer;
		padding: 4px;
	}

	.close-btn:hover {
		color: white;
	}

	.dialog-content {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 13px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.form-group input,
	.form-group select {
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: white;
		font-size: 14px;
	}

	.form-group input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 16px 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.btn {
		padding: 10px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn.secondary {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: white;
	}

	.btn.secondary:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.btn.primary {
		background: #3b82f6;
		border: none;
		color: white;
	}

	.btn.primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
