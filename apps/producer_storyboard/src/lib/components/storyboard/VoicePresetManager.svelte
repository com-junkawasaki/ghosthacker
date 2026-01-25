<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	type Props = {
		projectId: string;
	};

	let { projectId }: Props = $props();

	type VoicePreset = {
		id: string;
		projectId: string;
		name: string;
		humeVoiceId: string;
		description: string | null;
		characterId: string | null;
		sampleAudioId: string | null;
		settings: string | null;
		createdAt: string;
		updatedAt: string;
	};

	type Character = {
		id: string;
		name: string;
	};

	type HumeVoice = {
		id: string;
		name: string;
		description: string | null;
		language: string | null;
	};

	let presets = $state<VoicePreset[]>([]);
	let characters = $state<Character[]>([]);
	let humeVoices = $state<HumeVoice[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let editingPreset: VoicePreset | null = $state(null);
	let showForm = $state(false);
	let deletingPresetId = $state<string | null>(null);
	let showDeleteConfirm = $state(false);

	const orgId = $derived($page.params.orgId);

	async function loadPresets() {
		if (!browser || !projectId) return;

		try {
			loading = true;
			error = null;
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoicePresetManager.svelte:49',message:'loadPresets called',data:{projectId,orgId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion
			const apiUrl = `/api/voice-presets?projectId=${projectId}`;
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoicePresetManager.svelte:58',message:'Fetching API',data:{apiUrl,projectId,orgId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
			// #endregion
			const response = await fetch(apiUrl, {
				headers: {
					'X-Org-Id': orgId || '',
				},
			});
			
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoicePresetManager.svelte:60',message:'API response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion
			
			if (!response.ok) {
				const errorText = await response.text();
				// #region agent log
				fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoicePresetManager.svelte:65',message:'API error response',data:{status:response.status,statusText:response.statusText,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
				// #endregion
				let errorData: { error?: string } = { error: errorText || response.statusText };
				try {
					errorData = JSON.parse(errorText) as { error?: string };
				} catch {
					// Use default errorData
				}
				throw new Error(errorData.error || `Failed to load voice presets: ${response.statusText}`);
			}
			
			const result = await response.json();
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoicePresetManager.svelte:75',message:'API response parsed',data:{hasPresets:!!result?.presets,presetsCount:result?.presets?.length||0,resultKeys:Object.keys(result||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion
			if (result?.presets) {
				presets = result.presets as VoicePreset[];
			} else {
				// #region agent log
				fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoicePresetManager.svelte:79',message:'No presets in response',data:{result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
				// #endregion
				presets = [];
			}
		} catch (err) {
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoicePresetManager.svelte:84',message:'Exception caught',data:{errorMessage:err instanceof Error ? err.message : String(err),errorStack:err instanceof Error ? err.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
			// #endregion
			console.error('[VoicePresetManager] Error loading presets:', err);
			error = err instanceof Error ? err.message : 'Failed to load voice presets';
		} finally {
			loading = false;
		}
	}

	async function loadCharacters() {
		if (!browser || !projectId) return;

		try {
			const response = await fetch(`/api/characters?projectId=${projectId}`, {
				headers: {
					'X-Org-Id': orgId || '',
				},
			});
			
			if (response.ok) {
				const result = await response.json() as { characters?: Array<{ id: string; name: string }> };
				if (result?.characters) {
					characters = result.characters.map((c) => ({ id: c.id, name: c.name }));
				}
			}
		} catch (err) {
			console.error('[VoicePresetManager] Error loading characters:', err);
		}
	}

	async function loadHumeVoices() {
		if (!browser) return;

		try {
			const response = await fetch('/api/hume-voices', {
				headers: {
					'X-Org-Id': orgId || '',
				},
			});
			
			if (response.ok) {
				const result = await response.json();
				if (result?.voices) {
					humeVoices = result.voices as HumeVoice[];
				}
			}
		} catch (err) {
			console.error('[VoicePresetManager] Error loading Hume voices:', err);
		}
	}

	async function createPreset(
		name: string,
		humeVoiceId: string,
		description: string | null,
		characterId: string | null,
		sampleAudioId: string | null,
		settings: string | null
	) {
		if (!browser || !projectId) return;

		try {
			const response = await fetch('/api/voice-presets', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					projectId,
					name,
					humeVoiceId,
					description: description || null,
					characterId: characterId || null,
					sampleAudioId: sampleAudioId || null,
					settings: settings || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to create voice preset');
			}

			await loadPresets();
			showForm = false;
		} catch (err) {
			console.error('[VoicePresetManager] Error creating preset:', err);
			error = err instanceof Error ? err.message : 'Failed to create voice preset';
		}
	}

	async function updatePreset(
		id: string,
		name: string,
		humeVoiceId: string,
		description: string | null,
		characterId: string | null,
		sampleAudioId: string | null,
		settings: string | null
	) {
		if (!browser) return;

		try {
			const response = await fetch(`/api/voice-presets/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId || '',
				},
				body: JSON.stringify({
					name,
					humeVoiceId,
					description: description || null,
					characterId: characterId || null,
					sampleAudioId: sampleAudioId || null,
					settings: settings || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to update voice preset');
			}

			await loadPresets();
			editingPreset = null;
		} catch (err) {
			console.error('[VoicePresetManager] Error updating preset:', err);
			error = err instanceof Error ? err.message : 'Failed to update voice preset';
		}
	}

	function requestDelete(id: string) {
		deletingPresetId = id;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		deletingPresetId = null;
		showDeleteConfirm = false;
	}

	async function confirmDelete() {
		if (!browser || !deletingPresetId) return;

		try {
			const response = await fetch(`/api/voice-presets/${deletingPresetId}`, {
				method: 'DELETE',
				headers: {
					'X-Org-Id': orgId || '',
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to delete voice preset');
			}

			await loadPresets();
			deletingPresetId = null;
			showDeleteConfirm = false;
		} catch (err) {
			console.error('[VoicePresetManager] Error deleting preset:', err);
			error = err instanceof Error ? err.message : 'Failed to delete voice preset';
			deletingPresetId = null;
			showDeleteConfirm = false;
		}
	}

	function getCharacterName(characterId: string | null): string {
		if (!characterId) return 'None';
		const character = characters.find(c => c.id === characterId);
		return character?.name || 'Unknown';
	}

	function getHumeVoiceName(humeVoiceId: string): string {
		const voice = humeVoices.find(v => v.id === humeVoiceId);
		return voice?.name || humeVoiceId;
	}

	$effect(() => {
		if (projectId) {
			loadPresets();
			loadCharacters();
			loadHumeVoices();
		}
	});
</script>

<div class="voice-preset-manager">
	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="actions">
		<button
			type="button"
			class="add-button"
			onclick={() => {
				editingPreset = null;
				showForm = true;
			}}
		>
			+ Add Voice Preset
		</button>
	</div>

	{#if showForm}
		<div class="form-container">
			<h3>{editingPreset ? 'Edit Voice Preset' : 'Create Voice Preset'}</h3>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					const formData = new FormData(e.target as HTMLFormElement);
					const name = formData.get('name') as string;
					const humeVoiceId = formData.get('humeVoiceId') as string;
					const description = formData.get('description') as string | null;
					const characterId = formData.get('characterId') as string | null;
					
					if (editingPreset) {
						updatePreset(editingPreset.id, name, humeVoiceId, description, characterId || null, null, null);
					} else {
						createPreset(name, humeVoiceId, description, characterId || null, null, null);
					}
				}}
			>
				<div class="form-field">
					<label for="name">Name *</label>
					<input type="text" id="name" name="name" value={editingPreset?.name || ''} required />
				</div>
				<div class="form-field">
					<label for="humeVoiceId">Hume Voice *</label>
					<select id="humeVoiceId" name="humeVoiceId" required>
						<option value="">Select a voice...</option>
						{#each humeVoices as voice}
							<option value={voice.id} selected={editingPreset?.humeVoiceId === voice.id}>
								{voice.name} {voice.language ? `(${voice.language})` : ''}
							</option>
						{/each}
					</select>
				</div>
				<div class="form-field">
					<label for="description">Description</label>
					<textarea id="description" name="description">{editingPreset?.description || ''}</textarea>
				</div>
				<div class="form-field">
					<label for="characterId">Character</label>
					<select id="characterId" name="characterId">
						<option value="">None</option>
						{#each characters as character}
							<option value={character.id} selected={editingPreset?.characterId === character.id}>
								{character.name}
							</option>
						{/each}
					</select>
				</div>
				<div class="form-actions">
					<button type="submit" class="save-button">Save</button>
					<button
						type="button"
						class="cancel-button"
						onclick={() => {
							showForm = false;
							editingPreset = null;
						}}
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<div class="loading">Loading voice presets...</div>
	{:else}
		<div class="preset-list">
			{#if presets.length === 0}
				<div class="empty-state">No voice presets found. Create your first preset to get started.</div>
			{:else}
				{#each presets as preset (preset.id)}
					<div class="preset-item">
						<div class="preset-info">
							<h3>{preset.name}</h3>
							<p class="preset-meta">
								<strong>Hume Voice:</strong> {getHumeVoiceName(preset.humeVoiceId)}
							</p>
							{#if preset.description}
								<p class="preset-description">{preset.description}</p>
							{/if}
							{#if preset.characterId}
								<p class="preset-meta">
									<strong>Character:</strong> {getCharacterName(preset.characterId)}
								</p>
							{/if}
						</div>
						<div class="preset-actions">
							<button
								type="button"
								class="edit-button"
								onclick={() => {
									editingPreset = preset;
									showForm = true;
								}}
							>
								Edit
							</button>
							<button
								type="button"
								class="delete-button"
								onclick={() => requestDelete(preset.id)}
							>
								Delete
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}

	{#if showDeleteConfirm && deletingPresetId}
		<div
			class="delete-confirm-overlay"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			onclick={(e) => {
				if (e.target === e.currentTarget) {
					cancelDelete();
				}
			}}
		>
			<div class="delete-confirm-dialog">
				<h3>Delete Voice Preset</h3>
				<p>Are you sure you want to delete this voice preset? This action cannot be undone.</p>
				<div class="delete-confirm-actions">
					<button type="button" class="cancel-button" onclick={() => cancelDelete()}>
						Cancel
					</button>
					<button type="button" class="confirm-delete-button" onclick={() => confirmDelete()}>
						Delete
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.voice-preset-manager {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		width: 100%;
		max-width: 1200px;
	}

	.error {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
		padding: 0.75rem;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}

	.actions {
		margin-bottom: 1rem;
	}

	.add-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.add-button:hover {
		background: #2563eb;
	}

	.form-container {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}

	.form-container h3 {
		margin: 0 0 1rem 0;
		color: white;
	}

	.form-field {
		margin-bottom: 1rem;
	}

	.form-field label {
		display: block;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	.form-field input,
	.form-field textarea,
	.form-field select {
		width: 100%;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
	}

	.form-field textarea {
		min-height: 80px;
		resize: vertical;
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.save-button,
	.cancel-button {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		border: none;
	}

	.save-button {
		background: #3b82f6;
		color: white;
	}

	.save-button:hover {
		background: #2563eb;
	}

	.cancel-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.cancel-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.loading,
	.empty-state {
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		padding: 2rem;
	}

	.preset-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.preset-item {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
	}

	.preset-info {
		margin-bottom: 0.75rem;
	}

	.preset-info h3 {
		margin: 0 0 0.5rem 0;
		color: white;
		font-size: 1rem;
	}

	.preset-meta {
		margin: 0.25rem 0;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.75rem;
	}

	.preset-meta strong {
		color: rgba(255, 255, 255, 0.8);
	}

	.preset-description {
		margin: 0.5rem 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
	}

	.preset-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.edit-button,
	.delete-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.edit-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.delete-button:hover {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.delete-confirm-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.delete-confirm-dialog {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.delete-confirm-dialog h3 {
		margin: 0 0 1rem 0;
		color: #fca5a5;
		font-size: 1.25rem;
	}

	.delete-confirm-dialog p {
		margin: 0 0 1.5rem 0;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
	}

	.delete-confirm-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.confirm-delete-button {
		background: #ef4444;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		border: none;
	}

	.confirm-delete-button:hover {
		background: #dc2626;
	}
</style>
