<script lang="ts">
	import { browser } from '$app/environment';
	import { ListHumeVoicesStore } from '../../../../.houdini/plugins/houdini-svelte/stores/ListHumeVoices.js';
	import { ListCharacterAssetsStore } from '../../../../.houdini/plugins/houdini-svelte/stores/ListCharacterAssets.js';

	type Props = {
		character: {
			id: string;
			name: string;
			description: string | null;
			personality: string | null;
			background: string | null;
			defaultHumeVoiceId: string | null;
			profileImageId: string | null;
		} | null;
		onSave: (
			name: string,
			description: string | null,
			personality: string | null,
			background: string | null,
			defaultHumeVoiceId: string | null,
			profileImageId: string | null
		) => void;
		onCancel: () => void;
	};

	let { character, onSave, onCancel }: Props = $props();

	let name = $state(character?.name || '');
	let description = $state(character?.description || '');
	let personality = $state(character?.personality || '');
	let background = $state(character?.background || '');
	let defaultHumeVoiceId = $state(character?.defaultHumeVoiceId || '');
	let profileImageId = $state(character?.profileImageId || '');

	type HumeVoice = {
		id: string;
		name: string;
		description: string | null;
		language: string | null;
	};

	type CharacterAsset = {
		id: string;
		assetType: string;
		assetFormat: string | null;
	};

	let humeVoices = $state<HumeVoice[]>([]);
	let characterAssets = $state<CharacterAsset[]>([]);
	let loadingVoices = $state(false);
	let loadingAssets = $state(false);

	let listHumeVoicesStore: ListHumeVoicesStore | null = null;
	let listCharacterAssetsStore: ListCharacterAssetsStore | null = null;

	if (browser) {
		listHumeVoicesStore = new ListHumeVoicesStore();
		listCharacterAssetsStore = new ListCharacterAssetsStore();
	}

	async function loadHumeVoices() {
		if (!browser || !listHumeVoicesStore) return;

		try {
			loadingVoices = true;
			const result = await listHumeVoicesStore.fetch();
			if (result?.data?.humeVoices) {
				humeVoices = result.data.humeVoices as HumeVoice[];
			}
		} catch (err) {
			console.error('[CharacterForm] Error loading Hume voices:', err);
		} finally {
			loadingVoices = false;
		}
	}

	async function loadCharacterAssets() {
		if (!browser || !listCharacterAssetsStore || !character?.id) return;

		try {
			loadingAssets = true;
			const result = await listCharacterAssetsStore.fetch({ variables: { characterId: character.id } });
			if (result?.data?.characterAssets) {
				characterAssets = result.data.characterAssets.filter((asset: CharacterAsset) => asset.assetType === 'image') as CharacterAsset[];
			}
		} catch (err) {
			console.error('[CharacterForm] Error loading character assets:', err);
		} finally {
			loadingAssets = false;
		}
	}

	$effect(() => {
		if (browser) {
			loadHumeVoices();
			if (character?.id) {
				loadCharacterAssets();
			}
		}
	});

	function handleSubmit() {
		if (!name.trim()) {
			alert('Character name is required');
			return;
		}
		onSave(
			name.trim(),
			description.trim() || null,
			personality.trim() || null,
			background.trim() || null,
			defaultHumeVoiceId || null,
			profileImageId || null
		);
	}
</script>

<div class="character-form">
	<h3>{character ? 'Edit Character' : 'New Character'}</h3>
	<div class="form-group">
		<label for="character-name">Name *</label>
		<input
			id="character-name"
			type="text"
			bind:value={name}
			placeholder="Character name"
			required
		/>
	</div>
	<div class="form-group">
		<label for="character-description">Description</label>
		<textarea
			id="character-description"
			bind:value={description}
			placeholder="Character description"
			rows="3"
		></textarea>
	</div>
	<div class="form-group">
		<label for="character-personality">Personality</label>
		<textarea
			id="character-personality"
			bind:value={personality}
			placeholder="Character personality traits"
			rows="3"
		></textarea>
	</div>
	<div class="form-group">
		<label for="character-background">Background</label>
		<textarea
			id="character-background"
			bind:value={background}
			placeholder="Character background story"
			rows="4"
		></textarea>
	</div>
	<div class="form-group">
		<label for="character-hume-voice">Default Hume Voice</label>
		{#if loadingVoices}
			<select id="character-hume-voice" disabled>
				<option>Loading voices...</option>
			</select>
		{:else}
			<select id="character-hume-voice" bind:value={defaultHumeVoiceId}>
				<option value="">None</option>
				{#each humeVoices as voice}
					<option value={voice.id}>{voice.name} {voice.language ? `(${voice.language})` : ''}</option>
				{/each}
			</select>
		{/if}
	</div>
	{#if character?.id}
		<div class="form-group">
			<label for="character-profile-image">Profile Image</label>
			{#if loadingAssets}
				<select id="character-profile-image" disabled>
					<option>Loading images...</option>
				</select>
			{:else}
				<select id="character-profile-image" bind:value={profileImageId}>
					<option value="">None</option>
					{#each characterAssets as asset}
						<option value={asset.id}>Image ({asset.assetFormat || 'unknown'})</option>
					{/each}
				</select>
			{/if}
		</div>
	{/if}
	<div class="form-actions">
		<button type="button" class="save-button" onclick={handleSubmit}>
			Save
		</button>
		<button type="button" class="cancel-button" onclick={onCancel}>
			Cancel
		</button>
	</div>
</div>

<style>
	.character-form {
		background: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}

	.character-form h3 {
		margin: 0 0 1rem 0;
		color: white;
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

	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		padding: 0.5rem;
		color: white;
		font-size: 0.875rem;
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.form-group select option {
		background: #1a1a1a;
		color: white;
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
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
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
</style>

