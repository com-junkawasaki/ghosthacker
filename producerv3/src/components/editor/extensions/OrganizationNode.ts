/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/organization-node-extension
 * 
 * Organization/Companyノード拡張
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { OrganizationNode as OrganizationNodeType, CompanyNode } from '@/types/jsonld';
import { getNodeClasses, getNodeLabelClasses, getNodeTypeDisplayName } from '@/lib/editor/nodeColors';
import { sanitizeNodeAttributes } from '@/lib/editor/sanitizeAttributes';

export interface OrganizationNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    organization: {
      insertOrganization: (attributes: Partial<OrganizationNodeType>) => ReturnType;
      updateOrganization: (attributes: Partial<OrganizationNodeType>) => ReturnType;
    };
    company: {
      insertCompany: (attributes: Partial<CompanyNode>) => ReturnType;
      updateCompany: (attributes: Partial<CompanyNode>) => ReturnType;
    };
  }
}

export const OrganizationNode = Node.create<OrganizationNodeOptions>({
  name: 'organization',

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
      organizationId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-organization-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.organizationId) {
            return {};
          }
          return {
            'data-organization-id': attributes.organizationId,
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
      description: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-description'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.description) {
            return {};
          }
          return {
            'data-description': attributes.description,
          };
        },
      },
      founder: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const founder = element.getAttribute('data-founder');
          return founder ? { '@id': founder } : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.founder) {
            return {};
          }
          const founderId =
            typeof attributes.founder === 'object' && '@id' in attributes.founder
              ? attributes.founder['@id']
              : attributes.founder;
          return {
            'data-founder': founderId,
          };
        },
      },
      companyType: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-company-type'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.companyType) {
            return {};
          }
          return {
            'data-company-type': attributes.companyType,
          };
        },
      },
      infraNote: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-infra-note'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.infraNote) {
            return {};
          }
          return {
            'data-infra-note': attributes.infraNote,
          };
        },
      },
      operationalNote: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-operational-note'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.operationalNote) {
            return {};
          }
          return {
            'data-operational-note': attributes.operationalNote,
          };
        },
      },
      securityNote: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-security-note'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.securityNote) {
            return {};
          }
          return {
            'data-security-note': attributes.securityNote,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="organization"]',
      },
      {
        tag: 'div[data-type="company"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }: { HTMLAttributes: Record<string, unknown>; node?: unknown }) {
    const nodeType = (HTMLAttributes['data-type'] as string) || 'organization';
    const name = (HTMLAttributes.name as string) || (HTMLAttributes.organizationId as string) || 'Organization';
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
    
    return [
      'div',
      sanitizedAttrs,
      [
        ['div', { class: 'flex items-center gap-2 mb-2' }, [
          ['span', { class: labelClasses }, labelText],
          ['span', { class: 'font-semibold flex-1' }, name],
        ]],
        ['div', { class: 'node-content' }, 0], // 0 = 子ノードをここに挿入
      ],
    ];
  },

  addCommands() {
    return {
      insertOrganization:
        (attributes: Partial<OrganizationNodeType>) =>
        ({ state, dispatch }: CommandProps) => {
          try {
            // ts-patternを使用して型安全にattributesをサニタイズ
            // ビルド時に型チェック可能で、配列やオブジェクトを適切に変換
            const sanitizedAttributes = sanitizeNodeAttributes(attributes);
            
            const { schema } = state;
            const paragraphNodeType = schema.nodes.paragraph;
            if (!paragraphNodeType) {
              console.error('Paragraph node type not found in schema');
              return false;
            }
            const paragraphNode = paragraphNodeType.create();
            const organizationNodeType = schema.nodes[this.name];
            if (!organizationNodeType) {
              console.error(`Organization node type "${this.name}" not found in schema`);
              return false;
            }
            // サニタイズされたattributesを使用（型安全）
            const organizationNode = organizationNodeType.create(
              { ...sanitizedAttributes, 'data-type': 'organization' },
              [paragraphNode]
            );
            
            if (dispatch) {
              const { selection } = state;
              const tr = state.tr.insert(selection.from, organizationNode);
              dispatch(tr);
            }
            
            return true;
          } catch (error) {
            console.error('Error inserting organization node:', error, 'Attributes:', attributes);
            return false;
          }
        },
      updateOrganization:
        (attributes: Partial<OrganizationNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
      insertCompany:
        (attributes: Partial<CompanyNode>) =>
        ({ state, dispatch }: CommandProps) => {
          try {
            // ts-patternを使用して型安全にattributesをサニタイズ
            // ビルド時に型チェック可能で、配列やオブジェクトを適切に変換
            const sanitizedAttributes = sanitizeNodeAttributes(attributes);
            
            const { schema } = state;
            const paragraphNodeType = schema.nodes.paragraph;
            if (!paragraphNodeType) {
              console.error('Paragraph node type not found in schema');
              return false;
            }
            const paragraphNode = paragraphNodeType.create();
            const companyNodeType = schema.nodes.company;
            if (!companyNodeType) {
              console.error('Company node type not found in schema');
              return false;
            }
            // サニタイズされたattributesを使用（型安全）
            const companyNode = companyNodeType.create(
              { ...sanitizedAttributes, 'data-type': 'company' },
              [paragraphNode]
            );
            
            if (dispatch) {
              const { selection } = state;
              const tr = state.tr.insert(selection.from, companyNode);
              dispatch(tr);
            }
            
            return true;
          } catch (error) {
            console.error('Error inserting company node:', error, 'Attributes:', attributes);
            return false;
          }
        },
      updateCompany:
        (attributes: Partial<CompanyNode>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

