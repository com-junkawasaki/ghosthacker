<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	type AudioType = 'sound-effect' | 'bgm';
	type AudioItem = {
		id: string;
		name: string;
		description: string | null;
		url: string | null;
		duration: number | null;
		prompt: string | null;
		status: 'pending' | 'generating' | 'completed' | 'failed';
		createdAt: string;
		updatedAt: string;
	};

	type Props = {
		projectId: string;
		audioType: AudioType;
		title: string;
	};

	let { projectId, audioType, title }: Props = $props();

	let audioItems = $state<AudioItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showGenerateDialog = $state(false);
	let showUploadDialog = $state(false);
	let isGenerating = $state(false);
	let isUploading = $state(false);
	let playingId = $state<string | null>(null);
	let audioElements = $state<Record<string, HTMLAudioElement>>({});

	// Generate form state
	let generatePrompt = $state('');
	let generateName = $state('');
	let makeInstrumental = $state(audioType === 'bgm');
	let modelVersion = $state('chirp-v4');

	// Upload form state
	let uploadName = $state('');
	let uploadFile = $state<File | null>(null);

	const apiEndpoint = `/api/${audioType === 'sound-effect' ? 'sound-effects' : 'bgm'}`;

	async function loadAudioItems() {
		if (!browser) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(`${apiEndpoint}?projectId=${projectId}`);
			if (!response.ok) {
				throw new Error(`Failed to load ${title}: ${response.statusText}`);
			}
			const data = await response.json();
			audioItems = data.items || [];
		} catch (err) {
			console.error(`[AudioManager] Error loading ${audioType}:`, err);
			error = err instanceof Error ? err.message : 'Failed to load audio items';
		} finally {
			loading = false;
		}
	}

	async function handleGenerate() {
		if (!generatePrompt.trim()) {
			alert('Please enter a description for the audio');
			return;
		}

		isGenerating = true;
		error = null;

		try {
			const response = await fetch(apiEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					name: generateName.trim() || `Generated ${audioType === 'bgm' ? 'BGM' : 'Sound Effect'}`,
					prompt: generatePrompt.trim(),
					makeInstrumental,
					modelVersion,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || `Failed to generate ${audioType}`);
			}

			const result = await response.json();
			console.log(`[AudioManager] Generated ${audioType}:`, result);

			// Add to list and refresh
			await loadAudioItems();

			// Reset form
			generatePrompt = '';
			generateName = '';
			showGenerateDialog = false;
		} catch (err) {
			console.error(`[AudioManager] Error generating ${audioType}:`, err);
			error = err instanceof Error ? err.message : 'Failed to generate audio';
		} finally {
			isGenerating = false;
		}
	}

	async function handleUpload() {
		if (!uploadFile) {
			alert('Please select a file to upload');
			return;
		}

		isUploading = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('file', uploadFile);
			formData.append('projectId', projectId);
			formData.append('name', uploadName.trim() || uploadFile.name);
			formData.append('audioType', audioType);

			const response = await fetch(`${apiEndpoint}/upload`, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to upload audio');
			}

			await loadAudioItems();

			// Reset form
			uploadName = '';
			uploadFile = null;
			showUploadDialog = false;
		} catch (err) {
			console.error(`[AudioManager] Error uploading ${audioType}:`, err);
			error = err instanceof Error ? err.message : 'Failed to upload audio';
		} finally {
			isUploading = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this audio?')) return;

		try {
			const response = await fetch(`${apiEndpoint}/${id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete audio');
			}

			audioItems = audioItems.filter((item) => item.id !== id);
		} catch (err) {
			console.error(`[AudioManager] Error deleting ${audioType}:`, err);
			error = err instanceof Error ? err.message : 'Failed to delete audio';
		}
	}

	function togglePlay(item: AudioItem) {
		if (!item.url) return;

		if (playingId === item.id) {
			// Stop current audio
			audioElements[item.id]?.pause();
			playingId = null;
		} else {
			// Stop any playing audio
			if (playingId && audioElements[playingId]) {
				audioElements[playingId].pause();
				audioElements[playingId].currentTime = 0;
			}

			// Play new audio
			if (!audioElements[item.id]) {
				const audio = new Audio(item.url);
				audio.addEventListener('ended', () => {
					playingId = null;
				});
				audioElements[item.id] = audio;
			}
			audioElements[item.id].play();
			playingId = item.id;
		}
	}

	function formatDuration(seconds: number | null): string {
		if (seconds === null) return '--:--';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			uploadFile = input.files[0];
			if (!uploadName) {
				uploadName = input.files[0].name.replace(/\.[^.]+$/, '');
			}
		}
	}

	onMount(() => {
		loadAudioItems();
	});
</script>

<div class="audio-manager">
	<header class="manager-header">
		<h1 class="page-title">{title}</h1>
		<div class="header-actions">
			<button class="btn btn-secondary" onclick={() => (showUploadDialog = true)}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M8 2v8M4 6l4-4 4 4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					<path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				Upload
			</button>
			<button class="btn btn-primary" onclick={() => (showGenerateDialog = true)}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
					<path d="M8 3v10M3 8h10" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				Generate with AI
			</button>
		</div>
	</header>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={() => (error = null)}>✕</button>
		</div>
	{/if}

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading {title.toLowerCase()}...</p>
		</div>
	{:else if audioItems.length === 0}
		<div class="empty-state">
			<div class="empty-icon">
				{#if audioType === 'sound-effect'}
					<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor">
						<path d="M8 32H16M24 20V44M40 24V40M56 28V36" stroke-width="3" stroke-linecap="round" />
					</svg>
				{:else}
					<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor">
						<path d="M24 52C24 55.3137 21.3137 58 18 58C14.6863 58 12 55.3137 12 52C12 48.6863 14.6863 46 18 46C21.3137 46 24 48.6863 24 52Z" stroke-width="3" />
						<path d="M24 52V14L52 8V46" stroke-width="3" />
						<path d="M52 46C52 49.3137 49.3137 52 46 52C42.6863 52 40 49.3137 40 46C40 42.6863 42.6863 40 46 40C49.3137 40 52 42.6863 52 46Z" stroke-width="3" />
					</svg>
				{/if}
			</div>
			<h2>No {title.toLowerCase()} yet</h2>
			<p>Generate AI audio or upload your own files to get started.</p>
			<div class="empty-actions">
				<button class="btn btn-primary" onclick={() => (showGenerateDialog = true)}>
					Generate with AI
				</button>
				<button class="btn btn-secondary" onclick={() => (showUploadDialog = true)}>
					Upload File
				</button>
			</div>
		</div>
	{:else}
		<div class="audio-grid">
			{#each audioItems as item (item.id)}
				<div class="audio-card" class:generating={item.status === 'generating'}>
					<div class="card-header">
						<span class="audio-name">{item.name}</span>
						{#if item.status === 'generating'}
							<span class="status-badge generating">Generating...</span>
						{:else if item.status === 'failed'}
							<span class="status-badge failed">Failed</span>
						{/if}
					</div>
					{#if item.description || item.prompt}
						<p class="audio-description">{item.description || item.prompt}</p>
					{/if}
					<div class="card-footer">
						<span class="duration">{formatDuration(item.duration)}</span>
						<div class="card-actions">
							{#if item.url && item.status === 'completed'}
								<button
									class="icon-btn play-btn"
									onclick={() => togglePlay(item)}
									aria-label={playingId === item.id ? 'Pause' : 'Play'}
								>
									{#if playingId === item.id}
										<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
											<rect x="5" y="4" width="3" height="12" rx="1" />
											<rect x="12" y="4" width="3" height="12" rx="1" />
										</svg>
									{:else}
										<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
											<path d="M6 4l10 6-10 6V4z" />
										</svg>
									{/if}
								</button>
							{/if}
							<button
								class="icon-btn delete-btn"
								onclick={() => handleDelete(item.id)}
								aria-label="Delete"
							>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
									<path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M12 4v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4" stroke-width="1.5" stroke-linecap="round" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Generate Dialog -->
{#if showGenerateDialog}
	<div
		class="dialog-overlay"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => e.target === e.currentTarget && (showGenerateDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showGenerateDialog = false)}
	>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<div class="dialog-header">
				<h2>Generate {audioType === 'bgm' ? 'BGM' : 'Sound Effect'} with AI</h2>
				<button class="close-btn" onclick={() => (showGenerateDialog = false)}>✕</button>
			</div>
			<div class="dialog-content">
				<div class="form-group">
					<label for="gen-name">Name (optional)</label>
					<input
						id="gen-name"
						type="text"
						bind:value={generateName}
						placeholder="Enter a name for this audio"
						disabled={isGenerating}
					/>
				</div>
				<div class="form-group">
					<label for="gen-prompt">Description *</label>
					<textarea
						id="gen-prompt"
						bind:value={generatePrompt}
						placeholder={audioType === 'bgm'
							? 'Describe the BGM you want (e.g., "Upbeat electronic music with synths and drums")'
							: 'Describe the sound effect (e.g., "Sword clash with metallic echo")'}
						rows="4"
						disabled={isGenerating}
					></textarea>
				</div>
				<div class="form-group">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={makeInstrumental} disabled={isGenerating} />
						<span>Make Instrumental (no vocals)</span>
					</label>
				</div>
				<div class="form-group">
					<label for="gen-model">Model Version</label>
					<select id="gen-model" bind:value={modelVersion} disabled={isGenerating}>
						<option value="chirp-v4">Chirp v4 (Latest)</option>
						<option value="chirp-v3">Chirp v3</option>
					</select>
				</div>
			</div>
			<div class="dialog-actions">
				<button class="btn btn-secondary" onclick={() => (showGenerateDialog = false)} disabled={isGenerating}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={handleGenerate}
					disabled={!generatePrompt.trim() || isGenerating}
				>
					{isGenerating ? 'Generating...' : 'Generate'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Upload Dialog -->
{#if showUploadDialog}
	<div
		class="dialog-overlay"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => e.target === e.currentTarget && (showUploadDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showUploadDialog = false)}
	>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<div class="dialog-header">
				<h2>Upload {audioType === 'bgm' ? 'BGM' : 'Sound Effect'}</h2>
				<button class="close-btn" onclick={() => (showUploadDialog = false)}>✕</button>
			</div>
			<div class="dialog-content">
				<div class="form-group">
					<label for="upload-file">Audio File *</label>
					<input
						id="upload-file"
						type="file"
						accept="audio/*"
						onchange={handleFileSelect}
						disabled={isUploading}
					/>
				</div>
				<div class="form-group">
					<label for="upload-name">Name</label>
					<input
						id="upload-name"
						type="text"
						bind:value={uploadName}
						placeholder="Enter a name for this audio"
						disabled={isUploading}
					/>
				</div>
			</div>
			<div class="dialog-actions">
				<button class="btn btn-secondary" onclick={() => (showUploadDialog = false)} disabled={isUploading}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={handleUpload}
					disabled={!uploadFile || isUploading}
				>
					{isUploading ? 'Uploading...' : 'Upload'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.audio-manager {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--sb-text-primary, #ffffff);
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		border: none;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #ef4444;
		margin-bottom: 1.5rem;
	}

	.error-banner button {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 0.25rem;
		font-size: 1.25rem;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.7);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-icon {
		margin-bottom: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.empty-state h2 {
		font-size: 1.25rem;
		margin: 0 0 0.5rem;
		color: white;
	}

	.empty-state p {
		margin: 0 0 1.5rem;
	}

	.empty-actions {
		display: flex;
		gap: 0.75rem;
	}

	.audio-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.audio-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 1rem;
		transition: all 0.2s;
	}

	.audio-card:hover {
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
	}

	.audio-card.generating {
		border-color: rgba(59, 130, 246, 0.4);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}

	.audio-name {
		font-weight: 600;
		color: white;
		font-size: 0.9375rem;
	}

	.status-badge {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
	}

	.status-badge.generating {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.status-badge.failed {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.audio-description {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 0.75rem;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.duration {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		font-family: monospace;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
	}

	.icon-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 6px;
		color: white;
		cursor: pointer;
		transition: all 0.15s;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.play-btn {
		background: #3b82f6;
	}

	.play-btn:hover {
		background: #2563eb;
	}

	.delete-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		color: #ef4444;
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
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.dialog-header h2 {
		margin: 0;
		font-size: 1.125rem;
		color: white;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.25rem;
	}

	.close-btn:hover {
		color: white;
	}

	.dialog-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
	}

	.form-group input[type='text'],
	.form-group input[type='file'],
	.form-group textarea,
	.form-group select {
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		color: white;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.checkbox-label {
		flex-direction: row !important;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox-label input {
		width: auto;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>

