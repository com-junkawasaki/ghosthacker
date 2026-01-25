<script lang="ts">
	import type { Editor } from '@tiptap/core';

	type Props = {
		editor: Editor | null;
	};

	let { editor }: Props = $props();

	function toggleBold() {
		if (!editor) return;
		editor.chain().focus().toggleBold().run();
	}

	function toggleItalic() {
		if (!editor) return;
		editor.chain().focus().toggleItalic().run();
	}

	function toggleUnderline() {
		if (!editor) return;
		editor.chain().focus().toggleUnderline().run();
	}

	function toggleStrike() {
		if (!editor) return;
		editor.chain().focus().toggleStrike().run();
	}

	function toggleCode() {
		if (!editor) return;
		editor.chain().focus().toggleCode().run();
	}

	function toggleHighlight() {
		if (!editor) return;
		editor.chain().focus().toggleHighlight().run();
	}

	function setHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
		if (!editor) return;
		editor.chain().focus().toggleHeading({ level }).run();
	}

	function setParagraph() {
		if (!editor) return;
		editor.chain().focus().setParagraph().run();
	}

	function toggleBulletList() {
		if (!editor) return;
		editor.chain().focus().toggleBulletList().run();
	}

	function toggleOrderedList() {
		if (!editor) return;
		editor.chain().focus().toggleOrderedList().run();
	}

	function toggleBlockquote() {
		if (!editor) return;
		editor.chain().focus().toggleBlockquote().run();
	}

	function insertTable() {
		if (!editor) return;
		editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
	}

	function insertCodeBlock() {
		if (!editor) return;
		editor.chain().focus().toggleCodeBlock().run();
	}

	function insertImage() {
		if (!editor) return;
		const url = prompt('Enter image URL:');
		if (url) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	}

	function insertMath() {
		if (!editor) return;
		const formula = prompt('Enter LaTeX formula:');
		if (formula) {
			editor.chain().focus().setMath(formula).run();
		}
	}

	function setColor(color: string) {
		if (!editor) return;
		editor.chain().focus().setColor(color).run();
	}

	function setHighlightColor(color: string) {
		if (!editor) return;
		editor.chain().focus().toggleHighlight({ color }).run();
	}

	function toggleSubscript() {
		if (!editor) return;
		editor.chain().focus().toggleSubscript().run();
	}

	function toggleSuperscript() {
		if (!editor) return;
		editor.chain().focus().toggleSuperscript().run();
	}

	function setFontSize(size: string) {
		if (!editor) return;
		editor.chain().focus().setFontSize(size).run();
	}

	const fontSizes = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

	const colors = [
		'#000000',
		'#3b82f6',
		'#10b981',
		'#f59e0b',
		'#ef4444',
		'#8b5cf6',
		'#ec4899',
	];

	const highlightColors = [
		'#fef08a',
		'#fecaca',
		'#bfdbfe',
		'#c7d2fe',
		'#d1fae5',
	];
</script>

