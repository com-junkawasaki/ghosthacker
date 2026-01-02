<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import AudioPlayer from './AudioPlayer.svelte';
	import EmotionSelector from './EmotionSelector.svelte';
	import type { Emotion } from './EmotionMap.svelte';

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
			emotionName?: string | null;
			emotionX?: number | null;
			emotionY?: number | null;
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
	let selectedEmotion = $state<Emotion | null>(null);
	let showEmotionSelector = $state(false);
	let editingDialogueId = $state<string | null>(null);
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
				emotionName: selectedEmotion?.name || null,
				emotionX: selectedEmotion?.x || null,
				emotionY: selectedEmotion?.y || null,
			}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to save dialogue');
			}

			dialogueText = '';
			selectedVoiceId = '';
			selectedEmotion = null;
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

	async function updateDialogueEmotion(dialogueId: string, emotion: Emotion | null) {
		if (!browser) return;

		try {
			const response = await fetch(`/api/dialogues/${dialogueId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Org-Id': orgId,
				},
				body: JSON.stringify({
					emotionName: emotion?.name || null,
					emotionX: emotion?.x || null,
					emotionY: emotion?.y || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }));
				throw new Error(errorData.error || 'Failed to update dialogue emotion');
			}

			await onDialogueChange();
		} catch (err) {
			console.error('[DialogueEditor] Error updating dialogue emotion:', err);
			alert(err instanceof Error ? err.message : 'Failed to update dialogue emotion');
		}
	}

	function openEmotionSelector(dialogueId: string) {
		editingDialogueId = dialogueId;
		const dialogue = dialogues.find((d) => d.id === dialogueId);
		if (dialogue?.emotionName && dialogue?.emotionX !== null && dialogue?.emotionY !== null) {
			selectedEmotion = {
				name: dialogue.emotionName,
				x: dialogue.emotionX,
				y: dialogue.emotionY,
				color: '#3b82f6', // Default color, will be updated by EmotionMap
			};
		} else {
			selectedEmotion = null;
		}
		showEmotionSelector = true;
	}

	function handleEmotionSelect(emotion: Emotion | null) {
		selectedEmotion = emotion;
	}

	async function handleEmotionConfirm() {
		if (editingDialogueId) {
			await updateDialogueEmotion(editingDialogueId, selectedEmotion);
		}
		showEmotionSelector = false;
		editingDialogueId = null;
		selectedEmotion = null;
	}

	function handleEmotionCancel() {
		const wasEditing = !!editingDialogueId;
		showEmotionSelector = false;
		editingDialogueId = null;
		if (!wasEditing) {
			// Only clear emotion if we were creating a new dialogue, not editing
			selectedEmotion = null;
		}
	}

	// Determine if dialogue should be on left or right side
	function getDialogueSide(index: number): 'left' | 'right' {
		if (index === 0) return 'left';
		const currentDialogue = dialogues[index];
		const previousDialogue = dialogues[index - 1];
		if (currentDialogue?.characterId === previousDialogue?.characterId) {
			// Same character continues on same side
			return getDialogueSide(index - 1);
		}
		// Different character switches side
		return getDialogueSide(index - 1) === 'left' ? 'right' : 'left';
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

	function getEmotionColor(emotionName: string): string {
		const emotionColors: Record<string, string> = {
			Determination: '#ff6b35',
			Calmness: '#87ceeb',
			Tiredness: '#708090',
			Boredom: '#a9a9a9',
			Relief: '#ffb347',
			Anxiety: '#9370db',
			Anger: '#dc143c',
			Disgust: '#228b22',
			Sadness: '#1e90ff',
			Pain: '#8b0000',
			Fear: '#ba55d3',
			Neutral: '#808080',
			Interest: '#87ceeb',
			Surprise: '#4169e1',
			Joy: '#ffd700',
			Triumph: '#ff8c00',
			Amusement: '#ff6347',
			Adoration: '#ff69b4',
			Awe: '#87ceeb',
		};
		return emotionColors[emotionName] || '#3b82f6';
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
				{#if characters.length === 0}
					<div class="no-characters-message">
						<p>No characters available. Please create a character first.</p>
					</div>
				{:else}
					<select id="character-select" bind:value={selectedCharacterId}>
						<option value="">Select character</option>
						{#each characters as char (char.id)}
							<option value={char.id}>{char.name}</option>
						{/each}
					</select>
				{/if}
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

		<div class="form-row">
			<div class="form-group">
				<label for="voice-select">Hume AI Voice</label>
				<select id="voice-select" bind:value={selectedVoiceId} disabled={loadingVoices}>
					<option value="">Select voice (optional)</option>
					{#each humeVoices as voice (voice.id)}
						<option value={voice.id}>{voice.name} {voice.language ? `(${voice.language})` : ''}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label>Emotion</label>
				<div class="emotion-selector-button-container">
					<button
						type="button"
						class="emotion-selector-button"
						onclick={() => {
							editingDialogueId = null;
							showEmotionSelector = true;
						}}
					>
						{#if selectedEmotion}
							<span class="emotion-badge" style="background-color: {selectedEmotion.color}">
								{selectedEmotion.name}
							</span>
						{:else}
							<span class="emotion-placeholder">Select emotion (optional)</span>
						{/if}
					</button>
					{#if selectedEmotion}
						<button
							type="button"
							class="emotion-clear-button"
							onclick={() => (selectedEmotion = null)}
							aria-label="Clear emotion"
						>
							✕
						</button>
					{/if}
				</div>
			</div>
		</div>

		<button type="button" class="save-button" onclick={saveDialogue} disabled={!selectedCharacterId || !dialogueText.trim()}>
			Add Dialogue
		</button>
	</div>

	<div class="dialogues-chat">
		{#each dialogues as dialogue, index (dialogue.id)}
			{@const side = getDialogueSide(index)}
			{@const character = characters.find(c => c.id === dialogue.characterId)}
			<div class="dialogue-message" class:left={side === 'left'} class:right={side === 'right'}>
				<div class="dialogue-bubble">
					<div class="dialogue-header">
						<span class="character-name">{character?.name || 'Unknown'}</span>
						{#if dialogue.emotionName}
							<span class="emotion-badge" style="background-color: {getEmotionColor(dialogue.emotionName)}">
								{dialogue.emotionName}
							</span>
						{/if}
						<span class="language-badge">{dialogue.language}</span>
					</div>
					<div class="dialogue-text">{dialogue.text}</div>
					<div class="dialogue-actions">
						<button
							type="button"
							class="action-button emotion-button"
							onclick={() => openEmotionSelector(dialogue.id)}
							title="Select emotion"
						>
							{ dialogue.emotionName ? 'Edit Emotion' : 'Add Emotion' }
						</button>
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
			</div>
		{/each}
	</div>

	{#if showEmotionSelector}
		<EmotionSelector
			selectedEmotion={selectedEmotion}
			onSelect={handleEmotionSelect}
			onClose={() => {
				if (editingDialogueId) {
					handleEmotionConfirm();
				} else {
					handleEmotionCancel();
				}
			}}
		/>
	{/if}
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

	.no-characters-message {
		padding: 0.75rem;
		background: rgba(255, 193, 7, 0.1);
		border: 1px solid rgba(255, 193, 7, 0.3);
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.875rem;
	}

	.no-characters-message p {
		margin: 0;
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

	.emotion-selector-button-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.emotion-selector-button {
		flex: 1;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		padding: 0.5rem;
		color: white;
		font-size: 0.875rem;
		cursor: pointer;
		text-align: left;
	}

	.emotion-selector-button:hover {
		border-color: #3b82f6;
	}

	.emotion-placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.emotion-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		color: #000000;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.emotion-clear-button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.7);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.emotion-clear-button:hover {
		background: rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}

	.dialogues-chat {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem 0;
	}

	.dialogue-message {
		display: flex;
		width: 100%;
	}

	.dialogue-message.left {
		justify-content: flex-start;
	}

	.dialogue-message.right {
		justify-content: flex-end;
	}

	.dialogue-bubble {
		max-width: 70%;
		background: rgba(0, 0, 0, 0.3);
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		position: relative;
	}

	.dialogue-message.left .dialogue-bubble {
		border-top-left-radius: 0.25rem;
		background: rgba(59, 130, 246, 0.2);
		border: 1px solid rgba(59, 130, 246, 0.3);
	}

	.dialogue-message.right .dialogue-bubble {
		border-top-right-radius: 0.25rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.dialogue-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.character-name {
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.language-badge {
		background: rgba(59, 130, 246, 0.3);
		color: #93c5fd;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.625rem;
	}

	.dialogue-text {
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.5rem;
		line-height: 1.5;
		font-size: 0.875rem;
		word-wrap: break-word;
	}

	.dialogue-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.75rem;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.action-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.emotion-button {
		background: rgba(147, 112, 219, 0.2);
		border-color: rgba(147, 112, 219, 0.4);
	}

	.emotion-button:hover:not(:disabled) {
		background: rgba(147, 112, 219, 0.3);
		border-color: rgba(147, 112, 219, 0.5);
	}
</style>

