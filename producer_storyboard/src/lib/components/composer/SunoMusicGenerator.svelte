<script lang="ts">
	type Props = {
		open: boolean;
		onClose: () => void;
		onGenerate: (prompt: string, customMode: boolean, makeInstrumental: boolean, mv: string | null) => void;
	};

	let { open, onClose, onGenerate }: Props = $props();

	let prompt = $state('');
	let customMode = $state(true);
	let makeInstrumental = $state(false);
	let mv = $state('chirp-v4');
	let isGenerating = $state(false);

	function handleGenerate() {
		if (!prompt.trim()) return;
		isGenerating = true;
		onGenerate(prompt, customMode, makeInstrumental, mv);
		// Reset form after a delay
		setTimeout(() => {
			prompt = '';
			isGenerating = false;
		}, 1000);
	}
</script>

{#if open}
	<div class="suno-generator-overlay" onclick={(e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}}>
		<div class="suno-generator-dialog" onclick={(e) => e.stopPropagation()}>
			<div class="dialog-header">
				<h2>Generate AI Music</h2>
				<button class="close-button" onclick={() => onClose()}>✕</button>
			</div>

			<div class="dialog-content">
				<div class="form-group">
					<label for="prompt">Music Description</label>
					<textarea
						id="prompt"
						bind:value={prompt}
						placeholder="Describe the music you want to generate (e.g., 'A dreamy pop song about summer love')"
						rows="4"
						class="prompt-input"
					></textarea>
				</div>

				<div class="form-group">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={customMode} />
						<span>Custom Mode</span>
					</label>
				</div>

				<div class="form-group">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={makeInstrumental} />
						<span>Make Instrumental</span>
					</label>
				</div>

				<div class="form-group">
					<label for="mv">Model Version</label>
					<select id="mv" bind:value={mv} class="select-input">
						<option value="chirp-v4">Chirp v4</option>
						<option value="chirp-v3">Chirp v3</option>
					</select>
				</div>
			</div>

			<div class="dialog-actions">
				<button class="cancel-button" onclick={() => onClose()}>Cancel</button>
				<button
					class="generate-button"
					onclick={() => handleGenerate()}
					disabled={!prompt.trim() || isGenerating}
				>
					{#if isGenerating}
						Generating...
					{:else}
						Generate Music
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.suno-generator-overlay {
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

	.suno-generator-dialog {
		background: #1a1a1a;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 500px;
		width: 90%;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.dialog-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: white;
	}

	.close-button {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-button:hover {
		color: white;
	}

	.dialog-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.prompt-input {
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
		font-family: inherit;
		resize: vertical;
	}

	.prompt-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.select-input {
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		color: white;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.dialog-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.cancel-button,
	.generate-button {
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

	.generate-button {
		background: #3b82f6;
		color: white;
	}

	.generate-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.generate-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
