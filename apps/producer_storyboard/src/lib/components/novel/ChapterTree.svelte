<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { novelStore } from '$lib/stores/novelStore.svelte';
	import { novelClient } from '$lib/grpc/novelClient';
	import { create } from '@bufbuild/protobuf';
	import {
		ListChaptersRequestSchema,
		CreateChapterRequestSchema,
	} from '$lib/grpc/generated/novel/v1/chapter_pb';
	import type { Chapter } from '$lib/grpc/generated/novel/v1/chapter_pb';

	type Props = {
		novelId: string;
		onChapterSelect?: (chapterId: string | null) => void;
		selectedChapterId?: string | null;
	};

	let { novelId, onChapterSelect, selectedChapterId }: Props = $props();

	let chapters = $state<Chapter[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let creating = $state(false);

	onMount(() => {
		if (browser && novelId) {
			loadChapters();
		}
	});

	async function loadChapters() {
		if (!novelId) return;

		try {
			loading = true;
			error = null;

			const request = create(ListChaptersRequestSchema, {
				novelProjectId: novelId,
			});

			const response = await novelClient.listChapters(request);
			chapters = response.chapters || [];
			novelStore.setChapters(chapters);
		} catch (err) {
			console.error('Failed to load chapters:', err);
			error = err instanceof Error ? err.message : 'Failed to load chapters';
		} finally {
			loading = false;
		}
	}

	async function handleCreateChapter() {
		if (!novelId) return;

		try {
			creating = true;
			const nextOrder = chapters.length > 0
				? Math.max(...chapters.map(c => c.orderIndex || 0)) + 1
				: 1;

			const request = create(CreateChapterRequestSchema, {
				novelProjectId: novelId,
				title: `Chapter ${nextOrder}`,
				orderIndex: nextOrder,
			});

			const newChapter = await novelClient.createChapter(request);
			if (newChapter) {
				await loadChapters();
				if (onChapterSelect && newChapter.id) {
					onChapterSelect(newChapter.id);
				}
			}
		} catch (err) {
			console.error('Failed to create chapter:', err);
			error = err instanceof Error ? err.message : 'Failed to create chapter';
		} finally {
			creating = false;
		}
	}

	function handleChapterClick(chapterId: string) {
		if (onChapterSelect) {
			onChapterSelect(chapterId);
		}
	}
</script>

<div class="chapter-tree">
	<div class="chapter-tree-header">
		<h3 class="chapter-tree-title">Chapters</h3>
		<button
			type="button"
			onclick={handleCreateChapter}
			disabled={creating}
			class="create-chapter-btn"
			title="Create new chapter"
		>
			+
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading chapters...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if chapters.length > 0}
		<ul class="chapter-list">
			{#each chapters as chapter (chapter.id)}
				<li
					onclick={() => handleChapterClick(chapter.id)}
					class="chapter-item"
					class:selected={selectedChapterId === chapter.id}
				>
					{chapter.orderIndex || 0}. {chapter.title || 'Untitled'}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty-state">
			<p>No chapters found</p>
			<button
				type="button"
				onclick={handleCreateChapter}
				disabled={creating}
				class="create-first-chapter-btn"
			>
				Create your first chapter
			</button>
		</div>
	{/if}
</div>

<style>
	.chapter-tree {
		margin-bottom: 1rem;
	}

	.chapter-tree-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.chapter-tree-title {
		margin: 0;
		font-weight: 600;
		font-size: 1rem;
	}

	.create-chapter-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		background-color: #10b981;
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.create-chapter-btn:hover:not(:disabled) {
		background-color: #059669;
	}

	.create-chapter-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.chapter-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.chapter-item {
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 0.25rem;
		transition: background-color 0.2s;
		margin-bottom: 0.25rem;
	}

	.chapter-item:hover {
		background-color: var(--bg-hover, #f3f4f6);
	}

	.chapter-item.selected {
		background-color: #dbeafe;
		border: 1px solid #93c5fd;
	}

	.empty-state {
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.empty-state p {
		margin-bottom: 0.5rem;
	}

	.create-first-chapter-btn {
		color: #3b82f6;
		text-decoration: underline;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0;
	}

	.create-first-chapter-btn:hover:not(:disabled) {
		color: #2563eb;
	}

	.create-first-chapter-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading,
	.error {
		padding: 0.5rem;
		font-size: 0.875rem;
	}

	.error {
		color: var(--error-color, #ef4444);
	}
</style>

