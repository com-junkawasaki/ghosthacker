<script lang="ts">
	import type { Panel } from '$lib/gen/proto/storyboard_pb';
	import { storyboardClient } from '$lib/client/storyboard-client';
	import { FolderOpen, Users, FileText, Film } from 'lucide-svelte';

	let { panels = [], characterIds = [], selectedId = '', onSelect, onContextAdd, storyboardPath = '' } = $props<{
		panels: Panel[];
		characterIds?: string[];
		selectedId: string;
		onSelect?: (panel: Panel) => void;
		onContextAdd?: (type: string, data: any) => void;
		storyboardPath?: string;
	}>();

	let pagesMap = $derived(panels.reduce((acc: Record<number, Panel[]>, panel: Panel) => {
		const pageNum = panel.pageNumber;
		if (!acc[pageNum]) acc[pageNum] = [];
		acc[pageNum].push(panel);
		return acc;
	}, {} as Record<number, Panel[]>));

	let pageNumbers = $derived(Object.keys(pagesMap).map(Number).sort((a, b) => a - b));

	function characterKey(id: string): string {
		return id.startsWith('character:') ? id.slice('character:'.length) : id;
	}

	function canonicalCharacterId(id: string): string {
		const raw = characterKey(id).trim();
		const lower = raw.toLowerCase();
		const aliases: Record<string, string> = { 'nei-chan': 'nei', 'neichan': 'nei', 'ren/akito': 'ren', 'ren / akito': 'ren' };
		return `character:${aliases[lower] ?? lower}`;
	}

	let panelCharacterIds = $derived(
		Array.from(new Set<string>(panels.flatMap((p: Panel) => (p.data?.characters ?? []).filter((c: string) => !!c).map((c: string) => canonicalCharacterId(c))))).sort((a, b) => a.localeCompare(b))
	);

	let mergedCharacterIds = $derived(
		Array.from(new Set<string>([...(characterIds ?? []).map((c: string) => canonicalCharacterId(c)), ...panelCharacterIds])).filter((c: string) => !!c).sort((a, b) => a.localeCompare(b))
	);

	function characterImageUrl(id: string): string {
		const key = characterKey(canonicalCharacterId(id));
		const baseUrl = typeof window !== 'undefined' ? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin) : 'http://localhost:8081';
		return `${baseUrl}/images/characters/${key}.png`;
	}

	function handleDragStart(e: DragEvent, type: string, data: any) {
		if (e.dataTransfer) {
			e.dataTransfer.setData('application/json', JSON.stringify({ type, ...data }));
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	let expandedSections = $state<Record<string, boolean>>({ characters: true });
	function toggleSection(key: string) {
		expandedSections = { ...expandedSections, [key]: !expandedSections[key] };
	}

	// ---- Panel DnD between pages ----
	let dropTargetPage = $state<number | null>(null);
	let isMoving = $state(false);
	const sessionId = Math.random().toString(36).slice(2, 12);

	function onPageDragOver(e: DragEvent, pageNum: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropTargetPage = pageNum;
	}

	function onPageDragLeave() {
		dropTargetPage = null;
	}

	async function onPageDrop(e: DragEvent, targetPageNum: number) {
		e.preventDefault();
		dropTargetPage = null;
		if (!e.dataTransfer) return;

		let data: any;
		try {
			data = JSON.parse(e.dataTransfer.getData('application/json'));
		} catch { return; }

		if (data.type !== 'panel') return;
		if (data.pageNumber === targetPageNum) return;

		const targetPanels = pagesMap[targetPageNum] ?? [];
		isMoving = true;
		try {
			await storyboardClient.movePanel({
				filePath: storyboardPath,
				episodeId: selectedId,
				sourcePage: data.pageNumber,
				sourcePanel: data.panel,
				targetPage: targetPageNum,
				targetPanelIndex: targetPanels.length,
				sessionId
			});
		} catch (err) {
			console.error('[NodeTree] move panel error:', err);
		} finally {
			isMoving = false;
		}
	}
</script>

<div class="tree-root">
	<div class="tree-header">
		Story Structure
		{#if isMoving}<span class="tree-moving">Moving...</span>{/if}
	</div>

	<div class="tree-content">
		<!-- Episode Node -->
		<button
			class="tree-row root-node"
			draggable="true"
			ondragstart={(e) => handleDragStart(e, 'episode', { id: selectedId })}
			onclick={() => onContextAdd?.('episode', { id: selectedId })}
		>
			<FolderOpen size={16} class="text-[#007aff]" />
			<span class="tree-label">{selectedId || 'No Selection'}</span>
		</button>

		<!-- Characters -->
		<button class="tree-row section-node" onclick={() => toggleSection('characters')}>
			<Users size={16} class="text-amber-500" />
			<span class="tree-label">Characters ({mergedCharacterIds.length})</span>
			<span class="ml-auto text-[11px] text-zinc-400">{expandedSections['characters'] ? '-' : '+'}</span>
		</button>
		{#if expandedSections['characters']}
			{#each mergedCharacterIds as charId}
				<button
					class="tree-row child-node"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, 'character', { id: charId })}
					onclick={() => onContextAdd?.('character', { id: charId })}
					title={charId}
				>
					<img src={characterImageUrl(charId)} alt={charId} class="h-5 w-5 rounded-full border border-zinc-200 bg-zinc-100 object-cover"
						onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
					<span class="tree-label">{characterKey(charId)}</span>
				</button>
			{/each}
		{/if}

		<!-- Pages (drop targets for panel reorder) -->
		{#each pageNumbers as pageNum}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="tree-page-drop"
				class:tree-drop-active={dropTargetPage === pageNum}
				ondragover={(e) => onPageDragOver(e, pageNum)}
				ondragleave={onPageDragLeave}
				ondrop={(e) => onPageDrop(e, pageNum)}
			>
				<button
					class="tree-row section-node"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, 'page', { episodeId: selectedId, pageNumber: pageNum })}
					onclick={() => {
						toggleSection(`page-${pageNum}`);
						onContextAdd?.('page', { episodeId: selectedId, pageNumber: pageNum });
					}}
				>
					<FileText size={16} class="text-zinc-500" />
					<span class="tree-label">Page {pageNum}</span>
					<span class="ml-auto text-[11px] text-zinc-400">{expandedSections[`page-${pageNum}`] ? '-' : '+'}</span>
				</button>
				{#if expandedSections[`page-${pageNum}`]}
					{#each pagesMap[pageNum] as panel}
						<button
							class="tree-row child-node"
							draggable="true"
							ondragstart={(e) => handleDragStart(e, 'panel', { episodeId: selectedId, pageNumber: pageNum, panel: panel.panel, data: panel.data })}
							onclick={() => {
								onSelect?.(panel);
								onContextAdd?.('panel', { episodeId: selectedId, pageNumber: pageNum, panel: panel.panel, data: panel.data });
							}}
						>
							<Film size={14} class="text-emerald-500" />
							<span class="tree-label">Panel {panel.panel}</span>
							{#if panel.data?.characters && panel.data.characters.length > 0}
								<span class="ml-auto text-[10px] text-zinc-400">{panel.data.characters.length} chars</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	@reference "tailwindcss";

	.tree-root {
		@apply flex h-full flex-col bg-white;
	}

	.tree-header {
		@apply flex items-center justify-between border-b border-zinc-100 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400;
	}

	.tree-moving {
		@apply text-[10px] font-normal normal-case tracking-normal text-amber-500 animate-pulse;
	}

	.tree-content {
		@apply flex-1 overflow-y-auto py-1;
		-webkit-overflow-scrolling: touch;
	}

	.tree-row {
		@apply flex w-full min-h-[44px] items-center gap-2.5 px-4 py-2 text-left text-[14px] text-zinc-800 transition;
	}
	.tree-row:hover {
		@apply bg-zinc-50;
	}
	.tree-row:active {
		@apply bg-zinc-100;
	}

	.root-node {
		@apply font-semibold;
	}

	.section-node {
		@apply font-medium text-zinc-700;
	}

	.child-node {
		@apply pl-10 text-[13px] text-zinc-600;
	}

	.tree-label {
		@apply min-w-0 truncate;
	}

	/* ---- Page drop target ---- */
	.tree-page-drop {
		@apply rounded-lg transition-all;
		border: 2px solid transparent;
	}

	.tree-drop-active {
		border-color: #007aff;
		background: rgba(0, 122, 255, 0.05);
	}
</style>
