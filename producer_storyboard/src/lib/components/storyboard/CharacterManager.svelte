<script lang="ts">
	import { browser } from '$app/environment';
	import { ListCharactersStore } from '../../../../.houdini/plugins/houdini-svelte/stores/ListCharacters.js';
	import { CreateCharacterStore } from '../../../../.houdini/plugins/houdini-svelte/stores/CreateCharacter.js';
	import { UpdateCharacterStore } from '../../../../.houdini/plugins/houdini-svelte/stores/UpdateCharacter.js';
	import { DeleteCharacterStore } from '../../../../.houdini/plugins/houdini-svelte/stores/DeleteCharacter.js';
	import CharacterForm from './CharacterForm.svelte';
	import CharacterAssetManager from './CharacterAssetManager.svelte';

	type Props = {
		projectId: string;
		open: boolean;
	};

	let { projectId, open = $bindable(false) }: Props = $props();

	type Character = {
		id: string;
		projectId: string;
		name: string;
		description: string | null;
		personality: string | null;
		background: string | null;
		defaultHumeVoiceId: string | null;
		profileImageId: string | null;
		createdAt: string;
		updatedAt: string;
	};

	let characters = $state<Character[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let editingCharacter: Character | null = $state(null);
	let showForm = $state(false);
	let selectedCharacterId = $state<string | null>(null);
	let deletingCharacterId = $state<string | null>(null);
	let showDeleteConfirm = $state(false);

	let listCharactersStore: ListCharactersStore | null = null;
	let createCharacterStore: CreateCharacterStore | null = null;
	let updateCharacterStore: UpdateCharacterStore | null = null;
	let deleteCharacterStore: DeleteCharacterStore | null = null;

	if (browser) {
		listCharactersStore = new ListCharactersStore();
		createCharacterStore = new CreateCharacterStore();
		updateCharacterStore = new UpdateCharacterStore();
		deleteCharacterStore = new DeleteCharacterStore();
	}

	async function loadCharacters() {
		if (!browser || !listCharactersStore || !projectId) return;

		try {
			loading = true;
			error = null;
			const result = await listCharactersStore.fetch({ variables: { projectId } });
			if (result?.data?.characters) {
				characters = result.data.characters as Character[];
			}
		} catch (err) {
			console.error('[CharacterManager] Error loading characters:', err);
			error = err instanceof Error ? err.message : 'Failed to load characters';
		} finally {
			loading = false;
		}
	}

	async function createCharacter(
		name: string,
		description: string | null,
		personality: string | null,
		background: string | null,
		defaultHumeVoiceId: string | null,
		profileImageId: string | null
	) {
		if (!browser || !createCharacterStore || !projectId) return;

		try {
			const result = await createCharacterStore.mutate({
				input: {
					projectId,
					name,
					description: description || null,
					personality: personality || null,
					background: background || null,
					defaultHumeVoiceId: defaultHumeVoiceId || null,
					profileImageId: profileImageId || null,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			await loadCharacters();
			showForm = false;
		} catch (err) {
			console.error('[CharacterManager] Error creating character:', err);
			error = err instanceof Error ? err.message : 'Failed to create character';
		}
	}

	async function updateCharacter(
		id: string,
		name: string,
		description: string | null,
		personality: string | null,
		background: string | null,
		defaultHumeVoiceId: string | null,
		profileImageId: string | null
	) {
		if (!browser || !updateCharacterStore) return;

		try {
			const result = await updateCharacterStore.mutate({
				input: {
					id,
					name,
					description: description || null,
					personality: personality || null,
					background: background || null,
					defaultHumeVoiceId: defaultHumeVoiceId || null,
					profileImageId: profileImageId || null,
				},
			});

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			await loadCharacters();
			editingCharacter = null;
		} catch (err) {
			console.error('[CharacterManager] Error updating character:', err);
			error = err instanceof Error ? err.message : 'Failed to update character';
		}
	}

	function requestDelete(id: string) {
		deletingCharacterId = id;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		deletingCharacterId = null;
		showDeleteConfirm = false;
	}

	async function confirmDelete() {
		if (!browser || !deleteCharacterStore || !deletingCharacterId) return;

		try {
			const result = await deleteCharacterStore.mutate({ id: deletingCharacterId });

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			await loadCharacters();
			deletingCharacterId = null;
			showDeleteConfirm = false;
		} catch (err) {
			console.error('[CharacterManager] Error deleting character:', err);
			error = err instanceof Error ? err.message : 'Failed to delete character';
			deletingCharacterId = null;
			showDeleteConfirm = false;
		}
	}

	$effect(() => {
		if (open && projectId) {
			loadCharacters();
		}
	});
</script>

{#if open}
	<div class="character-manager-overlay" onclick={(e) => {
		if (e.target === e.currentTarget) {
			open = false;
		}
	}}>
		<div class="character-manager" onclick={(e) => e.stopPropagation()}>
			<div class="header">
				<h2>Characters</h2>
				<button type="button" class="close-button" onclick={() => open = false}>✕</button>
			</div>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			<div class="actions">
				<button
					type="button"
					class="add-button"
					onclick={() => {
						editingCharacter = null;
						showForm = true;
					}}
				>
					+ Add Character
				</button>
			</div>

			{#if showForm}
				<CharacterForm
					character={editingCharacter}
					onSave={(name, description, personality, background, defaultHumeVoiceId, profileImageId) => {
						if (editingCharacter) {
							updateCharacter(editingCharacter.id, name, description, personality, background, defaultHumeVoiceId, profileImageId);
						} else {
							createCharacter(name, description, personality, background, defaultHumeVoiceId, profileImageId);
						}
					}}
					onCancel={() => {
						showForm = false;
						editingCharacter = null;
					}}
				/>
			{/if}

			{#if loading}
				<div class="loading">Loading...</div>
			{:else}
				<div class="character-list">
					{#each characters as character (character.id)}
						<div class="character-item">
							<div class="character-info">
								{#if character.profileImageId}
									<img
										src={`/api/character-assets/${character.profileImageId}`}
										alt={character.name}
										class="character-avatar"
									/>
								{:else}
									<div class="character-avatar-placeholder">
										{character.name.charAt(0).toUpperCase()}
									</div>
								{/if}
								<div class="character-details">
									<h3>{character.name}</h3>
									{#if character.description}
										<p class="character-description">{character.description}</p>
									{/if}
									{#if character.personality}
										<p class="character-meta"><strong>Personality:</strong> {character.personality}</p>
									{/if}
									{#if character.background}
										<p class="character-meta"><strong>Background:</strong> {character.background}</p>
									{/if}
								</div>
							</div>
							<div class="character-actions">
								<button
									type="button"
									class="edit-button"
									onclick={() => {
										editingCharacter = character;
										showForm = true;
										selectedCharacterId = null;
									}}
								>
									Edit
								</button>
								<button
									type="button"
									class="assets-button"
									onclick={() => {
										selectedCharacterId = selectedCharacterId === character.id ? null : character.id;
										editingCharacter = null;
										showForm = false;
									}}
								>
									Assets
								</button>
								<button
									type="button"
									class="delete-button"
									onclick={() => requestDelete(character.id)}
								>
									Delete
								</button>
							</div>
						</div>
						{#if selectedCharacterId === character.id}
							<div class="character-assets-section">
								<CharacterAssetManager
									characterId={character.id}
									onAssetChange={() => {
										loadCharacters();
									}}
								/>
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if showDeleteConfirm && deletingCharacterId}
				<div class="delete-confirm-overlay" onclick={(e) => {
					if (e.target === e.currentTarget) {
						cancelDelete();
					}
				}}>
					<div class="delete-confirm-dialog" onclick={(e) => e.stopPropagation()}>
						<h3>Delete Character</h3>
						<p>Are you sure you want to delete this character? This action cannot be undone.</p>
						<div class="delete-confirm-actions">
							<button
								type="button"
								class="cancel-button"
								onclick={() => cancelDelete()}
							>
								Cancel
							</button>
							<button
								type="button"
								class="confirm-delete-button"
								onclick={() => confirmDelete()}
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.character-manager-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.character-manager {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 600px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.header h2 {
		margin: 0;
		color: white;
	}

	.close-button {
		background: none;
		border: none;
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
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

	.character-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.character-item {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.character-info {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.character-avatar,
	.character-avatar-placeholder {
		width: 60px;
		height: 60px;
		border-radius: 0.25rem;
		object-fit: cover;
		flex-shrink: 0;
	}

	.character-avatar-placeholder {
		background: rgba(59, 130, 246, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.character-details {
		flex: 1;
	}

	.character-details h3 {
		margin: 0 0 0.5rem 0;
		color: white;
	}

	.character-description {
		margin: 0 0 0.5rem 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
	}

	.character-meta {
		margin: 0.25rem 0;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.75rem;
	}

	.character-meta strong {
		color: rgba(255, 255, 255, 0.8);
	}

	.character-assets-section {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.character-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.edit-button,
	.assets-button,
	.delete-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.edit-button:hover,
	.assets-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.assets-button {
		background: rgba(59, 130, 246, 0.2);
		border-color: rgba(59, 130, 246, 0.4);
	}

	.assets-button:hover {
		background: rgba(59, 130, 246, 0.3);
	}

	.delete-button:hover {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.loading {
		color: rgba(255, 255, 255, 0.7);
		text-align: center;
		padding: 2rem;
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

	.cancel-button,
	.confirm-delete-button {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		border: none;
	}

	.cancel-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.cancel-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.confirm-delete-button {
		background: #ef4444;
		color: white;
	}

	.confirm-delete-button:hover {
		background: #dc2626;
	}
</style>

