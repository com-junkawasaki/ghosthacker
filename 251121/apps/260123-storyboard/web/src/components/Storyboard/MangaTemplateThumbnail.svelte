<script lang="ts">
	import type { LayoutTemplate } from '$lib/manga-layouts';

	let { template, active = false, onclick } = $props<{
		template: LayoutTemplate;
		active?: boolean;
		onclick: () => void;
	}>();
</script>

<button 
	class="template-thumbnail" 
	class:active 
	{onclick}
	title={template.name}
>
	<div class="preview-container">
		{#each template.panels as panel}
			<div 
				class="panel-preview"
				style="
					left: {panel.x}%;
					top: {panel.y}%;
					width: {panel.width}%;
					height: {panel.height}%;
				"
			></div>
		{/each}
	</div>
</button>

<style>
	.template-thumbnail {
		width: 100%;
		aspect-ratio: 1 / 1.414; /* B5 ratio */
		background: #fff;
		border: 2px solid #eee;
		border-radius: 8px;
		padding: 8px;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
	}

	.template-thumbnail:hover {
		border-color: #ddd;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
	}

	.template-thumbnail.active {
		border-color: #7c3aed;
		background: #f5f3ff;
	}

	.preview-container {
		position: relative;
		width: 100%;
		height: 100%;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
	}

	.panel-preview {
		position: absolute;
		border: 1px solid #9ca3af;
		background: #fff;
	}
</style>
