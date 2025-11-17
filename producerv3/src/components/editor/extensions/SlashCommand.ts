/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/slash-command-extension
 * 
 * スラッシュコマンド拡張
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SlashCommandOptions {
  suggestion: {
    char: string;
    allowSpaces: boolean;
    allowedPrefixes: string[] | null;
    startOfLine: boolean;
    decorationTag: string;
    decorationClass: string;
    command: (props: { editor: unknown; range: { from: number; to: number }; props: Record<string, unknown> }) => void;
    items: (query: string) => Array<{ title: string; command: (props: { editor: unknown; range: { from: number; to: number } }) => void }>;
    render?: () => {
      onStart: (props: { items: unknown[]; command: unknown }) => void;
      onUpdate: (props: { items: unknown[]; command: unknown }) => void;
      onKeyDown: (props: { event: KeyboardEvent }) => boolean;
      onExit: () => void;
    };
  };
}

const SlashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        allowedPrefixes: [' '],
        startOfLine: false,
        decorationTag: 'span',
        decorationClass: 'slash-command',
        command: () => {},
        items: () => [],
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SlashCommandPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            return set;
          },
        },
        props: {
          decorations: (state) => {
            const { selection } = state;
            const { $from } = selection;
            const textBefore = $from.nodeBefore?.textContent || '';
            const textAfter = $from.textBetween(Math.max(0, $from.pos - 50), $from.pos);

            // スラッシュコマンドの検出
            const match = textAfter.match(/\/(\w*)$/);
            if (!match) {
              return DecorationSet.empty;
            }

            const query = match[1].toLowerCase();
            const items = this.options.suggestion.items(query);

            if (items.length === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            const from = $from.pos - query.length - 1;
            const to = $from.pos;

            decorations.push(
              Decoration.inline(from, to, {
                class: this.options.suggestion.decorationClass,
              })
            );

            return DecorationSet.create(state.doc, decorations);
          },
          handleKeyDown: (view, event) => {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            const textAfter = $from.textBetween(Math.max(0, $from.pos - 50), $from.pos);
            const match = textAfter.match(/\/(\w*)$/);

            if (!match) {
              return false;
            }

            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              // メニューのナビゲーションはSlashCommandMenuコンポーネントで処理
              return true;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              const query = match[1].toLowerCase();
              const items = this.options.suggestion.items(query);
              if (items.length > 0) {
                const range = {
                  from: $from.pos - query.length - 1,
                  to: $from.pos,
                };
                items[0].command({ editor: this.editor, range });
              }
              return true;
            }

            if (event.key === 'Escape') {
              // スラッシュコマンドをキャンセル
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

