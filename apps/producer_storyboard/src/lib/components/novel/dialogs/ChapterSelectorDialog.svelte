<script lang="ts">
	type Props = {
		open: boolean;
		onClose: () => void;
		onSelect: (chapterId: string) => void;
	};

	let { open, onClose, onSelect }: Props = $props();

	// TODO: Implement chapter selector dialog
</script>

{#if open}
	<div class="dialog-overlay" onclick={onClose}>
		<div class="dialog-content" onclick={(e) => e.stopPropagation()}>
			<h3>Select Chapter</h3>
			<p>Chapter selector will be implemented here</p>
			<button type="button" onclick={onClose}>Close</button>
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
</style>
