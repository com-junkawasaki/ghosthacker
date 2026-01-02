/**
 * Character Node Extension for Tiptap
 * TODO: Implement full CharacterNode extension based on React version
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface CharacterNodeOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		character: {
			insertCharacter: (attributes: Record<string, unknown>) => ReturnType;
			updateCharacter: (attributes: Record<string, unknown>) => ReturnType;
		};
	}
}

export const CharacterNode = Node.create<CharacterNodeOptions>({
	name: 'character',

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	group: 'block',

	content: 'paragraph+',

	atom: false,

	addAttributes() {
		return {
			characterId: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-character-id'),
				renderHTML: (attributes: Record<string, unknown>) => {
					if (!attributes.characterId) {
						return {};
					}
					return {
						'data-character-id': attributes.characterId,
					};
				},
			},
			name: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-name'),
				renderHTML: (attributes: Record<string, unknown>) => {
					if (!attributes.name) {
						return {};
					}
					return {
						'data-name': attributes.name,
					};
				},
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="character"]',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-type': 'character',
			}),
			0,
		];
	},

	addCommands() {
		return {
			insertCharacter:
				(attributes: Record<string, unknown>) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: attributes,
						content: [
							{
								type: 'paragraph',
							},
						],
					});
				},
			updateCharacter:
				(attributes: Record<string, unknown>) =>
				({ commands }) => {
					return commands.updateAttributes(this.name, attributes);
				},
		};
	},
});
