<script lang="ts">
	import EmotionMap from './EmotionMap.svelte';
	import type { Emotion } from './EmotionMap.svelte';

	type Props = {
		selectedEmotion?: Emotion | null;
		onSelect: (emotion: Emotion | null) => void;
		onClose: () => void;
	};

	let { selectedEmotion = null, onSelect, onClose }: Props = $props();

	function handleEmotionSelect(emotion: Emotion) {
		onSelect(emotion);
	}

	function handleClear() {
		onSelect(null);
	}
</script>

<div class="emotion-selector-overlay" onclick={(e) => e.target === e.currentTarget && onClose()}>
	<div class="emotion-selector-modal" onclick={(e) => e.stopPropagation()}>
		<div class="emotion-selector-header">
			<h3>Select Emotion</h3>
			<button class="close-button" onclick={onClose} aria-label="Close emotion selector">
				✕
			</button>
		</div>
		<div class="emotion-selector-content">
			<EmotionMap {selectedEmotion} onSelect={handleEmotionSelect} />
			{#if selectedEmotion}
				<div class="selected-emotion-info">
					<span class="emotion-label">Selected: </span>
					<span class="emotion-name" style="color: {selectedEmotion.color}">
						{selectedEmotion.name}
					</span>
					<button class="clear-button" onclick={handleClear}>Clear</button>
				</div>
			{/if}
		</div>
		<div class="emotion-selector-actions">
			<button class="cancel-button" onclick={onClose}>Cancel</button>
			<button class="confirm-button" onclick={onClose} disabled={false}>
				Confirm
			</button>
		</div>
	</div>
</div>

<style>
	.emotion-selector-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.emotion-selector-modal {
		background-color: #2a2a2a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 1.5rem;
		min-width: 600px;
		max-width: 90vw;
		max-height: 90vh;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		display: flex;
		flex-direction: column;
	}

	.emotion-selector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.emotion-selector-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 500;
		color: #ffffff;
	}

	.close-button {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s, color 0.2s;
	}

	.close-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}

	.emotion-selector-content {
		flex: 1;
		margin-bottom: 1rem;
	}

	.selected-emotion-info {
		margin-top: 1rem;
		padding: 0.75rem;
		background-color: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.emotion-label {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
	}

	.emotion-name {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.clear-button {
		margin-left: auto;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.clear-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.emotion-selector-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.cancel-button,
	.confirm-button {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s;
		border: 1px solid transparent;
	}

	.cancel-button {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}

	.cancel-button:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.15);
	}

	.confirm-button {
		background-color: #3b82f6;
		color: #ffffff;
	}

	.confirm-button:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.confirm-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

