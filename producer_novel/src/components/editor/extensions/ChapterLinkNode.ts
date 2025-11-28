/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/chapter-link-node-extension
 * 
 * ChapterLinkノード拡張 - 章へのリンクを本文に挿入可能にする
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { ChapterLinkNode as ChapterLinkNodeType } from '@/types/jsonld';
import { getNodeLabelClasses, getNodeTypeDisplayName } from '@/lib/editor/nodeColors';

export interface ChapterLinkNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  onChapterSelect?: ((chapterId: string) => void) | undefined;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chapterLink: {
      /**
       * Insert a chapter link node
       */
      insertChapterLink: (attributes: Partial<ChapterLinkNodeType>) => ReturnType;
      /**
       * Update a chapter link node
       */
      updateChapterLink: (attributes: Partial<ChapterLinkNodeType>) => ReturnType;
    };
  }
}

export const ChapterLinkNode = Node.create<ChapterLinkNodeOptions>({
  name: 'chapterLink',

  addOptions(): ChapterLinkNodeOptions {
    return {
      HTMLAttributes: {},
      onChapterSelect: undefined,
    };
  },

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      chapterId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chapter-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.chapterId) {
            return {};
          }
          return {
            'data-chapter-id': attributes.chapterId,
          };
        },
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.title) {
            return {};
          }
          return {
            'data-title': attributes.title,
          };
        },
      },
      order: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const order = element.getAttribute('data-order');
          return order ? parseInt(order, 10) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (attributes.order === null || attributes.order === undefined) {
            return {};
          }
          return {
            'data-order': attributes.order.toString(),
          };
        },
      },
      epubId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-epub-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.epubId) {
            return {};
          }
          return {
            'data-epub-id': attributes.epubId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="chapterLink"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const title = (HTMLAttributes.title as string) || 'Chapter';
    const order = HTMLAttributes.order as number | null | undefined;
    const displayText = order !== null && order !== undefined 
      ? `Chapter ${order}: ${title}`
      : title;
    const nodeType = 'chapterLink';
    const labelClasses = getNodeLabelClasses(nodeType);
    const labelText = getNodeTypeDisplayName(nodeType);

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': nodeType,
        class: `${nodeType}-node inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:opacity-80`,
        style: 'background-color: rgb(224 242 254); color: rgb(30 64 175);',
      }),
      [
        ['span', { class: labelClasses }, labelText],
        displayText,
      ],
    ];
  },

  addCommands() {
    return {
      insertChapterLink:
        (attributes: Partial<ChapterLinkNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateChapterLink:
        (attributes: Partial<ChapterLinkNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

