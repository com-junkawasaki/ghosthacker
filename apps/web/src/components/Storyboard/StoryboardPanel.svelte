<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Panel, Dialogue, GeneratedImage } from '$lib/gen/proto/storyboard_pb';
	import { PanelDataSchema, DialogueSchema, GeneratedImageSchema } from '$lib/gen/proto/storyboard_pb';
	import { create } from '@bufbuild/protobuf';
	import { generatePanelDialogue, submitGenerationJob, cancelGenerationJob, storyboardClient } from '$lib/client/storyboard-client';
	import { getJobForPanel } from '$lib/stores/job-store.svelte';
	import { Dialog, Progress } from '@skeletonlabs/skeleton-svelte';
	import { ChevronLeft, ChevronRight, Wand2, Pencil, MessageSquare, Sparkles, X } from 'lucide-svelte';

	export let panel: Panel;
	export let episodeId: string = '';
	export let storyboardPath: string = '';

	const dispatch = createEventDispatcher();

	let editing = false;
	let cutNumber = panel.cutNumber || '';
	let visualNote = panel.data?.visualNote ?? '';
	let cameraDirection = panel.data?.cameraDirection ?? '';
	let durationSeconds = panel.data?.durationSeconds ?? 0;
	let dialogues: Dialogue[] = panel.data?.dialogue ?? [];
	let characters = panel.data?.characters ?? [];
	let environment = panel.data?.environment ?? '';
	let shot = panel.data?.shot ?? '';
	let runwayPrompt = panel.data?.runwayPrompt ?? '';
	let generatedImages: GeneratedImage[] = panel.data?.generatedImages ?? [];
	let currentImageIndex = panel.data?.currentImageIndex ?? (generatedImages.length > 0 ? generatedImages.length - 1 : -1);
	let imageLoadFailed = false;
	let generatingImage = false;
	let imageError = '';
	let selectedModel = 'local';
	let activeJobId = '';
	let generatingDialogue = false;
	let dialogueError = '';
	let generatingCinematic = false;
	let cinematicError = '';
	let fieldPrefix = '';
	let showActions = false;
	$: fieldPrefix = `panel-${panel.pageNumber}-${panel.panel}`;

	$: if (panel.data?.generatedImages) {
		generatedImages = panel.data.generatedImages;
		currentImageIndex = panel.data.currentImageIndex ?? (generatedImages.length > 0 ? generatedImages.length - 1 : -1);
	}

	function getBackendBaseUrl(): string {
		if (typeof window !== 'undefined') return window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin;
		return 'http://localhost:8081';
	}

	function resolveImageUrl(rawUrl: string): string {
		const url = (rawUrl ?? '').trim();
		if (!url) return '';
		if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
		const marker = '/resources/images/';
		const markerIndex = url.indexOf(marker);
		if (markerIndex >= 0) return `${getBackendBaseUrl()}/images/${url.slice(markerIndex + marker.length)}`;
		if (url.startsWith('/')) return `${getBackendBaseUrl()}${url}`;
		return `${getBackendBaseUrl()}/${url}`;
	}

	$: currentImageUrl = currentImageIndex >= 0 && currentImageIndex < generatedImages.length
		? resolveImageUrl(generatedImages[currentImageIndex]?.imageUrl ?? '')
		: '';

	$: if (currentImageUrl) imageLoadFailed = false;

	function startEdit() { editing = true; showActions = false; }

	function saveEdit() {
		const serializedImages = generatedImages.map((img) => {
			if (img && typeof img === 'object' && 'imageUrl' in img) {
				return create(GeneratedImageSchema, {
					imageUrl: img.imageUrl || '', imagePrompt: img.imagePrompt || '',
					generatedAt: typeof img.generatedAt === 'bigint' ? img.generatedAt : BigInt(img.generatedAt || Date.now()),
					model: img.model || 'google/gemini-3-pro-image-preview'
				});
			}
			return img;
		});

		const updatedData = create(PanelDataSchema, {
			characters, dialogue: dialogues, environment, visualNote, cameraDirection, durationSeconds,
			cutNumber, shot, runwayPrompt, generatedImages: serializedImages, currentImageIndex,
		});
		dispatch('update', updatedData);
		editing = false; showActions = false;
	}

	function cancelEdit() {
		editing = false;
		cutNumber = panel.cutNumber ?? ''; visualNote = panel.data?.visualNote ?? '';
		cameraDirection = panel.data?.cameraDirection ?? ''; durationSeconds = panel.data?.durationSeconds ?? 0;
		dialogues = panel.data?.dialogue ?? []; characters = panel.data?.characters ?? [];
		environment = panel.data?.environment ?? ''; shot = panel.data?.shot ?? '';
		runwayPrompt = panel.data?.runwayPrompt ?? ''; generatedImages = panel.data?.generatedImages ?? [];
		currentImageIndex = panel.data?.currentImageIndex ?? (generatedImages.length > 0 ? generatedImages.length - 1 : -1);
		imageError = ''; dialogueError = ''; showActions = false;
	}

	async function handleGenerateDialogue() {
		if (generatingDialogue || !episodeId) return;
		generatingDialogue = true; dialogueError = '';
		try {
			const panelData = create(PanelDataSchema, { characters, dialogue: dialogues, environment, visualNote, cameraDirection, durationSeconds, cutNumber, shot, runwayPrompt });
			const result = await generatePanelDialogue(storyboardPath, episodeId, panel.pageNumber, panel.panel, panelData, { maxLines: dialogues.length > 0 ? dialogues.length : 0, style: 'cinematic drama, Japanese, short lines, actor-friendly delivery', strictKnownFacts: true });
			if (result.success && result.dialogue) {
				dialogues = result.dialogue.map((d) => create(DialogueSchema, { speaker: d.speaker ?? '', text: d.text ?? '', delivery: d.delivery ?? '', subtext: d.subtext ?? '', emotion: d.emotion ?? '', pauseBeforeMs: d.pauseBeforeMs ?? 0, pauseAfterMs: d.pauseAfterMs ?? 0 }));
				saveEdit();
			} else dialogueError = result.message || 'Failed to generate dialogue';
		} catch (err) { dialogueError = err instanceof Error ? err.message : 'Unknown error'; } finally { generatingDialogue = false; }
	}

	function getAvatarUrl(speaker: string) {
		if (!speaker || speaker === 'Narration' || speaker === 'NewsHacker') return '';
		const baseUrl = typeof window !== 'undefined' ? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin) : 'http://localhost:8081';
		return `${baseUrl}/images/characters/${speaker}.png`;
	}

	async function handleGenerateImage() {
		if (generatingImage || !episodeId) return;
		generatingImage = true; imageError = '';
		try {
			const panelData = create(PanelDataSchema, { characters, dialogue: dialogues, environment, visualNote, cameraDirection, durationSeconds, cutNumber, shot, runwayPrompt });
			const result = await submitGenerationJob(storyboardPath, episodeId, panel.pageNumber, panel.panel, panelData, selectedModel);
			if (result.success && result.jobId) { activeJobId = result.jobId; }
			else { imageError = result.message || 'Failed to submit job'; generatingImage = false; }
		} catch (err) { imageError = err instanceof Error ? err.message : 'Unknown error'; generatingImage = false; }
	}

	async function handleCancelGeneration() {
		if (!activeJobId) return;
		try { await cancelGenerationJob(activeJobId); } catch (err) { console.error('Cancel error:', err); }
		generatingImage = false; activeJobId = '';
	}

	function formatEta(ms: number): string {
		const seconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		if (minutes > 0) return `${minutes}:${secs.toString().padStart(2, '0')}`;
		return `${secs}s`;
	}

	$: {
		const job = getJobForPanel(episodeId, panel.pageNumber, panel.panel);
		if (!job && activeJobId && generatingImage) { generatingImage = false; activeJobId = ''; }
	}

	async function handleGenerateCinematic() {
		if (generatingCinematic || !episodeId) return;
		generatingCinematic = true; cinematicError = '';
		try {
			const res = await storyboardClient.generateCinematicSketch({ filePath: storyboardPath, episodeId, pageNumber: panel.pageNumber, panel: panel.panel });
			if (!res.success) cinematicError = res.message;
		} catch (err) { cinematicError = err instanceof Error ? err.message : String(err); } finally { generatingCinematic = false; }
	}

	function navigateImage(direction: 'prev' | 'next') {
		if (generatedImages.length === 0) return;
		if (direction === 'prev') currentImageIndex = currentImageIndex > 0 ? currentImageIndex - 1 : generatedImages.length - 1;
		else currentImageIndex = currentImageIndex < generatedImages.length - 1 ? currentImageIndex + 1 : 0;
		saveEdit();
	}

	function addDialogue() { dialogues = [...dialogues, create(DialogueSchema, { speaker: '', text: '' })]; }
	function removeDialogue(index: number) { dialogues = dialogues.filter((_, i) => i !== index); }

	function summaryNarration(): string {
		if (visualNote && visualNote.trim().length > 0) return visualNote.trim();
		if (dialogues.length > 0) { const first = dialogues.find((d) => d.text && d.text.trim().length > 0); if (first?.text) return first.text.trim(); }
		return 'No narration yet.';
	}
