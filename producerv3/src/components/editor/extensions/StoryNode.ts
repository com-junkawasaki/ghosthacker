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
  POVNode as POVNodeType,
  BeatNode as BeatNodeType,
} from '@/types/jsonld';
import { getNodeClasses, getNodeLabelClasses, getNodeTypeDisplayName } from '@/lib/editor/nodeColors';

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
    pov: {
      insertPOV: (attributes: Partial<POVNodeType>) => ReturnType;
      updatePOV: (attributes: Partial<POVNodeType>) => ReturnType;
    };
    beat: {
      insertBeat: (attributes: Partial<BeatNodeType>) => ReturnType;
      updateBeat: (attributes: Partial<BeatNodeType>) => ReturnType;
    };
  }
}

const createStoryNode = (
  name: string,
  nodeType: string,
  bgColor: string,
  textColor: string,
  isBlockContainer: boolean = false
) => {
  return Node.create<StoryNodeOptions>({
    name,

    addOptions() {
      return {
        HTMLAttributes: {},
      };
    },

    group: isBlockContainer ? 'block' : 'inline',

    inline: !isBlockContainer,

    content: isBlockContainer ? 'paragraph+' : undefined,

    atom: !isBlockContainer,

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

      // POV固有の属性
      if (name === 'pov') {
        baseAttributes.characterId = {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const charId = element.getAttribute('data-character-id');
            return charId ? { '@id': charId } : null;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.characterId) {
              return {};
            }
            const charId =
              typeof attributes.characterId === 'object' && '@id' in attributes.characterId
                ? attributes.characterId['@id']
                : attributes.characterId;
            return {
              'data-character-id': charId,
            };
          },
        };
        baseAttributes.perspectiveType = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-perspective-type'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.perspectiveType) {
              return {};
            }
            return {
              'data-perspective-type': attributes.perspectiveType,
            };
          },
        };
      }

      // Beat固有の属性
      if (name === 'beat') {
        baseAttributes.position = {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const pos = element.getAttribute('data-position');
            return pos ? parseInt(pos, 10) : null;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.position) {
              return {};
            }
            return {
              'data-position': attributes.position.toString(),
            };
          },
        };
        baseAttributes.sceneId = {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const sceneId = element.getAttribute('data-scene-id');
            return sceneId ? { '@id': sceneId } : null;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.sceneId) {
              return {};
            }
            const sceneId =
              typeof attributes.sceneId === 'object' && '@id' in attributes.sceneId
                ? attributes.sceneId['@id']
                : attributes.sceneId;
            return {
              'data-scene-id': sceneId,
            };
          },
        };
      }

      return baseAttributes;
    },

    parseHTML() {
      if (isBlockContainer) {
        return [
          {
            tag: `div[data-type="${nodeType}"]`,
          },
        ];
      }
      return [
        {
          tag: `span[data-type="${nodeType}"]`,
        },
      ];
    },

    renderHTML({ HTMLAttributes, node }) {
      const displayName = HTMLAttributes.name || HTMLAttributes[`${name}Id`] || name.charAt(0).toUpperCase() + name.slice(1);
      const nodeClasses = getNodeClasses(nodeType);
      const labelClasses = getNodeLabelClasses(nodeType);
      const labelText = getNodeTypeDisplayName(nodeType);
      
      if (isBlockContainer) {
        return [
          'div',
          mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
            'data-type': nodeType,
            class: nodeClasses,
          }),
          [
            ['div', { class: 'flex items-center gap-2 mb-2' }, [
              ['span', { class: labelClasses }, labelText],
              ['span', { class: 'font-semibold flex-1' }, displayName],
            ]],
            ['div', { class: 'node-content' }, 0], // 0 = 子ノードをここに挿入
          ],
        ];
      }
      
      return [
        'span',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-type': nodeType,
          class: `${nodeType}-node inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:opacity-80`,
          style: `background-color: ${bgColor.includes('bg-') ? 'var(--color-' + bgColor.replace('bg-', '').replace('-', '-') + ')' : bgColor}; color: ${textColor.includes('text-') ? 'var(--color-' + textColor.replace('text-', '').replace('-', '-') + ')' : textColor};`,
        }),
        [
          ['span', { class: labelClasses }, labelText],
          displayName,
        ],
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
export const POVNode = createStoryNode('pov', 'pov', 'bg-violet-100', 'text-violet-800');
export const BeatNode = createStoryNode('beat', 'beat', 'bg-amber-100', 'text-amber-800');

