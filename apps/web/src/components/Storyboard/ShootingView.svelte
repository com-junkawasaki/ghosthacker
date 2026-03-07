<script lang="ts">
	import type { Panel } from '$lib/gen/proto/storyboard_pb';

	let { panels = [], episodeId = '' } = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
	}>();

	function getAvatarUrl(speaker: string) {
		if (!speaker || speaker === 'Narration' || speaker === 'NewsHacker') return '';
		const baseUrl = typeof window !== 'undefined' ? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin) : 'http://localhost:8081';
		return `${baseUrl}/images/characters/${speaker}.png`;
	}
</script>

<div class="shooting-scroll">
	<div class="shooting-header">
		<h1 class="text-[15px] font-black uppercase tracking-[0.1em] text-zinc-900">Shooting Script: {episodeId}</h1>
	</div>

	<div class="card-list">
		{#each panels as panel}
			<div class="rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
</style>