{#if editor}
<div class="edra-toolbar">
	<!-- Text formatting -->
	<div class="toolbar-group">
		<button
			type="button"
			onclick={toggleBold}
			class:active={editor.isActive('bold')}
			title="Bold (Ctrl+B)"
		>
			<strong>B</strong>
		</button>
		<button
			type="button"
			onclick={toggleItalic}
			class:active={editor.isActive('italic')}
			title="Italic (Ctrl+I)"
		>
			<em>I</em>
		</button>
		<button
			type="button"
			onclick={toggleUnderline}
			class:active={editor.isActive('underline')}
			title="Underline (Ctrl+U)"
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
	</div>

	<!-- Headings -->
	<div class="toolbar-group">
		<button
			type="button"
			onclick={() => setHeading(1)}
			class:active={editor.isActive('heading', { level: 1 })}
			title="Heading 1"
		>
			H1
		</button>
		<button
			type="button"
			onclick={() => setHeading(2)}
			class:active={editor.isActive('heading', { level: 2 })}
			title="Heading 2"
		>
			H2
		</button>
		<button
			type="button"
			onclick={() => setHeading(3)}
			class:active={editor.isActive('heading', { level: 3 })}
			title="Heading 3"
		>
			H3
		</button>
		<button
			type="button"
			onclick={setParagraph}
			class:active={editor.isActive('paragraph')}
			title="Paragraph"
		>
			P
		</button>
	</div>

	<!-- Lists -->
	<div class="toolbar-group">
		<button
			type="button"
			onclick={toggleBulletList}
			class:active={editor.isActive('bulletList')}
			title="Bullet List"
		>
			•
		</button>
		<button
			type="button"
			onclick={toggleOrderedList}
			class:active={editor.isActive('orderedList')}
			title="Numbered List"
		>
			1.
		</button>
		<button
			type="button"
			onclick={toggleBlockquote}
			class:active={editor.isActive('blockquote')}
			title="Quote"
		>
			"
		</button>
	</div>

	<!-- Code -->
	<div class="toolbar-group">
		<button
			type="button"
			onclick={toggleCode}
			class:active={editor.isActive('code')}
			title="Inline Code"
		>
			&lt;/&gt;
		</button>
		<button
			type="button"
			onclick={insertCodeBlock}
			class:active={editor.isActive('codeBlock')}
			title="Code Block"
		>
			{'{}'}
		</button>
	</div>

	<!-- Colors -->
	<div class="toolbar-group">
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
		<div class="color-picker">
			<button type="button" class="highlight-trigger" title="Highlight">
				✓
			</button>
			<div class="color-menu">
				{#each highlightColors as color}
					<button
						type="button"
						class="color-option"
						style="background-color: {color}"
						onclick={() => setHighlightColor(color)}
						title={color}
					></button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Subscript/Superscript -->
	<div class="toolbar-group">
		<button
			type="button"
			onclick={toggleSubscript}
			class:active={editor.isActive('subscript')}
			title="Subscript"
		>
			x<sub>2</sub>
		</button>
		<button
			type="button"
			onclick={toggleSuperscript}
			class:active={editor.isActive('superscript')}
			title="Superscript"
		>
			x<sup>2</sup>
		</button>
	</div>

	<!-- Font Size -->
	<div class="toolbar-group">
		<select
			onchange={(e) => {
				const size = (e.target as HTMLSelectElement).value;
				if (size) {
					setFontSize(size);
				}
			}}
			class="font-size-select"
			title="Font Size"
		>
			<option value="">Size</option>
			{#each fontSizes as size}
				<option value={size}>{size}px</option>
			{/each}
		</select>
	</div>

	<!-- Insert -->
	<div class="toolbar-group">
		<button type="button" onclick={insertTable} title="Insert Table">
			Table
		</button>
		<button type="button" onclick={insertImage} title="Insert Image">
			Image
		</button>
		<button type="button" onclick={insertMath} title="Insert Math Formula">
			Math
		</button>
	</div>
</div>
{/if}

<style>
	.edra-toolbar {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		background-color: var(--bg-secondary, #f9fafb);
		flex-wrap: wrap;
		align-items: center;
	}

	.toolbar-group {
		display: flex;
		gap: 0.25rem;
		padding: 0 0.5rem;
		border-right: 1px solid var(--border-color, #e5e7eb);
	}

	.toolbar-group:last-child {
		border-right: none;
	}

	.edra-toolbar button {
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.25rem;
		background-color: var(--bg-primary, #ffffff);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.edra-toolbar button:hover {
		background-color: var(--bg-hover, #f3f4f6);
	}

	.edra-toolbar button.active {
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
		top: 100%;
		left: 0;
		background-color: white;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.25rem;
		padding: 0.25rem;
		z-index: 1000;
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

	.font-size-select {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.25rem;
		background-color: var(--bg-primary, #ffffff);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.font-size-select:hover {
		background-color: var(--bg-hover, #f3f4f6);
	}
</style>

