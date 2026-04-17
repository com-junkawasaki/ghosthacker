/**
 * Custom Lexical nodes for Kindle EPUB WYSIWYG editor.
 *
 * Each node maps 1:1 to an EPUB-compatible HTML element:
 *   ImageNode   -> <figure><img></figure>
 *   SceneBreakNode -> <hr>
 *
 * The editor DOM IS the EPUB DOM — styles applied here must stay
 * within Kindle-supported CSS.
 */

import {
	DecoratorNode,
	type DOMExportOutput,
	type EditorConfig,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread
} from 'lexical';

// ---------------------------------------------------------------------------
// ImageNode
// ---------------------------------------------------------------------------

export type SerializedImageNode = Spread<
	{ src: string; altText: string },
	SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<null> {
	__src: string;
	__altText: string;

	static getType(): string {
		return 'kindle-image';
	}

	static clone(node: ImageNode): ImageNode {
		return new ImageNode(node.__src, node.__altText, node.__key);
	}

	constructor(src: string, altText: string, key?: NodeKey) {
		super(key);
		this.__src = src;
		this.__altText = altText;
	}

	createDOM(_config: EditorConfig): HTMLElement {
		const figure = document.createElement('figure');
		figure.className = 'kindle-figure';
		const img = document.createElement('img');
		img.src = this.__src;
		img.alt = this.__altText;
		img.className = 'kindle-figure-img';
		img.draggable = false;
		img.loading = 'lazy';
		figure.appendChild(img);
		return figure;
	}

	updateDOM(prevNode: ImageNode): boolean {
		return prevNode.__src !== this.__src || prevNode.__altText !== this.__altText;
	}

	decorate(): null {
		return null;
	}

	isInline(): boolean {
		return false;
	}

	static importJSON(json: SerializedImageNode): ImageNode {
		return createImageNode(json.src, json.altText);
	}

	exportJSON(): SerializedImageNode {
		return { type: 'kindle-image', version: 1, src: this.__src, altText: this.__altText };
	}

	exportDOM(): DOMExportOutput {
		const figure = document.createElement('figure');
		const img = document.createElement('img');
		img.src = this.__src;
		img.alt = this.__altText;
		figure.appendChild(img);
		return { element: figure };
	}

	getSrc(): string {
		return this.__src;
	}

	getAltText(): string {
		return this.__altText;
	}

	setSrc(src: string): void {
		const self = this.getWritable();
		self.__src = src;
	}
}

export function createImageNode(src: string, altText: string): ImageNode {
	return new ImageNode(src, altText);
}

export function isImageNode(
	node: LexicalNode | null | undefined
): node is ImageNode {
	return node instanceof ImageNode;
}

// ---------------------------------------------------------------------------
// SceneBreakNode
// ---------------------------------------------------------------------------

export class SceneBreakNode extends DecoratorNode<null> {
	static getType(): string {
		return 'kindle-scene-break';
	}

	static clone(node: SceneBreakNode): SceneBreakNode {
		return new SceneBreakNode(node.__key);
	}

	createDOM(): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'kindle-scene-break';
		wrapper.setAttribute('role', 'separator');
		wrapper.contentEditable = 'false';
		const line = document.createElement('div');
		line.className = 'kindle-scene-break-ornament';
		wrapper.appendChild(line);
		return wrapper;
	}

	updateDOM(): boolean {
		return false;
	}

	decorate(): null {
		return null;
	}

	isInline(): boolean {
		return false;
	}

	static importJSON(): SceneBreakNode {
		return createSceneBreakNode();
	}

	exportJSON(): SerializedLexicalNode {
		return { type: 'kindle-scene-break', version: 1 };
	}

	exportDOM(): DOMExportOutput {
		return { element: document.createElement('hr') };
	}
}

export function createSceneBreakNode(): SceneBreakNode {
	return new SceneBreakNode();
}

export function isSceneBreakNode(
	node: LexicalNode | null | undefined
): node is SceneBreakNode {
	return node instanceof SceneBreakNode;
}
