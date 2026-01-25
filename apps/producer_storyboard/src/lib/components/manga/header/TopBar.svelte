<script lang="ts">
	type Props = {
		projectId: string;
	};

	let { projectId }: Props = $props();

	// TODO: Implement TopBar with credit display
</script>

<div class="top-bar">
	<div class="top-bar-content">
		<h2 class="top-bar-title">Manga Editor</h2>
		<div class="top-bar-actions">
			<!-- Credit display and export buttons will go here -->
		</div>
	</div>
</div>

<style>
	.top-bar {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		background-color: var(--bg-primary, #ffffff);
	}

	.top-bar-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.top-bar-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.top-bar-actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
