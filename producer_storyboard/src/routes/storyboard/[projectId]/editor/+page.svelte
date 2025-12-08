<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	// Mock data for Sora-style storyboard
	const mockScenes = [
		{
			id: '1',
			sceneNumber: 1,
			textDescription: 'Wide-angle view of a city street. Pleasant blue sky and birds flying. Street is filled with trees and morning joggers and bike riders.',
			startTimeSeconds: 0,
			durationSeconds: 2.12,
			mediaUrl: null,
		},
		{
			id: '2',
			sceneNumber: 2,
			textDescription: 'Cut to a close-up of a person walking on the same street. Person wearing a blue t-shirt and the sky is still blue and pleasant with birds.',
			startTimeSeconds: 2.12,
			durationSeconds: 1.14,
			mediaUrl: null,
		},
		{
			id: '3',
			sceneNumber: 3,
			textDescription: 'Sky turns dark all of the sudden and it starts raining. The person becomes wet but still proceeds to walk casually.',
			startTimeSeconds: 3.26,
			durationSeconds: 1.74,
			mediaUrl: null,
		},
	];

	const mockStoryboard = {
		id: 'mock-storyboard',
		aspectRatio: '16:9',
		resolution: '480p',
		durationSeconds: 5,
		numVariations: 1,
	};

	const projectId: string = $page.params.projectId || '';

	let selectedSceneId = $state<string | null>(mockScenes[0]?.id || null);
	let generating = $state(false);

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

	<!-- Main Content: Scene Panels -->
	<main class="scene-panels-container">
		{#each mockScenes as scene}
			<div class="scene-panel" class:selected={selectedSceneId === scene.id} onclick={() => handleSceneSelect(scene.id)} role="button" tabindex="0" onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleSceneSelect(scene.id);
				}
			}}>
				<!-- Scene Content Area (Dark) -->
				<div class="scene-content">
					<div class="scene-description">{scene.textDescription}</div>
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
						<button class="action-button" onclick={(e) => { e.stopPropagation(); }} aria-label="Delete scene">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
								<path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M13 4V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V4H13Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/each}
	</main>

	<!-- Timeline -->
	<div class="timeline-container">
		<div class="timeline">
			<!-- Time Markers -->
			<div class="time-markers">
				{#each Array(Math.ceil(mockStoryboard.durationSeconds) + 1) as _, i}
					<div class="time-marker" style="left: {(i / mockStoryboard.durationSeconds) * 100}%">
						<span class="time-label">{i.toString().padStart(2, '0')}</span>
					</div>
				{/each}
			</div>

			<!-- Scene Blocks -->
			<div class="scene-blocks">
				{#each mockScenes as scene}
					{@const startPercent = ((scene.startTimeSeconds || 0) / mockStoryboard.durationSeconds) * 100}
					{@const widthPercent = ((scene.durationSeconds || 0) / mockStoryboard.durationSeconds) * 100}
					<div
						class="scene-block"
						class:selected={selectedSceneId === scene.id}
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
			{Math.max(...mockScenes.map(s => s.durationSeconds || 0)).toFixed(0)}s
		</button>
		<button class="toolbar-button" aria-label="Video Track">
			1v
		</button>
		<button class="toolbar-button" aria-label="Filter">
			None
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
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		padding: 1.5rem;
		overflow-y: auto;
		min-height: 0;
	}

	/* Scene Panel */
	.scene-panel {
		display: flex;
		flex-direction: column;
		background-color: #2a2a2a;
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;
		transition: border-color 0.2s;
		border: 2px solid transparent;
	}

	.scene-panel.selected {
		border-color: #ffffff;
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
		cursor: pointer;
		transition: border-color 0.2s;
		border: 2px solid transparent;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.scene-block.selected {
		border-color: #ffffff;
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

	.help-button {
		margin-left: auto;
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
