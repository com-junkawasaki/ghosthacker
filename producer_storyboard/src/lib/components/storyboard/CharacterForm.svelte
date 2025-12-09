<script lang="ts">
	type Props = {
		character: {
			id: string;
			name: string;
			description: string | null;
		} | null;
		onSave: (name: string, description: string | null) => void;
		onCancel: () => void;
	};

	let { character, onSave, onCancel }: Props = $props();

	let name = $state(character?.name || '');
	let description = $state(character?.description || '');

	function handleSubmit() {
		if (!name.trim()) {
			alert('Character name is required');
			return;
		}
		onSave(name.trim(), description.trim() || null);
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
	.form-group textarea {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.25rem;
		padding: 0.5rem;
		color: white;
		font-size: 0.875rem;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #3b82f6;
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

