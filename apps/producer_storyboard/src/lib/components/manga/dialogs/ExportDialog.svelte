<script lang="ts">
	type Props = {
		open: boolean;
		onClose: () => void;
		onExport: (format: 'png' | 'jpeg' | 'pdf') => void;
	};

	let { open, onClose, onExport }: Props = $props();

	// TODO: Implement export dialog
</script>

{#if open}
	<div class="dialog-overlay" onclick={onClose}>
		<div class="dialog-content" onclick={(e) => e.stopPropagation()}>
			<h3>Export Page</h3>
			<div class="export-options">
				<button type="button" onclick={() => { onExport('png'); onClose(); }}>PNG</button>
				<button type="button" onclick={() => { onExport('jpeg'); onClose(); }}>JPEG</button>
				<button type="button" onclick={() => { onExport('pdf'); onClose(); }}>PDF</button>
			</div>
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

	.export-options {
		display: flex;
		gap: 0.5rem;
		margin: 1rem 0;
	}
</style>
