<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { StarterKit } from '@tiptap/starter-kit';
	import { Image } from '@tiptap/extension-image';
	import { Link } from '@tiptap/extension-link';
	import { Table } from '@tiptap/extension-table';
	import { TableRow } from '@tiptap/extension-table-row';
	import { TableCell } from '@tiptap/extension-table-cell';
	import { TableHeader } from '@tiptap/extension-table-header';
	import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
	import { TextStyle } from '@tiptap/extension-text-style';
	import { Color } from '@tiptap/extension-color';
	import { Highlight } from '@tiptap/extension-highlight';
	import { FontFamily } from '@tiptap/extension-font-family';
	import { Underline } from '@tiptap/extension-underline';
	import { Subscript } from '@tiptap/extension-subscript';
	import { Superscript } from '@tiptap/extension-superscript';
	import { createLowlight } from 'lowlight';
	import { FontSize } from './extensions/FontSize';
	import { Math } from './extensions/Math';
	import 'katex/dist/katex.css';
	import { novelStore } from '$lib/stores/novelStore.svelte';
	import { novelClient } from '$lib/grpc/novelClient';
	import { create } from '@bufbuild/protobuf';
	import {
		GetChapterContentRequestSchema,
		UpdateChapterContentRequestSchema,
	} from '$lib/grpc/generated/novel/v1/chapter_pb';
	import EdraToolbar from './edra/EdraToolbar.svelte';
	import EdraBubbleMenu from './edra/EdraBubbleMenu.svelte';
	import EdraSlashCommand from './edra/EdraSlashCommand.svelte';

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

	// Initialize lowlight for syntax highlighting
	const lowlight = createLowlight();

	onMount(async () => {
		if (!browser || !editorElement) return;

		try {
			// Import custom extensions
			const { CharacterNode } = await import('./extensions/CharacterNode');

			// Initialize Tiptap editor with Edra-style extensions
			editor = new Editor({
				element: editorElement,
				extensions: [
					StarterKit.configure({
						history: {
							depth: 50,
						},
						codeBlock: false, // Use CodeBlockLowlight instead
					}),
					Image.configure({
						inline: true,
						allowBase64: true,
					}),
					Link.configure({
						openOnClick: false,
					}),
					// Table extensions
					Table.configure({
						resizable: true,
					}),
					TableRow,
					TableHeader,
					TableCell,
					// Code block with syntax highlighting
					CodeBlockLowlight.configure({
						lowlight,
					}),
					// Text styling extensions
					TextStyle,
					Color,
					Highlight.configure({
						multicolor: true,
					}),
					FontFamily,
					FontSize,
					Math,
					Underline,
					Subscript,
					Superscript,
					CharacterNode,
				],
				content: '',
				onUpdate: ({ editor: editorInstance }) => {
					const html = editorInstance.getHTML();
					novelStore.setEditorContent(html);
				},
				editorProps: {
					attributes: {
						class: 'prose prose-sm max-w-none focus:outline-none edra-editor',
					},
				},
			});

			// Load chapter content if chapterId is provided
			if (chapterId) {
				await loadChapterContent(chapterId);
			}

			loading = false;
		} catch (err) {
			console.error('Failed to initialize Edra editor:', err);
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

	// Render KaTeX math nodes after editor is ready
	$effect(() => {
		if (!editor || !browser) return;

		function renderMathNodes() {
			const mathNodes = editorElement?.querySelectorAll('[data-type="math"]');
			mathNodes?.forEach((node) => {
				const formula = node.getAttribute('data-formula') || '';
				if (formula && !node.querySelector('.katex')) {
					try {
						const html = katex.renderToString(formula, {
							throwOnError: false,
						});
						node.innerHTML = html;
					} catch (error) {
						console.error('KaTeX rendering error:', error);
						node.innerHTML = `<span class="math-error">${formula}</span>`;
					}
				}
			});
		}

		// Render math nodes on update
		editor.on('update', renderMathNodes);
		editor.on('create', renderMathNodes);

		// Initial render
		setTimeout(renderMathNodes, 100);

		return () => {
			editor.off('update', renderMathNodes);
			editor.off('create', renderMathNodes);
		};
	});
</script>

<div class="edra-editor-wrapper">
	{#if loading}
		<div class="loading">Loading editor...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if editor}
		<!-- Toolbar -->
		<EdraToolbar {editor} />

		<!-- Editor content -->
		<div bind:this={editorElement} class="editor-content"></div>

		<!-- Bubble menu (positioned relative to editor content) -->
		{#if editorElement}
			<EdraBubbleMenu {editor} editorContainer={editorElement} />
		{/if}

		<!-- Slash command menu -->
		<EdraSlashCommand {editor} />

		<!-- Status bar -->
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
	.edra-editor-wrapper {
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
		background-color: var(--bg-primary, #ffffff);
		position: relative;
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
	.editor-content :global(.ProseMirror h3),
	.editor-content :global(.ProseMirror h4),
	.editor-content :global(.ProseMirror h5),
	.editor-content :global(.ProseMirror h6) {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.editor-content :global(.ProseMirror ul),
	.editor-content :global(.ProseMirror ol) {
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	.editor-content :global(.ProseMirror blockquote) {
		border-left: 4px solid var(--border-color, #e5e7eb);
		padding-left: 1rem;
		margin: 0.5rem 0;
		color: var(--text-secondary, #6b7280);
	}

	.editor-content :global(.ProseMirror code) {
		background-color: var(--bg-secondary, #f9fafb);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.875em;
	}

	.editor-content :global(.ProseMirror pre) {
		background-color: var(--bg-secondary, #f9fafb);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 0.5rem 0;
	}

	.editor-content :global(.ProseMirror pre code) {
		background-color: transparent;
		padding: 0;
	}

	.editor-content :global(.ProseMirror img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 0.5rem 0;
	}

	.editor-content :global(.ProseMirror a) {
		color: var(--primary-color, #3b82f6);
		text-decoration: underline;
	}

	/* Math node styles */
	.editor-content :global(.ProseMirror .math-node) {
		margin: 0.5rem 0;
		padding: 0.5rem;
		background-color: var(--bg-secondary, #f9fafb);
		border-radius: 0.25rem;
		text-align: center;
	}

	.editor-content :global(.ProseMirror .math-error) {
		color: var(--error-color, #ef4444);
		font-style: italic;
	}

	/* Table styles */
	.editor-content :global(.ProseMirror table) {
		border-collapse: collapse;
		margin: 0.5rem 0;
		table-layout: fixed;
		width: 100%;
	}

	.editor-content :global(.ProseMirror table td),
	.editor-content :global(.ProseMirror table th) {
		border: 1px solid var(--border-color, #e5e7eb);
		padding: 0.5rem;
		min-width: 1em;
		position: relative;
		vertical-align: top;
	}

	.editor-content :global(.ProseMirror table th) {
		font-weight: 600;
		background-color: var(--bg-secondary, #f9fafb);
	}

	.editor-content :global(.ProseMirror table .selectedCell:after) {
		z-index: 2;
		position: absolute;
		content: '';
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: rgba(200, 200, 255, 0.4);
		pointer-events: none;
	}

	.editor-status {
		padding: 0.5rem 1rem;
		border-top: 1px solid var(--border-color, #e5e7eb);
		font-size: 0.875rem;
		background-color: var(--bg-secondary, #f9fafb);
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

