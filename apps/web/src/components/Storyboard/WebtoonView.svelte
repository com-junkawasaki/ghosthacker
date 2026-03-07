<script lang="ts">
	import type { Panel } from '$lib/gen/proto/storyboard_pb';

	let { panels = [], episodeId = '' } = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
	}>();

	let pagesMap = $derived(panels.reduce((acc: Record<number, Panel[]>, panel: Panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) acc[pageNum] = [];
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>));

	let pageNumbers = $derived(Object.keys(pagesMap).map(Number).sort((a, b) => a - b));

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

	function getCurrentImageUrl(panel: Panel): string {
		const images = panel.data?.generatedImages ?? [];
		const idx = panel.data?.currentImageIndex ?? (images.length > 0 ? images.length - 1 : -1);
		if (idx >= 0 && idx < images.length) return resolveImageUrl(images[idx]?.imageUrl ?? '');
		return '';
	}

	function defaultDialogueX(index: number): number {
		return Math.min(78, 8 + index * 22);
	}
</script>

<div class="webtoon-scroll">
	<div class="webtoon-strip">
		{#each pageNumbers as pageNum}
			{#each pagesMap[pageNum] as panel}
				{@const imageUrl = getCurrentImageUrl(panel)}
				{@const dialogues = panel.data?.dialogue ?? []}
				{@const visualNote = panel.data?.visualNote ?? ''}

				{@const mangaLayout = panel.data?.mangaLayout}

				<div class="webtoon-panel">
					{#if imageUrl}
						<div class="image-wrap">
							<img
								src={imageUrl}
								alt="P{panel.pageNumber}-{panel.panel}"
								class="panel-image"
								loading="lazy"
							/>

							<!-- Manga-style dialogue bubbles on image -->
							{#each dialogues as d, i}
								<div
									class="bubble"
									style="left: {d.mangaLayout?.x ?? defaultDialogueX(i)}%; top: {d.mangaLayout?.y ?? 12}%; font-size: {d.mangaLayout?.fontSize ?? 14}px;"
								>
									{#if d.speaker && d.speaker !== 'Narration'}
										<div class="bubble-speaker">{d.speaker}</div>
									{/if}
									<div class="bubble-text" class:narration-bubble={d.speaker === 'Narration'}>{d.text}</div>
								</div>
							{/each}

							<!-- SFX texts -->
							{#if mangaLayout?.texts}
								{#each mangaLayout.texts as text}
									<div
										class="sfx-text"
										style="left: {text.x}%; top: {text.y}%; font-size: {text.fontSize ?? 28}px;"
									>
										{text.text}
									</div>
								{/each}
							{/if}

							{#if visualNote}
								<div class="visual-note-float">{visualNote}</div>
							{/if}
						</div>
					{:else}
						<div class="panel-placeholder">
							<span class="placeholder-label">P{panel.pageNumber}-{panel.panel}</span>
							{#if visualNote}
								<span class="placeholder-note">{visualNote}</span>
							{/if}
							{#if dialogues.length > 0}
								<div class="placeholder-dialogues">
									{#each dialogues as d}
										<div class="placeholder-dialogue">
											{#if d.speaker}<span class="placeholder-speaker">{d.speaker}:</span>{/if}
											{d.text}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		{/each}

		<div class="webtoon-end">
			<span>End of {episodeId}</span>
		</div>
	</div>
</div>

<style>
	@reference "tailwindcss";

	.webtoon-scroll {
		@apply flex-1 overflow-y-auto;
		-webkit-overflow-scrolling: touch;
		background: #000;
	}

	.webtoon-strip {
		@apply mx-auto flex w-full max-w-[600px] flex-col;
	}

	.webtoon-panel {
		@apply relative w-full;
	}

	.image-wrap {
		@apply relative w-full;
	}

	.panel-image {
		@apply block w-full;
	}

	.visual-note-float {
		@apply absolute bottom-0 left-0 right-0 px-4 py-2.5 text-[13px] leading-relaxed text-white/90;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
		pointer-events: none;
		z-index: 5;
	}

	/* Manga-style dialogue bubbles */
	.bubble {
		@apply absolute max-w-[70%] rounded-xl px-3 py-2;
		background: rgba(255, 255, 255, 0.92);
		border: 1.5px solid rgba(0, 0, 0, 0.15);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		z-index: 10;
		pointer-events: none;
	}

	.bubble-speaker {
		@apply mb-0.5 text-[10px] font-bold uppercase text-zinc-500;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
		padding-bottom: 2px;
	}

	.bubble-text {
		@apply leading-snug text-zinc-900;
	}

	.narration-bubble {
		@apply italic text-zinc-600;
	}

	/* SFX text overlay */
	.sfx-text {
		@apply absolute font-bold;
		font-family: 'Kaisotai', 'Hiragino Sans', sans-serif;
		color: #000;
		-webkit-text-stroke: 1px #fff;
		z-index: 11;
		pointer-events: none;
	}

	/* Placeholder (no image) */
	.panel-placeholder {
		@apply flex min-h-[300px] flex-col items-center justify-center gap-3 border-b border-zinc-800 bg-zinc-900 px-6;
	}

	.placeholder-label {
		@apply text-[14px] font-bold text-zinc-600;
	}

	.placeholder-note {
		@apply max-w-[80%] text-center text-[13px] leading-relaxed text-zinc-500;
	}

	.placeholder-dialogues {
		@apply mt-2 flex w-full max-w-[80%] flex-col gap-2;
	}

	.placeholder-dialogue {
		@apply text-[13px] leading-relaxed text-zinc-400;
	}

	.placeholder-speaker {
		@apply mr-1 font-bold text-zinc-300;
	}

	.webtoon-end {
		@apply flex items-center justify-center py-16 text-[13px] text-zinc-600;
	}
</style>
