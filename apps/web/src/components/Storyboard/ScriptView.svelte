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

	let pagesMap = $derived(panels.reduce((acc: Record<number, Panel[]>, panel: Panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) acc[pageNum] = [];
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>));

	let pageNumbers = $derived(Object.keys(pagesMap).map(Number).sort((a, b) => a - b));

	let editingPanelId = $state<string | null>(null);
	let editBuffer = $state<PanelData | null>(null);

	function startEditing(panel: Panel) {
		editingPanelId = `${panel.pageNumber}-${panel.panel}`;
		editBuffer = create(PanelDataSchema, panel.data ?? {});
		dispatch('panelSelect', panel);
		dispatch('contextAdd', { type: 'panel', data: panel });
	}

	function saveAndStopEditing(panel: Panel) {
		if (editBuffer) dispatch('update', { pageNumber: panel.pageNumber, panel: panel.panel, data: editBuffer });
		editingPanelId = null; editBuffer = null;
	}

	function handleBufferUpdate(field: string, value: any) {
		if (!editBuffer) return;
		(editBuffer as any)[field] = value;
	}

	function handleDialogueBufferUpdate(index: number, field: string, value: any) {
		if (!editBuffer?.dialogue) return;
		const newDialogues = [...editBuffer.dialogue];
		const cur = newDialogues[index];
		if (!cur) return;
		const init: any = { speaker: cur.speaker, text: cur.text, delivery: cur.delivery, subtext: cur.subtext, emotion: cur.emotion, pauseBeforeMs: cur.pauseBeforeMs, pauseAfterMs: cur.pauseAfterMs, mangaLayout: cur.mangaLayout };
		init[field] = value;
		newDialogues[index] = create(DialogueSchema, init);
		editBuffer.dialogue = newDialogues;
	}

	function getAvatarUrl(speaker: string) {
		if (!speaker || speaker === 'Narration' || speaker === 'NewsHacker') return '';
		const id = speaker.replace('character:', '');
		const baseUrl = typeof window !== 'undefined' ? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin) : 'http://localhost:8081';
		return `${baseUrl}/images/characters/${id}.png`;
	}
</script>

<div class="script-scroll">
	<div class="screenplay-page">
		{#each pageNumbers as pageNum}
			<div class="page-divider">PAGE {pageNum}</div>

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
					<div class="scene-heading">{panel.data?.environment?.toUpperCase() || 'INT. LOCATION - DAY'}</div>

					{#if isEditing && editBuffer}
						<div class="edit-form">
							<textarea
								class="field-input min-h-[80px] font-mono"
								value={editBuffer.visualNote ?? ''}
								oninput={(e) => handleBufferUpdate('visualNote', e.currentTarget.value)}
								placeholder="Action lines..."
							></textarea>
							{#each editBuffer.dialogue ?? [] as d, idx}
								<div class="border-l-2 border-zinc-200 pl-3 mb-3">
									<input class="field-input mb-1 text-[12px] font-bold uppercase" value={d.speaker}
										oninput={(e) => handleDialogueBufferUpdate(idx, 'speaker', e.currentTarget.value)} />
									<textarea class="field-input min-h-[60px] font-mono" value={d.text}
										oninput={(e) => handleDialogueBufferUpdate(idx, 'text', e.currentTarget.value)}></textarea>
								</div>
							{/each}
							<button class="btn btn-sm preset-filled-surface-900-50 mt-2 self-end text-[13px] font-semibold" onclick={() => saveAndStopEditing(panel)}>Done</button>
						</div>
					{:else}
						<div class="action-line">{panel.data?.visualNote || '---'}</div>
						{#each panel.data?.dialogue ?? [] as d}
							<div class="dialogue-block">
								<div class="char-name">
									{#if getAvatarUrl(d.speaker)}
										<img src={getAvatarUrl(d.speaker)} alt={d.speaker} class="mini-avatar" onerror={(e) => (e.currentTarget as HTMLImageElement).style.display='none'} />
									{/if}
									{d.speaker.toUpperCase()}
								</div>
								{#if d.delivery}<div class="parenthetical">({d.delivery})</div>{/if}
								<div class="dialogue-text">{d.text}</div>
							</div>
						{/each}
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>

<style>
	@reference "tailwindcss";

	.script-scroll {
		@apply flex-1 overflow-y-auto px-4 py-3;
		-webkit-overflow-scrolling: touch;
		font-family: 'Courier Prime', 'Courier New', Courier, monospace;
	}

	.screenplay-page {
		@apply mx-auto w-full max-w-[700px] rounded-2xl bg-white px-5 py-6 shadow-sm;
	}

	.page-divider {
		@apply my-6 border-b border-dashed border-zinc-200 pb-2 text-center text-[11px] tracking-[0.2em] text-zinc-400;
	}

	.script-block {
		@apply mb-6 rounded-xl p-4 transition;
	}
	.script-block:hover:not(.editing) {
		@apply cursor-pointer bg-zinc-50;
	}
	.script-block.editing {
		@apply bg-white ring-2 ring-[#007aff]/30;
	}

	.scene-heading {
		@apply mb-3 text-[14px] font-bold uppercase tracking-wider text-zinc-800;
	}

	.action-line {
		@apply mb-4 whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-700;
	}

	.dialogue-block {
		@apply mx-auto mb-4 flex w-full flex-col items-center text-center;
	}

	.char-name {
		@apply relative mb-2 flex flex-col items-center gap-2 text-[12px] font-bold tracking-wide text-zinc-900;
	}

	.mini-avatar {
		@apply h-10 w-10 rounded-full border-2 border-zinc-200 bg-zinc-100 object-cover;
	}

	.parenthetical {
		@apply mb-1 text-[12px] text-zinc-500;
	}

	.dialogue-text {
		@apply w-full text-left text-[14px] leading-relaxed text-zinc-800;
	}

	.edit-form {
		@apply flex flex-col gap-3;
	}

	.field-input {
		@apply w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[14px] outline-none transition;
		font-family: inherit;
	}
	.field-input:focus {
		@apply border-[#007aff] bg-white;
		box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
	}
</style>
