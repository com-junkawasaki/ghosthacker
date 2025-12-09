<script lang="ts">
	import { browser } from '$app/environment';
	import { ListCharactersStore } from '../../../../.houdini/plugins/houdini-svelte/stores/ListCharacters.js';
	import { CreateCharacterStore } from '../../../../.houdini/plugins/houdini-svelte/stores/CreateCharacter.js';
	import { UpdateCharacterStore } from '../../../../.houdini/plugins/houdini-svelte/stores/UpdateCharacter.js';
	import { DeleteCharacterStore } from '../../../../.houdini/plugins/houdini-svelte/stores/DeleteCharacter.js';
	import CharacterForm from './CharacterForm.svelte';

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
		createdAt: string;
		updatedAt: string;
	};

	let characters = $state<Character[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let editingCharacter: Character | null = $state(null);
	let showForm = $state(false);

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

	async function createCharacter(name: string, description: string | null) {
		if (!browser || !createCharacterStore || !projectId) return;

		try {
			const result = await createCharacterStore.mutate({
				input: {
					projectId,
					name,
					description: description || null,
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

	async function updateCharacter(id: string, name: string, description: string | null) {
		if (!browser || !updateCharacterStore) return;

		try {
			const result = await updateCharacterStore.mutate({
				input: {
					id,
					name,
					description: description || null,
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

	async function deleteCharacter(id: string) {
		if (!browser || !deleteCharacterStore) return;
		if (!confirm('Are you sure you want to delete this character?')) return;

		try {
			const result = await deleteCharacterStore.mutate({ id });

			if (result?.errors && result.errors.length > 0) {
				throw new Error(result.errors[0].message);
			}

			await loadCharacters();
		} catch (err) {
			console.error('[CharacterManager] Error deleting character:', err);
			error = err instanceof Error ? err.message : 'Failed to delete character';
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
					onSave={(name, description) => {
						if (editingCharacter) {
							updateCharacter(editingCharacter.id, name, description);
						} else {
							createCharacter(name, description);
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
								<h3>{character.name}</h3>
								{#if character.description}
									<p>{character.description}</p>
								{/if}
							</div>
							<div class="character-actions">
								<button
									type="button"
									class="edit-button"
									onclick={() => {
										editingCharacter = character;
										showForm = true;
									}}
								>
									Edit
								</button>
								<button
									type="button"
									class="delete-button"
									onclick={() => deleteCharacter(character.id)}
								>
									Delete
								</button>
							</div>
						</div>
					{/each}
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
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.character-info h3 {
		margin: 0 0 0.5rem 0;
		color: white;
	}

	.character-info p {
		margin: 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
	}

	.character-actions {
		display: flex;
		gap: 0.5rem;
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

	.loading {
		color: rgba(255, 255, 255, 0.7);
		text-align: center;
		padding: 2rem;
	}
</style>

