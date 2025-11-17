/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/organization-node-extension
 * 
 * Organization/Companyノード拡張
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { OrganizationNode as OrganizationNodeType, CompanyNode } from '@/types/jsonld';

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

  group: 'inline',

  inline: true,

  atom: true,

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
        tag: 'span[data-type="organization"]',
      },
      {
        tag: 'span[data-type="company"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const nodeType = HTMLAttributes['data-type'] || 'organization';
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': nodeType,
        class: `${nodeType}-node inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 cursor-pointer hover:bg-green-200`,
      }),
      HTMLAttributes.name || HTMLAttributes.organizationId || 'Organization',
    ];
  },

  addCommands() {
    return {
      insertOrganization:
        (attributes: Partial<OrganizationNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: { ...attributes, 'data-type': 'organization' },
          });
        },
      updateOrganization:
        (attributes: Partial<OrganizationNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
      insertCompany:
        (attributes: Partial<CompanyNode>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: { ...attributes, 'data-type': 'company' },
          });
        },
      updateCompany:
        (attributes: Partial<CompanyNode>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

