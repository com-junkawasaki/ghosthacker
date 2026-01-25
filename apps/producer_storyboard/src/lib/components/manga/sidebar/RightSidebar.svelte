<script lang="ts">
	type Props = {
		mangaId: string;
		selectedPanelId?: string | null;
		selectedBubbleId?: string | null;
	};

	let { mangaId, selectedPanelId, selectedBubbleId }: Props = $props();

	// TODO: Implement RightSidebar with tabs for prompt, page settings, model browser
</script>

<div class="right-sidebar">
	<div class="right-sidebar-header">
		<h3 class="right-sidebar-title">Properties</h3>
	</div>
	<div class="right-sidebar-content">
		{#if selectedPanelId}
			<div class="panel-properties">
				<p>Panel ID: {selectedPanelId}</p>
				<!-- Panel properties will be implemented here -->
			</div>
		{:else if selectedBubbleId}
			<div class="bubble-properties">
				<p>Bubble ID: {selectedBubbleId}</p>
				<!-- Bubble properties will be implemented here -->
			</div>
		{:else}
			<div class="empty-properties">
				<p>Select a panel or bubble to edit properties</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.right-sidebar {
		width: 300px;
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--border-color, #e5e7eb);
		background-color: var(--bg-secondary, #f9fafb);
		overflow-y: auto;
	}

	.right-sidebar-header {
		padding: 0.75rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.right-sidebar-title {
		margin: 0;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.right-sidebar-content {
		flex: 1;
		padding: 1rem;
	}

	.panel-properties,
	.bubble-properties,
	.empty-properties {
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.empty-properties {
		text-align: center;
		padding: 2rem 0;
	}
</style>
