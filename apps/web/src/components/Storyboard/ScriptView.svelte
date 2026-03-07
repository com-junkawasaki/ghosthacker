<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Panel, PanelData } from '$lib/gen/proto/storyboard_pb';
	import { PanelDataSchema, DialogueSchema } from '$lib/gen/proto/storyboard_pb';
	import { create } from '@bufbuild/protobuf';

	let { panels = [] } = $props<{
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
		editBuffer = create(PanelDataSchema, panel.data ?? {});
		dispatch('panelSelect', panel);
		dispatch('contextAdd', { type: 'panel', data: panel });
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
		(editBuffer as any)[field] = value;
	}

	function handleDialogueBufferUpdate(index: number, field: string, value: any) {
		if (!editBuffer?.dialogue) return;
		const newDialogues = [...editBuffer.dialogue];
		const currentDialogue = newDialogues[index];
		if (!currentDialogue) return;

		const dialogueInit: any = {
			speaker: currentDialogue.speaker,
			text: currentDialogue.text,
			delivery: currentDialogue.delivery,
			subtext: currentDialogue.subtext,
			emotion: currentDialogue.emotion,
			pauseBeforeMs: currentDialogue.pauseBeforeMs,
			pauseAfterMs: currentDialogue.pauseAfterMs,
			mangaLayout: currentDialogue.mangaLayout,
		};
		dialogueInit[field] = value;

		newDialogues[index] = create(DialogueSchema, dialogueInit);
		editBuffer.dialogue = newDialogues;
	}

	function getAvatarUrl(speaker: string) {
		if (!speaker || speaker === 'Narration' || speaker === 'NewsHacker') return '';
		const id = speaker.replace('character:', '');
		const baseUrl = typeof window !== 'undefined' 
			? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin)
			: 'http://localhost:8081';
		return `${baseUrl}/images/characters/${id}.png`;
	}
</script>

<div class="script-view">
	<div class="screenplay-page">
		{#each pageNumbers as pageNum}
			<div class="page-break-marker">PAGE {pageNum}</div>
			
			{#each pagesMap[pageNum] as panel, i (panel.panel + '-' + i)}
				{@const isEditing = editingPanelId === `${panel.pageNumber}-${panel.panel}`}
				
				<div 
					class="script-block" 
					class:editing={isEditing}
					onclick={() => !isEditing && startEditing(panel)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && startEditing(panel)}
				>
					<!-- Scene Heading (using environment) -->
					<div class="scene-heading">
						{panel.data?.environment?.toUpperCase() || 'INT. LOCATION - DAY'}
					</div>

					{#if isEditing && editBuffer}
						<div class="edit-form">
							<textarea 
								class="action-input"
								value={editBuffer.visualNote ?? ''} 
								oninput={(e) => handleBufferUpdate('visualNote', e.currentTarget.value)}
								placeholder="Action lines..."
							></textarea>
							
							<div class="dialogue-editor">
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
									</div>
								{/each}
							</div>
							<button class="done-btn" onclick={() => saveAndStopEditing(panel)}>Done</button>
						</div>
					{:else}
						<!-- Action Lines -->
						<div class="action-line">
							{panel.data?.visualNote || '---'}
						</div>

						<!-- Dialogues -->
						<div class="dialogue-container">
							{#each panel.data?.dialogue ?? [] as d}
								<div class="dialogue-block">
									<div class="character-name">
										{#if getAvatarUrl(d.speaker)}
											<img src={getAvatarUrl(d.speaker)} alt={d.speaker} class="mini-avatar" onerror={(e) => (e.currentTarget as HTMLImageElement).style.display='none'} />
										{/if}
										{d.speaker.toUpperCase()}
									</div>
									{#if d.delivery}
										<div class="parenthetical">({d.delivery})</div>
									{/if}
									<div class="dialogue-text">
										{d.text}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>

<style>
	@reference "tailwindcss";

	.script-view { @apply flex-1 overflow-y-auto bg-zinc-100 p-2 md:p-6; font-family: 'Courier Prime', 'Courier New', Courier, monospace; }
	.screenplay-page { @apply mx-auto min-h-full w-full max-w-[900px] rounded-xl border border-zinc-200 bg-white px-4 py-6 shadow-sm md:px-16 md:py-14; }
	.page-break-marker { @apply my-6 border-b border-dashed border-zinc-200 pb-2 text-center text-[11px] tracking-[0.2em] text-zinc-400 md:my-8; }
	.script-block { @apply mb-6 rounded-lg p-3 transition md:mb-8 md:p-4; }
	.script-block:hover:not(.editing) { @apply cursor-pointer bg-zinc-50; }
	.script-block.editing { @apply bg-white ring-2 ring-sky-400; }
	.scene-heading { @apply mb-3 text-sm font-bold uppercase tracking-wider text-zinc-800; }
	.action-line { @apply mb-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700; }
	.dialogue-container { @apply flex flex-col gap-4 md:gap-6; }
	.dialogue-block { @apply mx-auto flex w-full flex-col items-center text-center md:w-8/12; }
	.character-name { @apply relative mb-2 flex flex-col items-center gap-2 text-xs font-bold tracking-wide text-zinc-900 md:text-sm; }
	.mini-avatar { @apply h-11 w-11 rounded-full border-2 border-zinc-200 bg-zinc-100 object-cover shadow-sm md:h-[60px] md:w-[60px]; }
	.parenthetical { @apply mb-1 text-xs text-zinc-600 md:text-sm; }
	.dialogue-text { @apply w-full text-left text-sm leading-relaxed text-zinc-800; }
	.edit-form { @apply flex flex-col gap-4; }
	.action-input { @apply min-h-[96px] w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200; font-family: inherit; }
	.dialogue-edit-row { @apply mb-3 border-l-2 border-zinc-200 pl-3; }
	.speaker-input { @apply mb-2 w-full border-0 border-b border-zinc-300 bg-transparent text-xs font-bold uppercase tracking-wide outline-none focus:border-sky-500; }
	.text-input { @apply w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200; font-family: inherit; }
	.done-btn { @apply self-end rounded-md bg-zinc-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700; }
</style>
