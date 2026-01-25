<script lang="ts">
	import type { LayoutTemplate } from '$lib/manga-layouts';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import MangaTemplateThumbnail from './MangaTemplateThumbnail.svelte';
	import { generatePanelImage } from '$lib/client/storyboard-client';

	let { 
		templates, 
		selectedPanel, 
		panels,
		onAccept,
		onUpdatePanel
	} = $props<{
		templates: LayoutTemplate[];
		selectedPanel: { pageNumber: number, panel: number } | null;
		panels: Panel[];
		onAccept: (template: LayoutTemplate) => void;
		onUpdatePanel: (page: number, panel: number, data: PanelData) => void;
	}>();

	let activeTab = $state<'prompt' | 'page'>('page');
	let selectedTemplate = $state<LayoutTemplate | null>(null);

	// Find the currently selected panel's data
	let panelData = $derived(
		selectedPanel 
			? panels.find((p: any) => p.pageNumber === selectedPanel.pageNumber && p.panel === selectedPanel.panel)?.data 
			: null
	);

	// Auto-switch to prompt tab when a panel is selected
	$effect(() => {
		if (selectedPanel) {
			activeTab = 'prompt';
		}
	});

	// Select first template by default if available or when templates change
	$effect(() => {
		if (templates.length > 0) {
			if (!selectedTemplate || !templates.find((t: any) => t.name === selectedTemplate?.name)) {
				selectedTemplate = templates[0] || null;
			}
		} else {
			selectedTemplate = null;
		}
	});

	let generating = $state(false);
	let promptError = $state('');

	async function handleGenerate() {
		if (!selectedPanel || !panelData || generating) return;
		
		generating = true;
		promptError = '';
		
		try {
			const result = await generatePanelImage(
				'', // storyboardPath
				'', // episodeId (handled by backend if empty)
				selectedPanel.pageNumber,
				selectedPanel.panel,
				panelData
			);
			
			if (result.success && result.generatedImage) {
				// The update will come back via stream or we can trigger a local update
				// For now, let the backend broadcast handle it
			}
		} catch (err) {
			promptError = err instanceof Error ? err.message : 'Generation failed';
		} finally {
			generating = false;
		}
	}
</script>

<div class="manga-sidebar">
	<div class="tabs">
		<button 
			class="tab" 
			class:active={activeTab === 'prompt'} 
			onclick={() => activeTab = 'prompt'}
		>
			Prompt
		</button>
		<button 
			class="tab" 
			class:active={activeTab === 'page'} 
			onclick={() => activeTab = 'page'}
		>
			Page
		</button>
	</div>

	<div class="sidebar-content">
		{#if activeTab === 'page'}
			<h3>Choose a Panel Template</h3>
			<div class="template-grid">
				{#each templates as template}
					<MangaTemplateThumbnail 
						{template} 
						active={selectedTemplate?.name === template.name}
						onclick={() => selectedTemplate = template}
					/>
				{/each}
			</div>
		{:else}
			<h3>Panel Settings</h3>
			{#if selectedPanel && panelData}
				<div class="prompt-editor">
					<div class="field">
						<label>Visual Note</label>
						<textarea 
							bind:value={panelData.visualNote}
							placeholder="Describe the scene..."
							onchange={() => onUpdatePanel(selectedPanel!.pageNumber, selectedPanel!.panel, panelData!)}
						></textarea>
					</div>
					
					<div class="field">
						<label>Runway Prompt</label>
						<textarea 
							bind:value={panelData.runwayPrompt}
							placeholder="AI generation prompt..."
							onchange={() => onUpdatePanel(selectedPanel!.pageNumber, selectedPanel!.panel, panelData!)}
						></textarea>
					</div>

					{#if promptError}
						<div class="error-msg">{promptError}</div>
					{/if}

					<button 
						class="generate-btn" 
						disabled={generating}
						onclick={handleGenerate}
					>
						{generating ? 'Generating...' : 'Generate Image'}
					</button>
				</div>
			{:else}
				<div class="empty-selection">
					Select a panel to edit its prompt
				</div>
			{/if}
		{/if}
	</div>

	{#if activeTab === 'page'}
		<div class="sidebar-footer">
			<button 
				class="accept-btn" 
				disabled={!selectedTemplate}
				onclick={() => selectedTemplate && onAccept(selectedTemplate)}
			>
				<span class="check-icon">✓</span> Accept
			</button>
		</div>
	{/if}
</div>

<style>
	.manga-sidebar {
		width: 100%;
		height: 100%;
		background: #fff;
		display: flex;
		flex-direction: column;
		color: #111827;
	}

	.tabs {
		display: flex;
		padding: 1rem;
		gap: 0.5rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.tab {
		flex: 1;
		padding: 0.5rem;
		border: none;
		background: #eee;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		color: #4b5563;
		transition: all 0.2s;
	}

	.tab.active {
		background: #fff;
		color: #111827;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.sidebar-content {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	h3 {
		font-size: 1rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
	}

	.template-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.prompt-editor {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		color: #6b7280;
	}

	textarea {
		width: 100%;
		min-height: 100px;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
		resize: vertical;
		font-family: inherit;
	}

	.generate-btn {
		width: 100%;
		padding: 0.75rem;
		background: #10b981;
		color: #fff;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.generate-btn:hover:not(:disabled) {
		background: #059669;
	}

	.generate-btn:disabled {
		background: #d1d5db;
		cursor: not-allowed;
	}

	.sidebar-footer {
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.accept-btn {
		width: 100%;
		padding: 0.75rem;
		background: #7c3aed;
		color: #fff;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.accept-btn:hover:not(:disabled) {
		background: #6d28d9;
	}

	.empty-selection {
		text-align: center;
		color: #9ca3af;
		padding: 2rem 0;
		font-style: italic;
	}

	.error-msg {
		color: #ef4444;
		font-size: 0.875rem;
		background: #fef2f2;
		padding: 0.5rem;
		border-radius: 4px;
	}
</style>
