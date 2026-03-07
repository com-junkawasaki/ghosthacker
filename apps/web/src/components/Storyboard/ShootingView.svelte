<script lang="ts">
	import type { Panel } from '$lib/gen/proto/storyboard_pb';
	import { storyboardClient } from '$lib/client/storyboard-client';

	let { panels = [], episodeId = '', storyboardPath = '' } = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
	}>();

	let selectedModel: 'local' | 'cinematic' = $state('cinematic');
	let generatingPanels: Set<string> = $state(new Set());

	function panelKey(panel: Panel): string {
		return `${panel.pageNumber}-${panel.panel}`;
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

	function getCinematicImageUrl(panel: Panel): string {
		const images = panel.data?.generatedImages ?? [];
		// Find the latest cinematic image
		for (let i = images.length - 1; i >= 0; i--) {
			if (images[i]?.model?.includes('cinematic')) {
				return resolveImageUrl(images[i]?.imageUrl ?? '');
			}
		}
		// Fallback: show latest image if no cinematic exists
		if (images.length > 0) return resolveImageUrl(images[images.length - 1]?.imageUrl ?? '');
		return '';
	}

	function getAvatarUrl(speaker: string) {
		if (!speaker || speaker === 'Narration' || speaker === 'NewsHacker') return '';
		return `${getBackendBaseUrl()}/images/characters/${speaker}.png`;
	}

	async function generateImage(panel: Panel) {
		const key = panelKey(panel);
		generatingPanels.add(key);
		generatingPanels = new Set(generatingPanels);
		try {
			await storyboardClient.generatePanelImage({
				filePath: storyboardPath,
				episodeId,
				pageNumber: panel.pageNumber,
				panel: panel.panel,
				model: selectedModel,
				panelData: {
					visualNote: panel.data?.visualNote ?? '',
					shot: panel.data?.shot ?? '',
					characters: panel.data?.characters ?? [],
				},
			});
		} catch (e) {
			console.error('Generation failed:', e);
		} finally {
			generatingPanels.delete(key);
			generatingPanels = new Set(generatingPanels);
		}
	}
</script>

<div class="shooting-scroll">
	<div class="shooting-header">
		<div class="flex items-center justify-between">
			<h1 class="text-[15px] font-black uppercase tracking-[0.1em] text-zinc-900">Shooting Script: {episodeId}</h1>
			<select bind:value={selectedModel} class="model-select">
				<option value="local">AnimagineXL</option>
				<option value="cinematic">Cinematic (photo→anime)</option>
			</select>
		</div>
	</div>

	<div class="card-list">
		{#each panels as panel}
			{@const imageUrl = getCinematicImageUrl(panel)}
			{@const isGenerating = generatingPanels.has(panelKey(panel))}
			<div class="rounded-2xl border border-zinc-200 bg-white shadow-sm">
				<!-- Image -->
				{#if imageUrl}
					{@const isCinematic = (panel.data?.generatedImages ?? []).some((img: {model?: string}) => img?.model?.includes('cinematic'))}
					<div class="thumb-wrap">
						<img src={imageUrl} alt="P{panel.pageNumber}-{panel.panel}" class="panel-thumb" loading="lazy" />
						{#if !isCinematic}
							<span class="badge badge-needs-cinematic">needs cinematic</span>
						{/if}
					</div>
				{/if}

				<!-- Panel ID + Shot Info -->
				<div class="flex items-start gap-3 px-4 pt-3 pb-2">
					<div class="shrink-0">
						<div class="text-[13px] font-bold text-zinc-900">P{panel.pageNumber}-{panel.panel}</div>
						{#if panel.cutNumber}<div class="text-[11px] text-zinc-400">CUT {panel.cutNumber}</div>{/if}
					</div>
					<div class="min-w-0 flex-1">
						<div class="text-[12px] font-bold uppercase text-zinc-900">{panel.data?.shot || '---'}</div>
						{#if panel.data?.cameraDirection}<div class="text-[12px] italic text-amber-600">{panel.data.cameraDirection}</div>{/if}
						{#if panel.data?.durationSeconds}<div class="text-[11px] text-zinc-400">{panel.data.durationSeconds}s</div>{/if}
					</div>
					<button
						class="gen-btn"
						onclick={() => generateImage(panel)}
						disabled={isGenerating}
					>
						{isGenerating ? 'Generating...' : imageUrl ? 'Regenerate' : 'Generate'}
					</button>
				</div>

				<!-- Action / Visual -->
				<div class="px-4 pb-2">
					<div class="text-[13px] leading-relaxed text-zinc-700">{panel.data?.visualNote || '---'}</div>
					{#if panel.data?.environment}
						<div class="mt-1 text-[11px] text-zinc-400">ENV: {panel.data.environment}</div>
					{/if}
				</div>

				<!-- Dialogue -->
				{#if (panel.data?.dialogue ?? []).length > 0}
					<div class="border-t border-zinc-100 px-4 py-2">
						{#each panel.data?.dialogue ?? [] as d}
							<div class="mb-2 last:mb-0">
								<div class="mb-0.5 flex items-center gap-1.5 text-[12px] font-bold text-zinc-800">
									{#if getAvatarUrl(d.speaker)}
										<img src={getAvatarUrl(d.speaker)} alt={d.speaker} class="h-4 w-4 rounded-full" />
									{/if}
									{d.speaker}:
								</div>
								<div class="text-[13px] text-zinc-700">{d.text}</div>
								{#if d.delivery}<div class="text-[11px] italic text-emerald-600">({d.delivery})</div>{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	@reference "tailwindcss";

	.shooting-scroll {
		@apply flex-1 overflow-y-auto px-4 py-3;
		-webkit-overflow-scrolling: touch;
	}

	.shooting-header {
		@apply mb-4 border-b-2 border-zinc-900 pb-3;
	}

	.card-list {
		@apply flex flex-col gap-3;
	}

	.panel-thumb {
		@apply w-full rounded-t-2xl object-cover;
		max-height: 400px;
	}

	.model-select {
		@apply rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-700;
	}

	.gen-btn {
		@apply shrink-0 rounded border border-zinc-300 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-50;
	}

	.thumb-wrap {
		@apply relative;
	}

	.badge {
		@apply absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold;
	}

	.badge-needs-cinematic {
		@apply bg-amber-100 text-amber-700;
	}
</style>
