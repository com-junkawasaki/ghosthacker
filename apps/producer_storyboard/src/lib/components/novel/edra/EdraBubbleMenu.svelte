<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { Editor } from '@tiptap/core';

	type Props = {
		editor: Editor | null;
		editorContainer?: HTMLElement | null;
	};

	let { editor, editorContainer: initialContainer }: Props = $props();

	let bubbleMenuElement: HTMLDivElement | null = $state(null);
	let editorContainerEl: HTMLElement | null = $state(null);
	let isVisible = $state(false);
	let position = $state({ x: 0, y: 0 });

	function updatePosition() {
		if (!editor || !bubbleMenuElement) return;

		const { selection } = editor.state;
		const { from, to } = selection;

		if (from === to) {
			isVisible = false;
			return;
		}

		const coords = editor.view.coordsAtPos(from);
		const editorDom = editor.view.dom;
		const editorRect = editorDom.getBoundingClientRect();
		const containerRect = editorContainerEl?.getBoundingClientRect() || editorRect;

		position = {
			x: coords.left - containerRect.left,
			y: coords.top - containerRect.top - 40,
		};

		// Check if menu would be outside viewport
		if (position.y < 0) {
			position.y = coords.bottom - containerRect.top + 10;
		}

		isVisible = true;
	}

	onMount(() => {
		if (!editor || !browser) return;

		// Use provided container or find it
		editorContainerEl = initialContainer || (editor.view.dom.closest('.editor-content') as HTMLElement);

		editor.on('selectionUpdate', updatePosition);
		editor.on('transaction', updatePosition);

		return () => {
			editor.off('selectionUpdate', updatePosition);
			editor.off('transaction', updatePosition);
		};
	});

	function toggleBold() {
		editor?.chain().focus().toggleBold().run();
	}

	function toggleItalic() {
		editor?.chain().focus().toggleItalic().run();
	}

	function toggleUnderline() {
		editor?.chain().focus().toggleUnderline().run();
	}

	function toggleStrike() {
		editor?.chain().focus().toggleStrike().run();
	}

	function toggleCode() {
		editor?.chain().focus().toggleCode().run();
	}

	function toggleHighlight() {
		editor?.chain().focus().toggleHighlight().run();
	}

	function setColor(color: string) {
		editor?.chain().focus().setColor(color).run();
	}

	const colors = [
		'#000000',
		'#3b82f6',
		'#10b981',
		'#f59e0b',
		'#ef4444',
		'#8b5cf6',
		'#ec4899',
	];
</script>

{#if editor && browser && isVisible && editorContainerEl}
	<div
		bind:this={bubbleMenuElement}
		class="bubble-menu"
		style="left: {position.x}px; top: {position.y}px;"
	>
		<button
			type="button"
			onclick={toggleBold}
			class:active={editor.isActive('bold')}
			title="Bold"
		>
			<strong>B</strong>
		</button>
		<button
			type="button"
			onclick={toggleItalic}
			class:active={editor.isActive('italic')}
			title="Italic"
		>
			<em>I</em>
		</button>
		<button
			type="button"
			onclick={toggleUnderline}
			class:active={editor.isActive('underline')}
			title="Underline"
		>
			<u>U</u>
		</button>
		<button
			type="button"
			onclick={toggleStrike}
			class:active={editor.isActive('strike')}
			title="Strikethrough"
		>
			<s>S</s>
		</button>
		<button
			type="button"
			onclick={toggleCode}
			class:active={editor.isActive('code')}
			title="Code"
		>
			&lt;/&gt;
		</button>
		<button
			type="button"
			onclick={toggleHighlight}
			class:active={editor.isActive('highlight')}
			title="Highlight"
		>
			✓
		</button>
		<div class="color-picker">
			<button type="button" class="color-trigger" title="Text Color">
				A
			</button>
			<div class="color-menu">
				{#each colors as color}
					<button
						type="button"
						class="color-option"
						style="background-color: {color}"
						onclick={() => setColor(color)}
						title={color}
					></button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.bubble-menu {
		position: absolute;
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background-color: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.375rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		pointer-events: auto;
	}

	.bubble-menu button {
		padding: 0.25rem 0.5rem;
		border: none;
		border-radius: 0.25rem;
		background-color: transparent;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.bubble-menu button:hover {
		background-color: var(--bg-hover, #f3f4f6);
	}

	.bubble-menu button.active {
		background-color: var(--primary-color, #3b82f6);
		color: white;
	}

	.color-picker {
		position: relative;
		display: inline-block;
	}

	.color-menu {
		display: none;
		position: absolute;
		bottom: 100%;
		left: 0;
		margin-bottom: 0.25rem;
		background-color: white;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.25rem;
		padding: 0.25rem;
		z-index: 1001;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.color-picker:hover .color-menu {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.25rem;
	}

	.color-option {
		width: 1.5rem;
		height: 1.5rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.125rem;
		cursor: pointer;
		padding: 0;
	}

	.color-option:hover {
		transform: scale(1.1);
	}
</style>

