/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/character-node-extension
 * 
 * Characterノード拡張
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { CharacterNode as CharacterNodeType } from '@/types/jsonld';
import { getNodeClasses, getNodeLabelClasses, getNodeTypeDisplayName } from '@/lib/editor/nodeColors';
import { sanitizeNodeAttributes } from '@/lib/editor/sanitizeAttributes';

export interface CharacterNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    character: {
      /**
       * Insert a character node
       */
      insertCharacter: (attributes: Partial<CharacterNodeType>) => ReturnType;
      /**
       * Update a character node
       */
      updateCharacter: (attributes: Partial<CharacterNodeType>) => ReturnType;
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
      callsign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-callsign'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.callsign) {
            return {};
          }
          return {
            'data-callsign': attributes.callsign,
          };
        },
      },
      description: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-description'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.description) {
            return {};
          }
          return {
            'data-description': attributes.description,
          };
        },
      },
      age: {
        default: null,
        parseHTML: (element) => {
          const age = element.getAttribute('data-age');
          return age ? parseInt(age, 10) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.age) {
            return {};
          }
          return {
            'data-age': attributes.age.toString(),
          };
        },
      },
      occupation: {
        default: null,
        parseHTML: (element) => {
          const occupation = element.getAttribute('data-occupation');
          return occupation ? JSON.parse(occupation) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.occupation) {
            return {};
          }
          return {
            'data-occupation': JSON.stringify(attributes.occupation),
          };
        },
      },
      role: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-role'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.role) {
            return {};
          }
          return {
            'data-role': attributes.role,
          };
        },
      },
      virtue: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-virtue'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.virtue) {
            return {};
          }
          return {
            'data-virtue': attributes.virtue,
          };
        },
      },
      alternateName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alternate-name'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.alternateName) {
            return {};
          }
          return {
            'data-alternate-name': attributes.alternateName,
          };
        },
      },
      imageBase64: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-base64'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.imageBase64) {
            return {};
          }
          return {
            'data-image-base64': attributes.imageBase64,
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

  renderHTML({ HTMLAttributes, node }: { HTMLAttributes: Record<string, unknown>; node?: unknown }) {
    const name = (HTMLAttributes.name as string) || (HTMLAttributes.characterId as string) || 'Character';
    const imageBase64 = HTMLAttributes.imageBase64 as string | undefined;
    const nodeType = 'character';
    const nodeClasses = getNodeClasses(nodeType);
    const labelClasses = getNodeLabelClasses(nodeType);
    const labelText = getNodeTypeDisplayName(nodeType);
    
    // mergeAttributes の結果を検証し、配列が含まれていないことを確認
    const mergedAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': nodeType,
      class: nodeClasses,
    });
    
    // class が配列の場合は文字列に変換
    if (Array.isArray(mergedAttrs.class)) {
      mergedAttrs.class = mergedAttrs.class.join(' ');
    }
    
    // 配列が含まれていないことを確認（renderSpec が配列を期待しないため）
    const sanitizedAttrs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(mergedAttrs)) {
      if (Array.isArray(value)) {
        // 配列の場合は文字列に変換（class 属性など）
        sanitizedAttrs[key] = value.join(' ');
      } else {
        sanitizedAttrs[key] = value;
      }
    }
    
    const children: unknown[] = [
      ['div', { class: 'flex items-center gap-2 mb-2' }, [
        ['span', { class: labelClasses }, labelText],
        ['span', { class: 'font-semibold flex-1' }, name],
      ]],
    ];
    
    // 画像が存在する場合は表示
    if (imageBase64) {
      children.push([
        'img',
        {
          src: imageBase64,
          alt: name,
          class: 'max-w-full h-auto rounded mb-2',
          style: 'max-width: 300px; max-height: 300px; object-fit: contain;',
        },
      ]);
    }
    
    children.push(['div', { class: 'node-content' }, 0]); // 0 = 子ノードをここに挿入
    
    return [
      'div',
      sanitizedAttrs,
      children,
    ];
  },

  addCommands() {
    return {
      insertCharacter:
        (attributes: Partial<CharacterNodeType>) =>
        ({ commands }: CommandProps) => {
          // ts-patternを使用して型安全にattributesをサニタイズ
          // ビルド時に型チェック可能で、配列やオブジェクトを適切に変換
          const sanitizedAttributes = sanitizeNodeAttributes(attributes);
          
          // Use insertContent to avoid text node creation errors
          // Tiptap's insertContent handles node creation more safely
          // Block Container Node requires at least one paragraph child
          return commands.insertContent({
            type: this.name,
            attrs: sanitizedAttributes,
            content: [{ type: 'paragraph' }],
          });
        },
      updateCharacter:
        (attributes: Partial<CharacterNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

