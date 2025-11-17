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
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': nodeType,
        class: nodeClasses,
      }),
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
          const { schema } = state;
          const paragraphNode = schema.nodes.paragraph.create();
          const organizationNode = schema.nodes[this.name].create(
            { ...attributes, 'data-type': 'organization' },
            [paragraphNode]
          );
          
          if (dispatch) {
            const { selection } = state;
            const tr = state.tr.insert(selection.from, organizationNode);
            dispatch(tr);
          }
          
          return true;
        },
      updateOrganization:
        (attributes: Partial<OrganizationNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
      insertCompany:
        (attributes: Partial<CompanyNode>) =>
        ({ state, dispatch }: CommandProps) => {
          const { schema } = state;
          const paragraphNode = schema.nodes.paragraph.create();
          const companyNode = schema.nodes[this.name].create(
            { ...attributes, 'data-type': 'company' },
            [paragraphNode]
          );
          
          if (dispatch) {
            const { selection } = state;
            const tr = state.tr.insert(selection.from, companyNode);
            dispatch(tr);
          }
          
          return true;
        },
      updateCompany:
        (attributes: Partial<CompanyNode>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

