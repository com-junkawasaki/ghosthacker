<script lang="ts">
	import type { Panel } from '$lib/gen/proto/storyboard_pb';

	let { panels = [], episodeId = '' } = $props<{
		panels: Panel[];
		episodeId?: string;
		storyboardPath?: string;
	}>();

	function getAvatarUrl(speaker: string) {
		if (!speaker || speaker === 'Narration' || speaker === 'NewsHacker') return '';
		const id = speaker;
		const baseUrl = typeof window !== 'undefined' 
			? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin)
			: 'http://localhost:8081';
		return `${baseUrl}/images/characters/${id}.png`;
	}
</script>

<div class="shooting-view">
	<div class="shooting-container">
		<header class="shooting-header">
			<h1>SHOOTING SCRIPT: {episodeId}</h1>
		</header>

		<table class="shooting-table">
			<thead>
				<tr>
					<th class="col-num">#</th>
					<th class="col-shot">SHOT / CAMERA</th>
					<th class="col-action">ACTION / VISUAL</th>
					<th class="col-dialogue">DIALOGUE / SOUND</th>
				</tr>
			</thead>
			<tbody>
				{#each panels as panel}
					<tr class="panel-row">
						<td class="col-num">
							<div class="panel-id">P{panel.pageNumber}-{panel.panel}</div>
							{#if panel.cutNumber}
								<div class="cut-id">CUT {panel.cutNumber}</div>
							{/if}
						</td>
						<td class="col-shot">
							<div class="shot-type">{panel.data?.shot || '---'}</div>
							<div class="camera-dir">{panel.data?.cameraDirection || ''}</div>
							{#if panel.data?.durationSeconds}
								<div class="duration">{panel.data.durationSeconds}s</div>
							{/if}
						</td>
						<td class="col-action">
							<div class="visual-note">{panel.data?.visualNote || '---'}</div>
							{#if panel.data?.environment}
								<div class="env-tag">ENV: {panel.data.environment}</div>
							{/if}
						</td>
						<td class="col-dialogue">
							{#each panel.data?.dialogue ?? [] as d}
								<div class="dialogue-line">
									<div class="speaker">
										{#if getAvatarUrl(d.speaker)}
											<img src={getAvatarUrl(d.speaker)} alt={d.speaker} class="mini-avatar" />
										{/if}
										{d.speaker}:
									</div>
									<div class="text">「{d.text}」</div>
									{#if d.delivery}
										<div class="delivery">({d.delivery})</div>
									{/if}
								</div>
							{/each}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	@reference "tailwindcss";

	.shooting-view { @apply flex-1 overflow-y-auto bg-zinc-50 p-2 md:p-6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
	.shooting-container { @apply mx-auto w-full max-w-[1200px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm; }
	.shooting-header { @apply border-b-2 border-zinc-900 px-4 py-3 md:px-6 md:py-4; }
	.shooting-header h1 { @apply text-base font-black uppercase tracking-widest text-zinc-900 md:text-2xl; }
	.shooting-table { @apply w-full border-collapse; }
	.shooting-table th { @apply border border-zinc-200 bg-zinc-100 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-600; }
	.panel-row { @apply border-b border-zinc-100; }
	.panel-row:hover { @apply bg-zinc-50; }
	.panel-row td { @apply border border-zinc-100 px-3 py-3 align-top text-sm; }
	.col-num { width: 80px; }
	.col-shot { width: 200px; }
	.col-action { width: 400px; }
	.col-dialogue { width: auto; }
	.panel-id { @apply text-xs font-bold text-zinc-900; }
	.cut-id { @apply text-[11px] text-zinc-500; }
	.shot-type { @apply text-xs font-bold uppercase text-zinc-900; }
	.camera-dir { @apply text-xs italic text-amber-600; }
	.duration { @apply mt-1 text-[11px] text-zinc-500; }
	.visual-note { @apply text-sm leading-relaxed text-zinc-800; }
	.env-tag { @apply mt-2 text-[11px] text-zinc-500; }
	.dialogue-line { @apply mb-3; }
	.speaker { @apply mb-1 flex items-center gap-1.5 text-xs font-bold text-zinc-800; }
	.mini-avatar { @apply h-4.5 w-4.5 rounded-full; }
	.text { @apply text-sm leading-relaxed text-zinc-800; }
	.delivery { @apply text-xs italic text-emerald-600; }

	.shooting-container { @apply rounded-lg; }
	.shooting-header h1 { @apply text-sm tracking-[0.12em]; }
	.shooting-table th { @apply hidden; }
	.shooting-table, .shooting-table tbody, .shooting-table tr, .shooting-table td { @apply block w-full; }
	.panel-row { @apply mb-3 rounded-lg border border-zinc-200 bg-white; }
	.panel-row td { @apply border-0 border-b border-zinc-100; }
	.panel-row td:last-child { @apply border-b-0; }
	.col-num, .col-shot, .col-action, .col-dialogue { width: auto; }
</style>
