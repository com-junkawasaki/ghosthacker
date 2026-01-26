<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { Editor } from '@tiptap/core';

	type Props = {
		editor: Editor | null;
	};

	let { editor }: Props = $props();

	let isVisible = $state(false);
	let position = $state({ x: 0, y: 0 });
	let query = $state('');
	let selectedIndex = $state(0);

	const commands = [
		{
			title: 'Heading 1',
			description: 'Big section heading',
			icon: 'H1',
			command: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
		},
		{
			title: 'Heading 2',
			description: 'Medium section heading',
			icon: 'H2',
			command: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
		},
		{
			title: 'Heading 3',
			description: 'Small section heading',
			icon: 'H3',
			command: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
		},
		{
			title: 'Bullet List',
			description: 'Create a bullet list',
			icon: '•',
			command: () => editor?.chain().focus().toggleBulletList().run(),
		},
		{
			title: 'Numbered List',
			description: 'Create a numbered list',
			icon: '1.',
			command: () => editor?.chain().focus().toggleOrderedList().run(),
		},
		{
			title: 'Quote',
			description: 'Create a quote block',
			icon: '"',
			command: () => editor?.chain().focus().toggleBlockquote().run(),
		},
		{
			title: 'Code Block',
			description: 'Create a code block',
			icon: '{}',
			command: () => editor?.chain().focus().toggleCodeBlock().run(),
		},
		{
			title: 'Table',
			description: 'Insert a table',
			icon: 'Table',
			command: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
		},
		{
			title: 'Image',
			description: 'Insert an image',
			icon: 'Image',
			command: () => {
				const url = prompt('Enter image URL:');
				if (url) {
					editor?.chain().focus().setImage({ src: url }).run();
				}
			},
		},
		{
			title: 'Math Formula',
			description: 'Insert a LaTeX math formula',
			icon: '∑',
			command: () => {
				const formula = prompt('Enter LaTeX formula:');
				if (formula) {
					editor?.chain().focus().setMath(formula).run();
				}
			},
		},
	];

	let filteredCommands = $derived(
		query
			? commands.filter(
					(cmd) =>
						cmd.title.toLowerCase().includes(query.toLowerCase()) ||
						cmd.description.toLowerCase().includes(query.toLowerCase())
				)
			: commands
	);

	function handleKeydown(event: KeyboardEvent) {
		if (!isVisible) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % filteredCommands.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredCommands.length - 1;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (filteredCommands[selectedIndex]) {
				filteredCommands[selectedIndex].command();
				isVisible = false;
				query = '';
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			isVisible = false;
			query = '';
		}
	}

	function checkSlashCommand() {
		if (!editor) return;

		const { selection } = editor.state;
		const { from } = selection;
		const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, '\n');
		const match = textBefore.match(/\/(\w*)$/);

		if (match) {
			query = match[1];
			const coords = editor.view.coordsAtPos(from);
			const editorDom = editor.view.dom;
			const editorRect = editorDom.getBoundingClientRect();
			const containerRect = editorDom.closest('.editor-content')?.getBoundingClientRect() || editorRect;

			position = {
				x: coords.left - containerRect.left,
				y: coords.top - containerRect.top + 20,
			};

			isVisible = true;
			selectedIndex = 0;
		} else {
			isVisible = false;
			query = '';
		}
	}

	onMount(() => {
		if (!editor || !browser) return;

		editor.on('transaction', checkSlashCommand);
		document.addEventListener('keydown', handleKeydown);

		return () => {
			editor.off('transaction', checkSlashCommand);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if editor && browser && isVisible && filteredCommands.length > 0}
	<div
		class="slash-command-menu"
		style="left: {position.x}px; top: {position.y}px;"
	>
		{#each filteredCommands as command, index}
			<button
				type="button"
				class="command-item"
				class:selected={index === selectedIndex}
				onclick={() => {
					command.command();
					isVisible = false;
					query = '';
				}}
			>
				<span class="command-icon">{command.icon}</span>
				<div class="command-content">
					<div class="command-title">{command.title}</div>
					<div class="command-description">{command.description}</div>
				</div>
			</button>
		{/each}
	</div>
{/if}

<style>
	.slash-command-menu {
		position: absolute;
		background-color: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.375rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		min-width: 200px;
		max-height: 300px;
		overflow-y: auto;
	}

	.command-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
		border: none;
		background-color: transparent;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s;
	}

	.command-item:hover,
	.command-item.selected {
		background-color: var(--bg-hover, #f3f4f6);
	}

	.command-icon {
		font-weight: 600;
		font-size: 1.25rem;
		width: 2rem;
		text-align: center;
	}

	.command-content {
		flex: 1;
	}

	.command-title {
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--text-primary, #1f2937);
	}

	.command-description {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		margin-top: 0.125rem;
	}
</style>

