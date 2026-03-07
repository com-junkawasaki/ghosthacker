<script lang="ts">
	import type { Panel } from '$lib/gen/proto/storyboard_pb';

	let { panels = [], characterIds = [], selectedId = '', onSelect, onContextAdd } = $props<{
		panels: Panel[];
		characterIds?: string[];
		selectedId: string;
		onSelect?: (panel: Panel) => void;
		onContextAdd?: (type: string, data: any) => void;
	}>();

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

	function characterKey(id: string): string {
		return id.startsWith('character:') ? id.slice('character:'.length) : id;
	}

	function canonicalCharacterId(id: string): string {
		const raw = characterKey(id).trim();
		const lower = raw.toLowerCase();
		const aliases: Record<string, string> = {
			'nei-chan': 'nei',
			'neichan': 'nei',
			'ren/akito': 'ren',
			'ren / akito': 'ren',
		};
		const key = aliases[lower] ?? lower;
		return `character:${key}`;
	}

	let panelCharacterIds = $derived(
		Array.from(
			new Set<string>(
				panels.flatMap((p: Panel) => (p.data?.characters ?? [])
					.filter((c: string) => !!c)
					.map((c: string) => canonicalCharacterId(c)))
			)
		).sort((a, b) => a.localeCompare(b))
	);
	let mergedCharacterIds = $derived(
		Array.from(new Set<string>([...(characterIds ?? []).map((c: string) => canonicalCharacterId(c)), ...panelCharacterIds]))
			.filter((c: string) => !!c)
			.sort((a, b) => a.localeCompare(b))
	);

	function characterImageUrl(id: string): string {
		const key = characterKey(canonicalCharacterId(id));
		const baseUrl = typeof window !== 'undefined'
			? (window.location.port === '1421' ? 'http://localhost:8081' : window.location.origin)
			: 'http://localhost:8081';
		return `${baseUrl}/images/characters/${key}.png`;
	}

	function handleDragStart(e: DragEvent, type: string, data: any) {
		if (e.dataTransfer) {
			e.dataTransfer.setData('application/json', JSON.stringify({ type, ...data }));
			e.dataTransfer.effectAllowed = 'copy';
		}
	}
</script>

<div class="node-tree">
	<div class="tree-header">STORY STRUCTURE</div>
	<div class="tree-content">
		<div class="episode-node">
			<div 
				class="node-label episode" 
				draggable="true"
				role="button"
				tabindex="0"
				ondragstart={(e) => handleDragStart(e, 'episode', { id: selectedId })}
				onclick={() => onContextAdd?.('episode', { id: selectedId })}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onContextAdd?.('episode', { id: selectedId })}
			>
				📁 {selectedId || 'No Selection'}
			</div>
			
			<div class="children">
				<div class="characters-node">
					<div 
						class="node-label characters"
						onclick={() => onContextAdd?.('characters', { ids: mergedCharacterIds })}
						role="button"
						tabindex="0"
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onContextAdd?.('characters', { ids: mergedCharacterIds })}
					>
						👥 Characters ({mergedCharacterIds.length})
					</div>
					<div class="children">
						{#each mergedCharacterIds as charId}
							<div
								class="node-label character"
								draggable="true"
								role="button"
								tabindex="0"
								ondragstart={(e) => handleDragStart(e, 'character', { id: charId })}
								onclick={() => onContextAdd?.('character', { id: charId })}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onContextAdd?.('character', { id: charId })}
								title={charId}
							>
								<img
									src={characterImageUrl(charId)}
									alt={charId}
									class="char-avatar"
									onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
								/>
								<span>{characterKey(charId)}</span>
							</div>
						{/each}
					</div>
				</div>

				{#each pageNumbers as pageNum}
					<div class="page-node">
						<div 
							class="node-label page"
							draggable="true"
							role="button"
							tabindex="0"
							ondragstart={(e) => handleDragStart(e, 'page', { episodeId: selectedId, pageNumber: pageNum })}
							onclick={() => onContextAdd?.('page', { episodeId: selectedId, pageNumber: pageNum })}
							onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onContextAdd?.('page', { episodeId: selectedId, pageNumber: pageNum })}
						>
							📄 Page {pageNum}
						</div>
						<div class="children">
							{#each pagesMap[pageNum] as panel}
								<div 
									class="node-label panel"
									draggable="true"
									role="button"
									tabindex="0"
									ondragstart={(e) => handleDragStart(e, 'panel', { 
										episodeId: selectedId, 
										pageNumber: pageNum, 
										panel: panel.panel,
										data: panel.data 
									})}
									onclick={() => {
										onSelect?.(panel);
										onContextAdd?.('panel', { 
											episodeId: selectedId, 
											pageNumber: pageNum, 
											panel: panel.panel,
											data: panel.data 
										});
									}}
									onkeydown={(e) => {
										if (e.key !== 'Enter' && e.key !== ' ') return;
										onSelect?.(panel);
										onContextAdd?.('panel', {
											episodeId: selectedId,
											pageNumber: pageNum,
											panel: panel.panel,
											data: panel.data
										});
									}}
								>
									🎞️ Panel {panel.panel}
									{#if panel.data?.characters && panel.data.characters.length > 0}
										<span class="node-meta">({panel.data.characters.length} chars)</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.node-tree {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: #252526;
		color: #ccc;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		font-size: 0.85rem;
		overflow: hidden;
	}

	.tree-header {
		padding: 0.75rem 1rem;
		font-size: 0.7rem;
		font-weight: bold;
		color: #888;
		letter-spacing: 0.1em;
		background: #2d2d2d;
		border-bottom: 1px solid #333;
	}

	.tree-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem 0;
		-webkit-overflow-scrolling: touch;
	}

	.node-label {
		padding: 0.35rem 0.9rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.node-label:hover {
		background: #37373d;
		color: #fff;
	}

	.node-label.episode { font-weight: bold; color: #e0e0e0; }
	.node-label.characters { color: #ffd27f; font-weight: 600; }
	.node-label.character {
		color: #ffd27f;
		padding-left: 1.6rem;
	}
	.node-label.page { color: #d4d4d4; }
	.node-label.panel { color: #b5cea8; padding-left: 1.6rem; }

	.char-avatar {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid #555;
		background: #333;
	}

	.children {
		display: flex;
		flex-direction: column;
	}

	.page-node > .children {
		padding-left: 0.65rem;
	}

	.node-meta {
		font-size: 0.7rem;
		color: #666;
		margin-left: auto;
	}

	:global(.dragging) {
		opacity: 0.5;
	}

	@media (max-width: 767px) {
		.tree-header {
			padding: 0.7rem 0.85rem;
			font-size: 0.68rem;
		}

		.node-label {
			padding: 0.62rem 0.85rem;
			min-height: 42px;
			font-size: 0.86rem;
		}

		.node-label.character {
			padding-left: 1.2rem;
		}

		.node-label.panel {
			padding-left: 1.2rem;
		}

		.page-node > .children {
			padding-left: 0.35rem;
		}

		.char-avatar {
			width: 20px;
			height: 20px;
		}
	}
</style>
