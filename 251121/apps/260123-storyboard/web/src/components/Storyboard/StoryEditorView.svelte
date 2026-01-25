<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import { PanelDataSchema, DialogueSchema } from '$lib/gen/proto/storyboard_pb';
	import { create } from '@bufbuild/protobuf';

	let { panels = [], episodeId = '', storyboardPath = '' } = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
	}>();

	const dispatch = createEventDispatcher();

	// Group panels by page
	let pagesMap = $derived(panels.reduce((acc: Record<number, Panel[]>, panel: Panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) {
			acc[pageNum] = [];
		}
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>));

	let pageNumbers = $derived(Object.keys(pagesMap)
		.map(Number)
		.sort((a, b) => a - b));

	// Editing state
	let editingPanelId = $state<string | null>(null);
	let editBuffer = $state<PanelData | null>(null);

	function startEditing(panel: Panel) {
		editingPanelId = `${panel.pageNumber}-${panel.panel}`;
		// Create a deep copy of panel data for local editing
		editBuffer = create(PanelDataSchema, panel.data ?? {});
	}

	function saveAndStopEditing(panel: Panel) {
		if (editBuffer) {
			dispatch('update', {
				pageNumber: panel.pageNumber,
				panel: panel.panel,
				data: editBuffer
			});
		}
		editingPanelId = null;
		editBuffer = null;
	}

	function handleBufferUpdate(field: string, value: any) {
		if (!editBuffer) return;
		// Update local buffer
		(editBuffer as any)[field] = value;
	}

	function handleDialogueBufferUpdate(index: number, field: string, value: any) {
		if (!editBuffer?.dialogue) return;
		const newDialogues = [...editBuffer.dialogue];
		newDialogues[index] = create(DialogueSchema, {
			...newDialogues[index],
			[field]: value
		});
		editBuffer.dialogue = newDialogues;
	}
</script>

