/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/chapter-link-node-extension
 * 
 * ChapterLinkノード拡張 - 章へのリンクを本文に挿入可能にする
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { ChapterLinkNode as ChapterLinkNodeType } from '@/types/jsonld';

export interface ChapterLinkNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  onChapterSelect?: (chapterId: string) => void;
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

  addOptions() {
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

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'chapterLink',
        class: 'chapter-link-node inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200',
      }),
      displayText,
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

