<script lang="ts">
	import { onMount } from 'svelte';
	import {
		$getRoot as lexicalGetRoot,
		$createParagraphNode as lexicalCreateParagraphNode,
		$createTextNode as lexicalCreateTextNode,
		COMMAND_PRIORITY_LOW,
		FORMAT_TEXT_COMMAND,
		REDO_COMMAND,
		SELECTION_CHANGE_COMMAND,
		UNDO_COMMAND,
		createEditor,
		type LexicalEditor
	} from 'lexical';
	import {
		HeadingNode,
		QuoteNode,
		$createHeadingNode as lexicalCreateHeadingNode,
		$createQuoteNode as lexicalCreateQuoteNode,
		registerRichText
	} from '@lexical/rich-text';
	import { createEmptyHistoryState, registerHistory } from '@lexical/history';
	import { INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode, registerList } from '@lexical/list';
	import { mergeRegister } from 'lexical';
	import type { Panel } from '$lib/gen/proto/storyboard_pb';

	let { panel, storageKey = '' } = $props<{
		panel: Panel;
		storageKey: string;
	}>();

	let rootEl = $state<HTMLDivElement | null>(null);
	let editor: LexicalEditor | null = null;
	let editorActive = $state(false);
	const theme = {
		paragraph: 'lexical-paragraph',
		quote: 'lexical-quote',
		heading: {
			h2: 'lexical-heading'
		},
		text: {
			bold: 'lexical-text-bold',
			italic: 'lexical-text-italic',
			underline: 'lexical-text-underline'
		},
		list: {
			ul: 'lexical-ul',
			listitem: 'lexical-li'
		}
	};

	function buildInitialDocument(targetEditor: LexicalEditor) {
		targetEditor.update(() => {
			const root = lexicalGetRoot();
			root.clear();

			const title = lexicalCreateHeadingNode('h2');
			title.append(lexicalCreateTextNode(`Scene ${panel.pageNumber}-${panel.panel}`));
			root.append(title);

			if (panel.data?.visualNote) {
				const paragraph = lexicalCreateParagraphNode();
				paragraph.append(lexicalCreateTextNode(panel.data.visualNote));
				root.append(paragraph);
			}

			for (const dialogue of panel.data?.dialogue ?? []) {
				const quote = lexicalCreateQuoteNode();
				quote.append(lexicalCreateTextNode(`${dialogue.speaker}: ${dialogue.text}`));
				root.append(quote);
			}

			if (root.getChildrenSize() === 0) {
				root.append(lexicalCreateParagraphNode());
			}
		});
	}

	function saveEditorState(targetEditor: LexicalEditor) {
		if (typeof window === 'undefined' || !storageKey) return;
		const serialized = JSON.stringify(targetEditor.getEditorState().toJSON());
		window.localStorage.setItem(storageKey, serialized);
	}

	function hydrateEditorState(targetEditor: LexicalEditor) {
		if (typeof window === 'undefined' || !storageKey) {
			buildInitialDocument(targetEditor);
			return;
		}
		const serialized = window.localStorage.getItem(storageKey);
		if (!serialized) {
			buildInitialDocument(targetEditor);
			return;
		}
		try {
			const parsed = targetEditor.parseEditorState(serialized);
			targetEditor.setEditorState(parsed);
		} catch {
			buildInitialDocument(targetEditor);
		}
	}

	function focusEditor() {
		editor?.focus();
	}

	function formatText(type: 'bold' | 'italic' | 'underline') {
		editor?.dispatchCommand(FORMAT_TEXT_COMMAND, type);
	}

	function insertBulletList() {
		editor?.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
	}

	function insertHeading() {
		if (!editor) return;
		editor.update(() => {
			const root = lexicalGetRoot();
			const heading = lexicalCreateHeadingNode('h2');
			heading.append(lexicalCreateTextNode('Heading'));
			root.append(heading);
		});
		editor.focus();
	}

	function insertQuote() {
		if (!editor) return;
		editor.update(() => {
			const root = lexicalGetRoot();
			const quote = lexicalCreateQuoteNode();
			quote.append(lexicalCreateTextNode('Quote'));
			root.append(quote);
		});
		editor.focus();
	}

	onMount(() => {
		const targetEditor = createEditor({
			namespace: `kindle-scene-${storageKey}`,
			theme,
			onError: (error) => console.error(error),
			nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode]
		});
		editor = targetEditor;
		hydrateEditorState(targetEditor);
		if (rootEl) targetEditor.setRootElement(rootEl);

		const unregister = mergeRegister(
			registerRichText(targetEditor),
			registerHistory(targetEditor, createEmptyHistoryState(), 300),
			registerList(targetEditor),
			targetEditor.registerUpdateListener(() => {
				saveEditorState(targetEditor);
			}),
			targetEditor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				() => {
					editorActive = document.activeElement === rootEl;
					return false;
				},
				COMMAND_PRIORITY_LOW
			),
			targetEditor.registerCommand(
				UNDO_COMMAND,
				() => false,
				COMMAND_PRIORITY_LOW
			),
			targetEditor.registerCommand(
				REDO_COMMAND,
				() => false,
				COMMAND_PRIORITY_LOW
			),
			targetEditor.registerEditableListener(() => {
				editorActive = document.activeElement === rootEl;
			}),
			targetEditor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				() => {
					editorActive = document.activeElement === rootEl;
					return false;
				},
				COMMAND_PRIORITY_LOW
			),
			targetEditor.registerCommand(
				UNDO_COMMAND,
				() => false,
				COMMAND_PRIORITY_LOW
			)
		);

		return () => {
			targetEditor.setRootElement(null);
			unregister();
		};
	});
