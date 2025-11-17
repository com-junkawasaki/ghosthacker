/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/story-node-extension
 * 
 * Story構造ノード拡張（Episode/Scene/Arc/Motif/Season/Timeline）
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import {
  EpisodeNode as EpisodeNodeType,
  SceneNode as SceneNodeType,
  ArcNode as ArcNodeType,
  MotifNode as MotifNodeType,
  SeasonNode as SeasonNodeType,
  TimelineNode as TimelineNodeType,
} from '@/types/jsonld';

export interface StoryNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    episode: {
      insertEpisode: (attributes: Partial<EpisodeNodeType>) => ReturnType;
      updateEpisode: (attributes: Partial<EpisodeNodeType>) => ReturnType;
    };
    scene: {
      insertScene: (attributes: Partial<SceneNodeType>) => ReturnType;
      updateScene: (attributes: Partial<SceneNodeType>) => ReturnType;
    };
    arc: {
      insertArc: (attributes: Partial<ArcNodeType>) => ReturnType;
      updateArc: (attributes: Partial<ArcNodeType>) => ReturnType;
    };
    motif: {
      insertMotif: (attributes: Partial<MotifNodeType>) => ReturnType;
      updateMotif: (attributes: Partial<MotifNodeType>) => ReturnType;
    };
    season: {
      insertSeason: (attributes: Partial<SeasonNodeType>) => ReturnType;
      updateSeason: (attributes: Partial<SeasonNodeType>) => ReturnType;
    };
    timeline: {
      insertTimeline: (attributes: Partial<TimelineNodeType>) => ReturnType;
      updateTimeline: (attributes: Partial<TimelineNodeType>) => ReturnType;
    };
  }
}

const createStoryNode = (
  name: string,
  nodeType: string,
  bgColor: string,
  textColor: string
) => {
  return Node.create<StoryNodeOptions>({
    name,

    addOptions() {
      return {
        HTMLAttributes: {},
      };
    },

    group: 'inline',

    inline: true,

    atom: true,

    addAttributes() {
      const baseAttributes: Record<string, unknown> = {
        [`${name}Id`]: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}-id`),
          renderHTML: (attributes: Record<string, unknown>) => {
            const id = attributes[`${name}Id`];
            if (!id) {
              return {};
            }
            return {
              [`data-${name}-id`]: id,
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
      };

      // Episode固有の属性
      if (name === 'episode') {
        baseAttributes.episodeNumber = {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const num = element.getAttribute('data-episode-number');
            return num ? parseInt(num, 10) : null;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.episodeNumber) {
              return {};
            }
            return {
              'data-episode-number': attributes.episodeNumber.toString(),
            };
          },
        };
        baseAttributes.season = {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const season = element.getAttribute('data-season');
            return season ? { '@id': season } : null;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.season) {
              return {};
            }
            const seasonId =
              typeof attributes.season === 'object' && '@id' in attributes.season
                ? attributes.season['@id']
                : attributes.season;
            return {
              'data-season': seasonId,
            };
          },
        };
        baseAttributes.logline = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-logline'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.logline) {
              return {};
            }
            return {
              'data-logline': attributes.logline,
            };
          },
        };
      }

      // Arc固有の属性
      if (name === 'arc') {
        baseAttributes.phase = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-phase'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.phase) {
              return {};
            }
            return {
              'data-phase': attributes.phase,
            };
          },
        };
      }

      // Motif固有の属性
      if (name === 'motif') {
        baseAttributes.theme = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-theme'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.theme) {
              return {};
            }
            return {
              'data-theme': attributes.theme,
            };
          },
        };
      }

      // Season固有の属性
      if (name === 'season') {
        baseAttributes.theme = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-theme'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.theme) {
              return {};
            }
            return {
              'data-theme': attributes.theme,
            };
          },
        };
        baseAttributes.featuredThemes = {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const themes = element.getAttribute('data-featured-themes');
            return themes ? JSON.parse(themes) : null;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.featuredThemes) {
              return {};
            }
            return {
              'data-featured-themes': JSON.stringify(attributes.featuredThemes),
            };
          },
        };
      }

      // Scene固有の属性
      if (name === 'scene') {
        baseAttributes.sameAs = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-same-as'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.sameAs) {
              return {};
            }
            return {
              'data-same-as': attributes.sameAs,
            };
          },
        };
      }

      return baseAttributes;
    },

    parseHTML() {
      return [
        {
          tag: `span[data-type="${nodeType}"]`,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        'span',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-type': nodeType,
          class: `${nodeType}-node inline-flex items-center px-2 py-1 rounded ${bgColor} ${textColor} cursor-pointer hover:opacity-80`,
        }),
        HTMLAttributes.name || HTMLAttributes[`${name}Id`] || name.charAt(0).toUpperCase() + name.slice(1),
      ];
    },

    addCommands() {
      return {
        [`insert${name.charAt(0).toUpperCase() + name.slice(1)}`]:
          (attributes: Record<string, unknown>) =>
          ({ commands }: CommandProps) => {
            return commands.insertContent({
              type: this.name,
              attrs: attributes,
            });
          },
        [`update${name.charAt(0).toUpperCase() + name.slice(1)}`]:
          (attributes: Record<string, unknown>) =>
          ({ commands }: CommandProps) => {
            return commands.updateAttributes(this.name, attributes);
          },
      };
    },
  });
};

export const EpisodeNode = createStoryNode('episode', 'episode', 'bg-indigo-100', 'text-indigo-800');
export const SceneNode = createStoryNode('scene', 'scene', 'bg-pink-100', 'text-pink-800');
export const ArcNode = createStoryNode('arc', 'arc', 'bg-orange-100', 'text-orange-800');
export const MotifNode = createStoryNode('motif', 'motif', 'bg-teal-100', 'text-teal-800');
export const SeasonNode = createStoryNode('season', 'season', 'bg-red-100', 'text-red-800');
export const TimelineNode = createStoryNode('timeline', 'timeline', 'bg-cyan-100', 'text-cyan-800');

