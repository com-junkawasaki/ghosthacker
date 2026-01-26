<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import { novelStore } from '$lib/stores/novelStore.svelte';
	import EdraEditor from './EdraEditor.svelte';
	import ChapterTree from './ChapterTree.svelte';
	import MetadataForm from './MetadataForm.svelte';
	import MediaLibrary from './MediaLibrary.svelte';
	import GraphPanel from './GraphPanel.svelte';

	type Props = {
		projectId: string;
		novelId: string;
	};

	let { projectId, novelId }: Props = $props();

	onMount(() => {
		if (browser && projectId) {
			novelStore.initialize(projectId);
		}
	});

	function handleChapterSelect(chapterId: string | null) {
		novelStore.selectChapter(chapterId);
	}

	function toggleGraphPanel() {
		novelStore.toggleGraphPanel();
	}
</script>

<div class="novel-editor-layout">
	<PaneGroup direction="horizontal">
		<!-- Left sidebar -->
		<Pane defaultSize={20} minSize={15} maxSize={30}>
			<aside class="sidebar left-sidebar">
				<ChapterTree
					novelId={novelId}
					onChapterSelect={handleChapterSelect}
					selectedChapterId={novelStore.state.selectedChapterId}
				/>
				<MetadataForm novelId={novelId} />
				<MediaLibrary chapterId={novelStore.state.selectedChapterId || ''} />
			</aside>
		</Pane>

		<PaneResizer class="resize-handle" />

		<!-- Main editor area -->
		<Pane defaultSize={novelStore.state.showGraphPanel ? 50 : 80} minSize={30}>
			<main class="editor-main">
				<div class="editor-header">
					<h2 class="editor-title">Editor</h2>
					<button
						type="button"
						onclick={toggleGraphPanel}
						class="toggle-graph-btn"
					>
						{novelStore.state.showGraphPanel ? 'Hide Graph' : 'Show Graph'}
					</button>
				</div>
				<EdraEditor
					projectId={projectId}
					novelId={novelId}
					chapterId={novelStore.state.selectedChapterId || undefined}
					onChapterSelect={handleChapterSelect}
				/>
			</main>
		</Pane>

		<!-- Right graph panel -->
		{#if novelStore.state.showGraphPanel}
			<PaneResizer class="resize-handle" />
			<Pane defaultSize={30} minSize={20} maxSize={50}>
				<aside class="sidebar right-sidebar">
					<div class="graph-panel-header">
						<h3 class="graph-panel-title">Graph View</h3>
					</div>
					<div class="graph-panel-content">
						<GraphPanel projectId={projectId} />
					</div>
				</aside>
			</Pane>
		{/if}
	</PaneGroup>
</div>

<style>
	.novel-editor-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		height: 100%;
		border-right: 1px solid var(--border-color, #e5e7eb);
		overflow-y: auto;
		padding: 1rem;
		background-color: var(--bg-secondary, #f9fafb);
	}

	.right-sidebar {
		border-right: none;
		border-left: 1px solid var(--border-color, #e5e7eb);
	}

	:global(.resize-handle) {
		width: 2px;
		background-color: var(--border-color, #e5e7eb);
		cursor: col-resize;
		transition: background-color 0.2s;
	}

	:global(.resize-handle:hover) {
		background-color: var(--border-hover, #d1d5db);
	}

	.editor-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 1rem;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.editor-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.toggle-graph-btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.toggle-graph-btn:hover {
		background-color: #2563eb;
	}

	.graph-panel-header {
		padding: 0.5rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		background-color: var(--bg-tertiary, #f3f4f6);
	}

	.graph-panel-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.graph-panel-content {
		flex: 1;
		overflow: hidden;
	}
</style>
