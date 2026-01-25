/**
 * Math Extension for Tiptap
 * Supports LaTeX math expressions using KaTeX
 */
import { Node, mergeAttributes } from '@tiptap/core';
import 'katex/dist/katex.css';
// Note: katex is used for server-side rendering in NodeView

export interface MathOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		math: {
			setMath: (formula: string) => ReturnType;
		};
	}
}

export const Math = Node.create<MathOptions>({
	name: 'math',

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	group: 'block',

	content: 'text*',

	atom: true,

	addAttributes() {
		return {
			formula: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-formula') || element.textContent || '',
				renderHTML: (attributes) => {
					if (!attributes.formula) {
						return {};
					}
					return {
						'data-formula': attributes.formula,
					};
				},
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="math"]',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const formula = HTMLAttributes.formula as string || '';

		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-type': 'math',
				'data-formula': formula,
				class: 'math-node',
			}),
			0,
		];
	},

	addCommands() {
		return {
			setMath:
				(formula: string) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: { formula },
					});
				},
		};
	},
});

