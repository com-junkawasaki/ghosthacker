<script lang="ts">
	type Props = {
		open: boolean;
		onClose: () => void;
		onGenerate: (prompt: string, modelId: string) => void;
	};

	let { open, onClose, onGenerate }: Props = $props();

	let prompt = $state('');
	let modelId = $state('');

	// TODO: Implement image generation dialog with model selection
</script>

{#if open}
	<div class="dialog-overlay" onclick={onClose}>
		<div class="dialog-content" onclick={(e) => e.stopPropagation()}>
			<h3>Generate Panel Image</h3>
			<input type="text" bind:value={prompt} placeholder="Enter prompt" />
			<input type="text" bind:value={modelId} placeholder="Model ID" />
			<div class="dialog-actions">
				<button type="button" onclick={onClose}>Cancel</button>
				<button type="button" onclick={() => { onGenerate(prompt, modelId); onClose(); }}>Generate</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.dialog-content {
		background-color: white;
		padding: 2rem;
		border-radius: 0.5rem;
		max-width: 500px;
		width: 90%;
	}

	.dialog-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}
</style>