<div class="story-editor-view">
	<div class="document-container">
		{#each pageNumbers as pageNum}
			<section class="page-section">
				<header class="page-header">
					<h2>PAGE {pageNum}</h2>
				</header>

				<div class="panels-list">
					{#each pagesMap[pageNum] as panel (panel.panel)}
						{@const isEditing = editingPanelId === `${panel.pageNumber}-${panel.panel}`}
						<div 
							class="panel-row" 
							class:editing={isEditing}
							onclick={() => !isEditing && startEditing(panel)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && startEditing(panel)}
						>
							<div class="meta-sidebar">
								<div class="cut-number">#{panel.panel}</div>
								<div class="char-list">
									{#each panel.data?.characters ?? [] as char}
										<span class="char-tag">{char.replace('character:', '')}</span>
									{/each}
								</div>
								{#if panel.data?.shot}
									<div class="shot-tag">{panel.data.shot}</div>
								{/if}
							</div>

							<div class="content-main">
								{#if isEditing && editBuffer}
									<div class="edit-form">
										<div class="field">
											<div class="label-with-ai">
												<label>Visual Note / Action</label>
												<button class="ai-trigger-btn cinematic" onclick={() => dispatch('agentTrigger', { agent: 'cinematic' })}>Sketch AI</button>
											</div>
											<textarea 
												value={editBuffer.visualNote ?? ''} 
												oninput={(e) => handleBufferUpdate('visualNote', e.currentTarget.value)}
											></textarea>
										</div>
										
										<div class="dialogue-editor">
											<div class="label-with-ai">
												<label>Dialogues</label>
												<button class="ai-trigger-btn dialogue" onclick={() => dispatch('agentTrigger', { agent: 'dialogue' })}>Dialogue AI</button>
											</div>
											{#each editBuffer.dialogue ?? [] as d, i}
												<div class="dialogue-edit-row">
													<input 
														class="speaker-input"
														value={d.speaker} 
														oninput={(e) => handleDialogueBufferUpdate(i, 'speaker', e.currentTarget.value)}
													/>
													<textarea 
														class="text-input"
														value={d.text} 
														oninput={(e) => handleDialogueBufferUpdate(i, 'text', e.currentTarget.value)}
													></textarea>
													<div class="metadata-inputs">
														<input 
															placeholder="Delivery"
															value={d.delivery} 
															oninput={(e) => handleDialogueBufferUpdate(i, 'delivery', e.currentTarget.value)}
														/>
														<input 
															placeholder="Subtext"
															value={d.subtext} 
															oninput={(e) => handleDialogueBufferUpdate(i, 'subtext', e.currentTarget.value)}
														/>
													</div>
												</div>
											{/each}
										</div>
										<button class="done-btn" onclick={() => saveAndStopEditing(panel)}>Done</button>
									</div>
								{:else}
									<div class="display-mode">
										<div class="visual-note">
											<span class="label">ACTION:</span>
											{panel.data?.visualNote ?? '---'}
											{#if panel.data?.cameraDirection}
												<span class="camera-dir">[{panel.data.cameraDirection}]</span>
											{/if}
										</div>

										<div class="dialogue-display">
											{#each panel.data?.dialogue ?? [] as d}
												<div class="dialogue-line">
													<span class="speaker">{d.speaker}:</span>
													<span class="text">「{d.text}」</span>
													{#if d.delivery}
														<span class="delivery">({d.delivery})</span>
													{/if}
													{#if d.subtext}
														<div class="subtext">// {d.subtext}</div>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>

<style>
	.story-editor-view {
		flex: 1;
		overflow-y: auto;
		background: #fdfdfb;
		padding: 3rem 1rem;
	}

	.document-container {
		max-width: 850px;
		margin: 0 auto;
		background: white;
		box-shadow: 0 0 20px rgba(0,0,0,0.05);
		min-height: 100vh;
		padding: 4rem;
	}

	.page-section {
		margin-bottom: 4rem;
	}

	.page-header {
		border-bottom: 2px solid #333;
		margin-bottom: 2rem;
		padding-bottom: 0.5rem;
	}

	.page-header h2 {
		font-size: 0.9rem;
		letter-spacing: 0.2em;
		color: #333;
		margin: 0;
	}

	.panel-row {
		display: flex;
		gap: 2rem;
		padding: 1.5rem;
		border-radius: 4px;
		transition: background 0.2s;
		border-bottom: 1px solid #f0f0f0;
	}

	.panel-row:hover:not(.editing) {
		background: #f9f9f7;
		cursor: pointer;
	}

	.panel-row.editing {
		background: #fff;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
		border: 1px solid #4a90e2;
		margin: 1rem -1rem;
		padding: 2rem;
	}

	.meta-sidebar {
		width: 120px;
		flex-shrink: 0;
		font-family: 'Courier New', Courier, monospace;
	}

	.cut-number {
		font-weight: bold;
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
	}

	.char-tag {
		display: inline-block;
		font-size: 0.7rem;
		background: #eee;
		padding: 2px 6px;
		border-radius: 3px;
		margin-right: 4px;
		margin-bottom: 4px;
		color: #555;
	}

	.shot-tag {
		font-size: 0.7rem;
		color: #888;
		text-transform: uppercase;
		margin-top: 0.5rem;
	}

	.content-main {
		flex: 1;
		line-height: 1.6;
	}

	.visual-note {
		margin-bottom: 1.5rem;
		color: #444;
	}

	.visual-note .label {
		font-weight: bold;
		font-size: 0.8rem;
		color: #888;
		margin-right: 0.5rem;
	}

	.camera-dir {
		color: #e67e22;
		font-size: 0.85rem;
		margin-left: 0.5rem;
	}

	.dialogue-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.dialogue-line {
		position: relative;
	}

	.speaker {
		font-weight: bold;
		margin-right: 0.5rem;
		text-transform: uppercase;
		font-size: 0.9rem;
	}

	.delivery {
		color: #2ecc71;
		font-size: 0.85rem;
		font-style: italic;
	}

	.subtext {
		font-size: 0.8rem;
		color: #95a5a6;
		margin-top: 0.2rem;
		padding-left: 1.5rem;
		font-style: italic;
	}

	/* Edit Form */
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field label {
		display: block;
		font-size: 0.75rem;
		font-weight: bold;
		color: #888;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
	}

	.label-with-ai {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.label-with-ai label {
		margin-bottom: 0;
	}

	.ai-trigger-btn {
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.65rem;
		font-weight: bold;
		border: none;
		cursor: pointer;
		color: white;
		opacity: 0.8;
		transition: opacity 0.2s;
	}

	.ai-trigger-btn:hover {
		opacity: 1;
	}

	.ai-trigger-btn.cinematic { background: #e67e22; }
	.ai-trigger-btn.dialogue { background: #e74c3c; }

	textarea, input {
		width: 100%;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 0.75rem;
		font-family: inherit;
		font-size: 0.95rem;
	}

	textarea {
		min-height: 80px;
		resize: vertical;
	}

	.dialogue-edit-row {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.speaker-input {
		font-weight: bold;
		text-transform: uppercase;
	}

	.metadata-inputs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.metadata-inputs input {
		font-size: 0.8rem;
		padding: 0.4rem;
	}

	.done-btn {
		align-self: flex-end;
		padding: 0.5rem 2rem;
		background: #4a90e2;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
	}
</style>
