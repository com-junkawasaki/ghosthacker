<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import AudioPlayer from './AudioPlayer.svelte';

	type Props = {
		sceneId: string;
		characters: Array<{ id: string; name: string }>;
		dialogues: Array<{
			id: string;
			characterId: string;
			language: string;
			text: string;
			humeVoiceId: string | null;
			audioUrl: string | null;
		}>;
		onDialogueChange: () => void;
	};

	let { sceneId, characters, dialogues: initialDialogues = [], onDialogueChange = () => {} }: Props = $props();
	let dialogues = $state([...initialDialogues]);
	
	// Update dialogues when initialDialogues changes
	$effect(() => {
		dialogues = [...initialDialogues];
	});

	type HumeVoice = {
		id: string;
		name: string;
		description: string | null;
		language: string | null;
	};

	const languages = [
		{ code: 'ja', name: 'Japanese' },
		{ code: 'en', name: 'English' },
		{ code: 'hi', name: 'Hindi' },
	];

	let selectedCharacterId = $state<string>('');
	let selectedLanguage = $state<string>('ja');
	let dialogueText = $state('');
	let selectedVoiceId = $state<string>('');
	let humeVoices = $state<HumeVoice[]>([]);
	let loadingVoices = $state(false);
	let translating = $state(false);
	let generating = $state(false);

	const orgId = $derived($page.params.orgId);

	// TODO: Load Hume voices via grpc-go when supported
	async function loadHumeVoices() {
		if (!browser) return;
		// TODO: Implement when grpc-go supports ListHumeVoices
		console.warn('[DialogueEditor] Hume voices loading not yet supported in grpc-go');
		loadingVoices = false;
	}

	async function saveDialogue() {
		if (!browser) {
			return;
		}
		
		if (!sceneId || !selectedCharacterId || !dialogueText.trim()) {
			console.warn('[DialogueEditor] Cannot save dialogue: missing required fields', {
				hasSceneId: !!sceneId,
				hasCharacterId: !!selectedCharacterId,
				hasText: !!dialogueText.trim()
			});
			return;
		}

		try {
			const response = await fetch('/api/dialogues', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					sceneId,
					characterId: selectedCharacterId,
					language: selectedLanguage,
					text: dialogueText.trim(),
					humeVoiceId: selectedVoiceId || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to save dialogue');
			}

			dialogueText = '';
			selectedVoiceId = '';
			await onDialogueChange();
		} catch (err) {
			console.error('[DialogueEditor] Error saving dialogue:', err);
			alert(err instanceof Error ? err.message : 'Failed to save dialogue');
		}
	}

	// TODO: Translate dialogue via grpc-go when supported
	async function translateDialogue(dialogueId: string, targetLanguage: string) {
		alert('Dialogue translation not yet supported in grpc-go');
		translating = false;
	}

	async function generateAudio(dialogueId: string) {
		if (!browser) return;

		try {
			generating = true;
			const result = await generateDialogueAudioStore.mutate({ dialogueId });

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			await onDialogueChange();
		} catch (err) {
			console.error('[DialogueEditor] Error generating audio:', err);
			alert(err instanceof Error ? err.message : 'Failed to generate audio');
		} finally {
			generating = false;
		}
	}

	$effect(() => {
		if (browser) {
			loadHumeVoices();
		}
	});
</script>

<div class="dialogue-editor">
	<h3>Dialogues</h3>

	<div class="dialogue-form">
		<div class="form-row">
			<div class="form-group">
				<label for="character-select">Character</label>
				<select id="character-select" bind:value={selectedCharacterId}>
					<option value="">Select character</option>
					{#each characters as char (char.id)}
						<option value={char.id}>{char.name}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="language-select">Language</label>
				<select id="language-select" bind:value={selectedLanguage}>
					{#each languages as lang}
						<option value={lang.code}>{lang.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="form-group">
			<label for="dialogue-text">Dialogue Text</label>
			<textarea
				id="dialogue-text"
				bind:value={dialogueText}
				placeholder="Enter dialogue text..."
				rows="3"
			></textarea>
		</div>

		<div class="form-group">
			<label for="voice-select">Hume AI Voice</label>
			<select id="voice-select" bind:value={selectedVoiceId} disabled={loadingVoices}>
				<option value="">Select voice (optional)</option>
				{#each humeVoices as voice (voice.id)}
					<option value={voice.id}>{voice.name} {voice.language ? `(${voice.language})` : ''}</option>
				{/each}
			</select>
		</div>

		<button type="button" class="save-button" onclick={saveDialogue} disabled={!selectedCharacterId || !dialogueText.trim()}>
			Add Dialogue
		</button>
	</div>

	<div class="dialogues-list">
		{#each dialogues as dialogue (dialogue.id)}
			<div class="dialogue-item">
				<div class="dialogue-header">
					<span class="character-name">
						{characters.find(c => c.id === dialogue.characterId)?.name || 'Unknown'}
					</span>
					<span class="language-badge">{dialogue.language}</span>
				</div>
				<div class="dialogue-text">{dialogue.text}</div>
				<div class="dialogue-actions">
					{#if dialogue.humeVoiceId}
						<button
							type="button"
							class="action-button"
							onclick={() => generateAudio(dialogue.id)}
							disabled={generating}
						>
							{generating ? 'Generating...' : 'Generate Audio'}
						</button>
					{/if}
					{#each languages.filter(l => l.code !== dialogue.language) as lang}
						<button
							type="button"
							class="action-button"
							onclick={() => translateDialogue(dialogue.id, lang.code)}
							disabled={translating}
						>
							Translate to {lang.name}
						</button>
					{/each}
				</div>
				{#if dialogue.audioUrl || dialogue.id}
					<AudioPlayer dialogueId={dialogue.id} audioUrl={dialogue.audioUrl} />
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.dialogue-editor {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
		margin-top: 1rem;
	}

	.dialogue-editor h3 {
		margin: 0 0 1rem 0;
		color: white;
		font-size: 1rem;
	}

	.dialogue-form {
		margin-bottom: 1.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.form-group select,
	.form-group textarea {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		padding: 0.5rem;
		color: white;
		font-size: 0.875rem;
	}

	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.form-group select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.save-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.save-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dialogues-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.dialogue-item {
		background: rgba(0, 0, 0, 0.3);
		padding: 1rem;
		border-radius: 0.25rem;
	}

	.dialogue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.character-name {
		color: white;
		font-weight: 600;
	}

	.language-badge {
		background: rgba(59, 130, 246, 0.3);
		color: #93c5fd;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
	}

	.dialogue-text {
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.75rem;
		line-height: 1.5;
	}

	.dialogue-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.action-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.action-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