</script>

<!-- Card -->
<div class="card preset-surface-50-950 rounded-2xl shadow-sm">
	<!-- Top Meta Row -->
	<div class="flex items-center gap-2 px-4 pt-3 pb-2">
		<span class="inline-flex items-center justify-center rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-white">
			#{cutNumber || panel.panel}
		</span>
		<span class="chip preset-outlined-surface-200-800 text-[11px]">{shot || 'Shot TBD'}</span>
		{#if durationSeconds > 0}
			<span class="text-[11px] text-zinc-400">{durationSeconds.toFixed(1)}s</span>
		{/if}
		<div class="ml-auto">
			<button type="button" class="btn btn-sm preset-outlined-surface-200-800 text-[12px] font-semibold" onclick={() => (showActions = !showActions)}>
				Actions
			</button>
		</div>
	</div>

	<!-- Actions Menu (expandable) -->
	{#if showActions}
		<div class="mx-4 mb-2 grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-50 p-2">
			<button type="button" class="btn btn-sm preset-outlined-surface-200-800 text-[11px]" onclick={handleGenerateImage} disabled={generatingImage}>
				<Wand2 size={14} /> Generate Image
			</button>
			<button type="button" class="btn btn-sm preset-outlined-surface-200-800 text-[11px]" onclick={handleGenerateCinematic} disabled={generatingCinematic}>
				<Sparkles size={14} /> Sketch AI
			</button>
			<button type="button" class="btn btn-sm preset-outlined-surface-200-800 text-[11px]" onclick={() => dispatch('agentTrigger', { agent: 'dialogue' })}>
				<MessageSquare size={14} /> Dialogue AI
			</button>
			<button type="button" class="btn btn-sm preset-outlined-surface-200-800 text-[11px]" onclick={startEdit}>
				<Pencil size={14} /> Edit Panel
			</button>
		</div>
	{/if}

	<!-- Image Block -->
	<div class="px-4">
		<div class="mb-2">
			<select bind:value={selectedModel} class="w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none" disabled={generatingImage}>
				<option value="local">Animage / AnimagineXL 4.0 (Local)</option>
				<option value="openrouter">SeedReam 4.5 (API)</option>
			</select>
		</div>

		{#if currentImageUrl && !imageLoadFailed}
			<div class="relative overflow-hidden rounded-xl bg-zinc-100">
				{#if generatedImages.length > 1}
					<button type="button" onclick={() => navigateImage('prev')} class="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
						<ChevronLeft size={18} />
					</button>
				{/if}
				<img src={currentImageUrl} alt="Generated panel" class="w-full object-contain" style="max-height: 280px;"
					onerror={() => { imageLoadFailed = true; imageError = `Image could not be loaded`; }} />
				{#if generatedImages.length > 1}
					<button type="button" onclick={() => navigateImage('next')} class="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
						<ChevronRight size={18} />
					</button>
					<div class="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
						{currentImageIndex + 1} / {generatedImages.length}
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex min-h-[160px] items-center justify-center rounded-xl bg-zinc-100">
				<span class="text-3xl font-light text-zinc-300">No Image</span>
			</div>
		{/if}

		{#if generatingImage && activeJobId}
			{@const job = getJobForPanel(episodeId, panel.pageNumber, panel.panel)}
			<div class="mt-2 rounded-xl bg-zinc-50 p-3">
				<Progress value={job && job.totalSteps > 0 ? (job.currentStep / job.totalSteps) * 100 : 0} max={100} />
				<div class="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
					<span class="font-semibold">{job?.currentStep ?? 0}/{job?.totalSteps ?? 28}</span>
					{#if job && job.etaMs > 0}<span>{formatEta(job.etaMs)}</span>{/if}
				</div>
				<button type="button" class="btn btn-sm preset-outlined-error-500 mt-2 w-full text-[11px]" onclick={handleCancelGeneration}>Cancel</button>
			</div>
		{/if}
		{#if imageError}<div class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{imageError}</div>{/if}
		{#if cinematicError}<div class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{cinematicError}</div>{/if}
	</div>

	<!-- Narration Summary -->
	<div class="mx-4 mt-3 rounded-xl bg-zinc-50 px-3 py-2.5">
		<div class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Narration</div>
		<div class="line-clamp-2 text-[13px] leading-relaxed text-zinc-700">{summaryNarration()}</div>
	</div>

	<!-- Details (collapsible) -->
	<details class="group mx-4 mt-2 mb-3">
		<summary class="cursor-pointer py-2 text-[13px] font-semibold text-[#007aff]">Details</summary>
		<div class="space-y-2 pb-2 text-[12px] text-zinc-600">
			<div><span class="font-semibold text-zinc-800">Environment:</span> {environment || '-'}</div>
			<div><span class="font-semibold text-zinc-800">Camera:</span> {cameraDirection || '-'}</div>
			<div><span class="font-semibold text-zinc-800">Characters:</span> {characters.length ? characters.join(', ') : '-'}</div>
			{#if runwayPrompt}<div><span class="font-semibold text-zinc-800">Prompt:</span> {runwayPrompt}</div>{/if}
			{#if dialogues.length > 0}
				<div class="space-y-2 pt-1">
					{#each dialogues as dialogue}
						<div class="border-l-2 border-zinc-200 pl-3">
							<div class="mb-0.5 flex items-center gap-2">
								{#if getAvatarUrl(dialogue.speaker)}
									<img src={getAvatarUrl(dialogue.speaker)} alt={dialogue.speaker} class="h-5 w-5 rounded-full border border-zinc-200 object-cover" onerror={(e) => (e.currentTarget as HTMLImageElement).style.display='none'} />
								{/if}
								<strong class="text-zinc-800">{dialogue.speaker}:</strong>
							</div>
							<div class="text-zinc-700">{dialogue.text}</div>
						</div>
					{/each}
				</div>
			{/if}
			{#if dialogueError}<div class="rounded-lg bg-red-50 px-3 py-2 text-red-600">{dialogueError}</div>{/if}
		</div>
	</details>
</div>

<!-- Edit Sheet (iOS Bottom Sheet via Dialog) -->
{#if editing}
	<div
		class="fixed inset-0 z-50 flex items-end bg-black/40"
		onclick={(e) => e.target === e.currentTarget && cancelEdit()}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Escape' && cancelEdit()}
	>
		<div class="edit-sheet" role="dialog" aria-modal="true" aria-label="Edit panel" tabindex="-1">
			<div class="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-300"></div>
			<div class="flex items-center justify-between pb-3">
				<h4 class="text-[17px] font-semibold text-zinc-900">Edit Panel {panel.panel}</h4>
				<div class="flex gap-2">
					<button class="btn btn-sm preset-filled-primary-500 text-[13px] font-semibold" onclick={saveEdit}>Save</button>
					<button class="btn btn-sm preset-outlined-surface-200-800 text-[13px]" onclick={cancelEdit}>Cancel</button>
				</div>
			</div>
			<div class="edit-fields">
				<label class="field-label" for={`${fieldPrefix}-characters`}>Characters</label>
				<input id={`${fieldPrefix}-characters`} type="text" class="field-input" value={characters.join(', ')}
					oninput={(e) => { characters = (e.currentTarget as HTMLInputElement).value.split(',').map((s) => s.trim()).filter((s) => s); }}
					placeholder="character:Ren, character:Nei" />

				<label class="field-label" for={`${fieldPrefix}-environment`}>Environment</label>
				<input id={`${fieldPrefix}-environment`} type="text" class="field-input" bind:value={environment} placeholder="env:ren-office" />

				<label class="field-label" for={`${fieldPrefix}-shot`}>Shot Type</label>
				<input id={`${fieldPrefix}-shot`} type="text" class="field-input" bind:value={shot} placeholder="Close-up, Wide Shot..." />

				<label class="field-label" for={`${fieldPrefix}-prompt`}>Runway Prompt</label>
				<textarea id={`${fieldPrefix}-prompt`} class="field-input min-h-[80px] resize-y" bind:value={runwayPrompt} placeholder="Runway prompt..."></textarea>

				<label class="field-label" for={`${fieldPrefix}-visual`}>Narration / Visual note</label>
				<textarea id={`${fieldPrefix}-visual`} class="field-input min-h-[80px] resize-y" bind:value={visualNote} placeholder="Visual description..."></textarea>
				<input type="text" class="field-input mt-1" bind:value={cameraDirection} placeholder="Camera direction" />

				<label class="field-label" for={`${fieldPrefix}-duration`}>Duration (s)</label>
				<input id={`${fieldPrefix}-duration`} type="number" class="field-input w-24" bind:value={durationSeconds} step="0.1" min="0" />

				<div class="field-label">Dialogue</div>
				{#each dialogues as dialogue, index}
					<div class="flex items-center gap-2 mb-2">
						<input type="text" class="field-input flex-1" bind:value={dialogue.speaker} placeholder="Speaker" />
						<input type="text" class="field-input flex-[2]" bind:value={dialogue.text} placeholder="Text" />
						<button type="button" class="btn-icon btn-sm preset-outlined-error-500" onclick={() => removeDialogue(index)}>
							<X size={14} />
						</button>
					</div>
				{/each}
				<button type="button" class="btn btn-sm preset-outlined-success-500 text-[12px]" onclick={addDialogue}>+ Add Dialogue</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@reference "tailwindcss";

	.edit-sheet {
		@apply max-h-[85dvh] w-full overflow-y-auto rounded-t-[20px] bg-white px-5 pb-8 pt-3;
		padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
		box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.12);
	}

	.edit-fields {
		@apply flex flex-col;
	}

	.field-label {
		@apply mb-1 mt-3 text-[12px] font-semibold text-zinc-500;
	}

	.field-input {
		@apply w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[14px] text-zinc-900 outline-none transition;
	}
	.field-input:focus {
		@apply border-[#007aff] bg-white;
		box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
	}
</style>
