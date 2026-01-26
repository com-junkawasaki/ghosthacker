<script lang="ts">
	import { mangaStore } from '$lib/stores/mangaStore.svelte';
	import type { ToolType } from '$lib/stores/mangaStore.svelte';

	const tools: { id: ToolType; label: string; icon: string }[] = [
		{ id: 'select', label: 'Select', icon: '↖' },
		{ id: 'pen', label: 'Pen', icon: '✎' },
		{ id: 'eraser', label: 'Eraser', icon: '⌫' },
		{ id: 'shape', label: 'Shape', icon: '▭' },
		{ id: 'text', label: 'Text', icon: 'T' },
	];

	function handleToolSelect(tool: ToolType) {
		mangaStore.setSelectedTool(tool);
	}
</script>

<div class="bottom-toolbar">
	<div class="toolbar-content">
		{#each tools as tool (tool.id)}
			<button
				type="button"
				onclick={() => handleToolSelect(tool.id)}
				class="tool-btn"
				class:active={mangaStore.state.selectedTool === tool.id}
				title={tool.label}
			>
				<span class="tool-icon">{tool.icon}</span>
				<span class="tool-label">{tool.label}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.bottom-toolbar {
		padding: 0.5rem 1rem;
		border-top: 1px solid var(--border-color, #e5e7eb);
		background-color: var(--bg-primary, #ffffff);
	}

	.toolbar-content {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.tool-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
		background: none;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tool-btn:hover {
		background-color: var(--bg-hover, #f3f4f6);
	}

	.tool-btn.active {
		background-color: #dbeafe;
		border-color: #3b82f6;
	}

	.tool-icon {
		font-size: 1.25rem;
	}

	.tool-label {
		font-size: 0.75rem;
	}
</style>