</script>

<div class="lexical-shell" class:is-active={editorActive}>
	<div class="lexical-toolbar">
		<button type="button" class="lexical-btn" onclick={() => editor?.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">Undo</button>
		<button type="button" class="lexical-btn" onclick={() => editor?.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">Redo</button>
		<button type="button" class="lexical-btn" onclick={() => formatText('bold')}>B</button>
		<button type="button" class="lexical-btn" onclick={() => formatText('italic')}>I</button>
		<button type="button" class="lexical-btn" onclick={() => formatText('underline')}>U</button>
		<button type="button" class="lexical-btn" onclick={insertHeading}>H2</button>
		<button type="button" class="lexical-btn" onclick={insertQuote}>Quote</button>
		<button type="button" class="lexical-btn" onclick={insertBulletList}>Bullet</button>
	</div>

	<div
		class="lexical-editor"
		bind:this={rootEl}
		contenteditable="true"
		role="textbox"
		tabindex="0"
		onfocus={focusEditor}
	></div>
</div>

<style>
	@reference "tailwindcss";

	.lexical-shell {
		@apply rounded-[22px] border border-[#e6dcc8] bg-white;
	}

	.lexical-shell.is-active {
		box-shadow: 0 0 0 4px rgba(194, 160, 101, 0.12);
	}

	.lexical-toolbar {
		@apply flex flex-wrap gap-2 border-b border-[#eee4d1] bg-[#faf6ed] px-3 py-2;
	}

	.lexical-btn {
		@apply rounded-full border border-[#dbcdb2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5f4b30];
	}

	.lexical-editor {
		@apply min-h-[220px] px-4 py-4 text-[#2f2418] outline-none;
		font-family: Georgia, "Times New Roman", serif;
		font-size: 17px;
		line-height: 1.8;
	}

	.lexical-editor :global(.lexical-heading) {
		font-size: 1.35rem;
		line-height: 1.3;
		font-weight: 700;
		margin: 0 0 0.75rem 0;
	}

	.lexical-editor :global(.lexical-paragraph) {
		margin: 0 0 0.9rem 0;
	}

	.lexical-editor :global(.lexical-quote) {
		margin: 1rem 0;
		padding: 0.85rem 1rem;
		border-left: 4px solid #d5c19a;
		background: #faf5ea;
		border-radius: 0 16px 16px 0;
	}

	.lexical-editor :global(.lexical-text-bold) {
		font-weight: 700;
	}

	.lexical-editor :global(.lexical-text-italic) {
		font-style: italic;
	}

	.lexical-editor :global(.lexical-text-underline) {
		text-decoration: underline;
	}

	.lexical-editor :global(.lexical-ul) {
		margin: 0 0 1rem 1.25rem;
		list-style: disc;
	}

	.lexical-editor :global(.lexical-li) {
		margin: 0.2rem 0;
	}
</style>
