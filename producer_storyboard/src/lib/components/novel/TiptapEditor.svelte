<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { novelStore } from '$lib/stores/novelStore.svelte';
	import { novelClient } from '$lib/grpc/novelClient';
	import { create } from '@bufbuild/protobuf';
	import {
		GetChapterContentRequestSchema,
		UpdateChapterContentRequestSchema,
	} from '$lib/grpc/generated/novel/v1/chapter_pb';

	type Props = {
		projectId: string;
		novelId: string;
		chapterId?: string;
		onChapterSelect?: (chapterId: string) => void;
	};

	let { projectId, novelId, chapterId, onChapterSelect }: Props = $props();

	let editor: Editor | null = $state(null);
	let editorElement: HTMLDivElement | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		if (!browser || !editorElement) return;

		try {
			// Import custom extensions
			const { CharacterNode } = await import('./extensions/CharacterNode');

			// Initialize Tiptap editor
			editor = new Editor({
				element: editorElement,
				extensions: [
					StarterKit.configure({
						history: {
							depth: 50,
						},
					}),
					CharacterNode,
					// TODO: Add more custom extensions (GhostNode, LocationNode, etc.)
				],
				content: '',
				onUpdate: ({ editor: editorInstance }) => {
					const html = editorInstance.getHTML();
					novelStore.setEditorContent(html);
				},
				editorProps: {
					attributes: {
						class: 'prose prose-sm max-w-none focus:outline-none',
					},
				},
			});

			// Load chapter content if chapterId is provided
			if (chapterId) {
				await loadChapterContent(chapterId);
			}

			loading = false;
		} catch (err) {
			console.error('Failed to initialize editor:', err);
			error = err instanceof Error ? err.message : 'Failed to initialize editor';
			loading = false;
		}
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	async function loadChapterContent(chapterId: string) {
		if (!editor) return;

		try {
			loading = true;
			const request = create(GetChapterContentRequestSchema, {
				id: chapterId,
			});

			const response = await novelClient.getChapterContent(request);
			const content = response.contentHtml || '';

			editor.commands.setContent(content);
			novelStore.setEditorContent(content);
			novelStore.markSaved();
		} catch (err) {
			console.error('Failed to load chapter content:', err);
			error = err instanceof Error ? err.message : 'Failed to load chapter content';
		} finally {
			loading = false;
		}
	}

	async function saveChapterContent() {
		if (!editor || !chapterId) return;

		try {
			novelStore.markSaving();
			const html = editor.getHTML();

			const request = create(UpdateChapterContentRequestSchema, {
				id: chapterId,
				contentHtml: html,
			});

			await novelClient.updateChapterContent(request);
			novelStore.markSaved();

			// Reset save status after 3 seconds
			setTimeout(() => {
				novelStore.resetSaveStatus();
			}, 3000);
		} catch (err) {
			console.error('Failed to save chapter content:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to save chapter content';
			novelStore.markSaveError(errorMessage);
		}
	}

	// Auto-save on content change (debounced)
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (novelStore.state.isDirty && chapterId) {
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}
			saveTimeout = setTimeout(() => {
				saveChapterContent();
			}, 2000); // Auto-save after 2 seconds of inactivity
		}
	});

	// Watch for chapterId changes
	$effect(() => {
		if (chapterId && editor) {
			loadChapterContent(chapterId);
		}
	});
</script>

<div class="tiptap-editor">
	{#if loading}
		<div class="loading">Loading editor...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<div bind:this={editorElement} class="editor-content"></div>
		<div class="editor-status">
			{#if novelStore.state.saveStatus === 'saving'}
				<span class="status-saving">Saving...</span>
			{:else if novelStore.state.saveStatus === 'saved'}
				<span class="status-saved">Saved</span>
			{:else if novelStore.state.saveStatus === 'error'}
				<span class="status-error">Error: {novelStore.state.saveError}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.tiptap-editor {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.editor-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		min-height: 200px;
	}

	.editor-content :global(.ProseMirror) {
		outline: none;
		min-height: 100%;
	}

	.editor-content :global(.ProseMirror p) {
		margin: 0.5rem 0;
	}

	.editor-content :global(.ProseMirror h1),
	.editor-content :global(.ProseMirror h2),
	.editor-content :global(.ProseMirror h3) {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.editor-content :global(.ProseMirror ul),
	.editor-content :global(.ProseMirror ol) {
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	.editor-status {
		padding: 0.5rem 1rem;
		border-top: 1px solid var(--border-color, #e5e7eb);
		font-size: 0.875rem;
	}

	.status-saving {
		color: #3b82f6;
	}

	.status-saved {
		color: #10b981;
	}

	.status-error {
		color: #ef4444;
	}

	.loading,
	.error {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		color: var(--text-secondary, #6b7280);
	}

	.error {
		color: var(--error-color, #ef4444);
	}
</style>

