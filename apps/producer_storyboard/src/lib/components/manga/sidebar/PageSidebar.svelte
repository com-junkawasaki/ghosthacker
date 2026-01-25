<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { mangaStore } from '$lib/stores/mangaStore.svelte';
	import { mangaClient } from '$lib/grpc/mangaClient';
	import { create } from '@bufbuild/protobuf';
	import {
		ListPagesRequestSchema,
		CreatePageRequestSchema,
	} from '$lib/grpc/generated/manga/v1/page_pb';
	import type { Page } from '$lib/grpc/generated/manga/v1/page_pb';

	type Props = {
		mangaId: string;
	};

	let { mangaId }: Props = $props();

	let pages = $state<Page[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let creating = $state(false);

	onMount(() => {
		if (browser && mangaId) {
			loadPages();
		}
	});

	async function loadPages() {
		if (!mangaId) return;

		try {
			loading = true;
			error = null;

			const request = create(ListPagesRequestSchema, {
				mangaProjectId: mangaId,
			});

			const response = await mangaClient.listPages(request);
			pages = response.pages || [];
			mangaStore.setPages(pages);
		} catch (err) {
			console.error('Failed to load pages:', err);
			error = err instanceof Error ? err.message : 'Failed to load pages';
		} finally {
			loading = false;
		}
	}

	async function handleCreatePage() {
		if (!mangaId) return;

		try {
			creating = true;
			const nextPageNumber = pages.length > 0
				? Math.max(...pages.map(p => p.pageNumber || 0)) + 1
				: 1;

			const request = create(CreatePageRequestSchema, {
				mangaProjectId: mangaId,
				pageNumber: nextPageNumber,
			});

			const newPage = await mangaClient.createPage(request);
			if (newPage) {
				await loadPages();
				if (newPage.id) {
					mangaStore.selectPage(newPage.id);
				}
			}
		} catch (err) {
			console.error('Failed to create page:', err);
			error = err instanceof Error ? err.message : 'Failed to create page';
		} finally {
			creating = false;
		}
	}

	function handlePageClick(pageId: string) {
		mangaStore.selectPage(pageId);
	}
</script>

<div class="page-sidebar">
	<div class="page-sidebar-header">
		<h3 class="page-sidebar-title">Pages</h3>
		<button
			type="button"
			onclick={handleCreatePage}
			disabled={creating}
			class="create-page-btn"
			title="Create new page"
		>
			+
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading pages...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if pages.length > 0}
		<ul class="page-list">
			{#each pages as page (page.id)}
				<li
					onclick={() => handlePageClick(page.id)}
					class="page-item"
					class:selected={mangaStore.state.selectedPageId === page.id}
				>
					Page {page.pageNumber || 0}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty-state">
			<p>No pages found</p>
			<button
				type="button"
				onclick={handleCreatePage}
				disabled={creating}
				class="create-first-page-btn"
			>
				Create your first page
			</button>
		</div>
	{/if}
</div>

<style>
	.page-sidebar {
		width: 200px;
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--border-color, #e5e7eb);
		background-color: var(--bg-secondary, #f9fafb);
		overflow-y: auto;
	}

	.page-sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.page-sidebar-title {
		margin: 0;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.create-page-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		background-color: #10b981;
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.create-page-btn:hover:not(:disabled) {
		background-color: #059669;
	}

	.create-page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.page-item {
		padding: 0.75rem;
		cursor: pointer;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		transition: background-color 0.2s;
	}

	.page-item:hover {
		background-color: var(--bg-hover, #f3f4f6);
	}

	.page-item.selected {
		background-color: #dbeafe;
		border-left: 3px solid #3b82f6;
	}

	.empty-state {
		padding: 1rem;
		text-align: center;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.empty-state p {
		margin-bottom: 0.5rem;
	}

	.create-first-page-btn {
		color: #3b82f6;
		text-decoration: underline;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0;
	}

	.create-first-page-btn:hover:not(:disabled) {
		color: #2563eb;
	}

	.create-first-page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading,
	.error {
		padding: 1rem;
		font-size: 0.875rem;
	}

	.error {
		color: var(--error-color, #ef4444);
	}
</style>

