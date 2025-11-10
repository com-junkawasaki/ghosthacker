/**
 * Canvas と JSON-LD の変換ユーティリティ
 * 
 * React Flow ノード/エッジ ↔ JSON-LD グラフの双方向変換
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 * 
 * Note: File I/O operations are handled via Server Actions (see canvas-actions.ts).
 * This module only provides conversion functions that can be used on both client and server.
 */
import type { Node as RFNode, Edge as RFEdge } from '@reactflow/core';
import type { NodeData } from '@/pipeline/node-types';
export interface JsonLdDocument {
  '@context'?: Record<string, unknown>;
  '@graph'?: unknown[];
  '@id'?: string;
  '@type'?: string | string[];
  [key: string]: unknown;
}

export interface CanvasJsonLd extends JsonLdDocument {
  '@id': string;
  '@type': 'gh:Canvas';
  'gh:has_node': CanvasNodeJsonLd[];
  'gh:has_edge': CanvasEdgeJsonLd[];
  'prov:generatedAtTime'?: string;
}

export interface CanvasNodeJsonLd {
  '@id': string;
  '@type': 'gh:PipelineNode' | 'gh:CharacterNode' | 'gh:EpisodeNode';
  'gh:node_type': string;
  'gh:node_label': string;
  'gh:position_x'?: number;
  'gh:position_y'?: number;
  'gh:config'?: Record<string, unknown>;
  'gh:data'?: Record<string, unknown>;
  'gh:depends_on'?: Array<{ '@id': string }>;
  'gh:has_character'?: { '@id': string };
  'gh:has_episode'?: { '@id': string };
  'gh:route'?: string;
}

export interface CanvasEdgeJsonLd {
  '@id': string;
  '@type': 'gh:CanvasEdge';
  'gh:source': { '@id': string };
  'gh:target': { '@id': string };
  'gh:edge_type'?: string;
  'gh:edge_label'?: string;
}

/**
 * React Flow ノード/エッジを JSON-LD に変換
 */
export function canvasToJsonLd(
  nodes: RFNode<NodeData>[],
  edges: RFEdge[]
): CanvasJsonLd {
  const canvasNodes: CanvasNodeJsonLd[] = nodes.map(node => {
    const baseNode: CanvasNodeJsonLd = {
      '@id': `node:${node.id}`,
      '@type': getNodeType(node.data.type),
      'gh:node_type': node.data.type,
      'gh:node_label': node.data.label || node.id,
      'gh:position_x': node.position.x,
      'gh:position_y': node.position.y,
      'gh:config': node.data.config || {},
      'gh:data': node.data,
    };

    // PipelineNode 固有のプロパティ
    if (node.data.type !== 'CharacterNode' && node.data.type !== 'EpisodeNode') {
      if (node.data.route) {
        baseNode['gh:route'] = node.data.route;
      }
      if (node.data.dependsOn && node.data.dependsOn.length > 0) {
        baseNode['gh:depends_on'] = node.data.dependsOn.map(dep => ({
          '@id': `node:${dep}`,
        }));
      }
    }

    // CharacterNode 固有のプロパティ
    if (node.data.type === 'CharacterNode' && node.data.characterId) {
      baseNode['gh:has_character'] = { '@id': `character:${node.data.characterId}` };
    }

    // EpisodeNode 固有のプロパティ
    if (node.data.type === 'EpisodeNode' && node.data.episodeId) {
      baseNode['gh:has_episode'] = { '@id': `episode:${node.data.episodeId}` };
    }

    return baseNode;
  });

  const canvasEdges: CanvasEdgeJsonLd[] = edges.map(edge => ({
    '@id': `edge:${edge.id}`,
    '@type': 'gh:CanvasEdge',
    'gh:source': { '@id': `node:${edge.source}` },
    'gh:target': { '@id': `node:${edge.target}` },
    'gh:edge_type': edge.type || 'default',
    'gh:edge_label': edge.label || undefined,
  }));

  return {
    '@context': {
      '@base': 'https://ghosthacker.gftd.co.jp/',
      '@vocab': 'https://ghosthacker.gftd.co.jp/ontology#',
      'gh': 'https://ghosthacker.gftd.co.jp/ontology#',
      'prov': 'http://www.w3.org/ns/prov#',
    },
    '@id': 'canvas:ghost-hacker-producer',
    '@type': 'gh:Canvas',
    'gh:has_node': canvasNodes,
    'gh:has_edge': canvasEdges,
    'prov:generatedAtTime': new Date().toISOString(),
  };
}

/**
 * JSON-LD を React Flow ノード/エッジに変換
 */
export function jsonLdToCanvas(
  jsonLd: CanvasJsonLd
): { nodes: RFNode<NodeData>[]; edges: RFEdge[] } {
  const nodes: RFNode<NodeData>[] = jsonLd['gh:has_node'].map(nodeJsonLd => {
    const nodeId = nodeJsonLd['@id'].replace('node:', '');
    
    const nodeData: NodeData = {
      type: nodeJsonLd['gh:node_type'],
      label: nodeJsonLd['gh:node_label'],
      config: nodeJsonLd['gh:config'] || {},
      ...(nodeJsonLd['gh:data'] || {}),
    };

    // PipelineNode 固有のプロパティ
    if (nodeJsonLd['@type'] === 'gh:PipelineNode') {
      if (nodeJsonLd['gh:route']) {
        nodeData.route = nodeJsonLd['gh:route'];
      }
      if (nodeJsonLd['gh:depends_on']) {
        nodeData.dependsOn = nodeJsonLd['gh:depends_on'].map(dep => 
          dep['@id'].replace('node:', '')
        );
      }
    }

    // CharacterNode 固有のプロパティ
    if (nodeJsonLd['@type'] === 'gh:CharacterNode' && nodeJsonLd['gh:has_character']) {
      nodeData.characterId = nodeJsonLd['gh:has_character']['@id'].replace('character:', '');
    }

    // EpisodeNode 固有のプロパティ
    if (nodeJsonLd['@type'] === 'gh:EpisodeNode' && nodeJsonLd['gh:has_episode']) {
      nodeData.episodeId = nodeJsonLd['gh:has_episode']['@id'].replace('episode:', '');
    }

    return {
      id: nodeId,
      type: nodeJsonLd['gh:node_type'],
      position: {
        x: nodeJsonLd['gh:position_x'] || 0,
        y: nodeJsonLd['gh:position_y'] || 0,
      },
      data: nodeData,
    } as RFNode<NodeData>;
  });

  const edges: RFEdge[] = jsonLd['gh:has_edge'].map(edgeJsonLd => ({
    id: edgeJsonLd['@id'].replace('edge:', ''),
    source: edgeJsonLd['gh:source']['@id'].replace('node:', ''),
    target: edgeJsonLd['gh:target']['@id'].replace('node:', ''),
    type: edgeJsonLd['gh:edge_type'] || 'default',
    label: edgeJsonLd['gh:edge_label'],
  }));

  return { nodes, edges };
}

/**
 * @deprecated Use saveCanvasToJsonLdAction from '@/app/(producer)/canvas/canvas-actions' instead.
 * File I/O operations should be handled via Server Actions.
 */
export function saveCanvasToJsonLd(
  nodes: RFNode<NodeData>[],
  edges: RFEdge[],
  filename: string = 'canvas.jsonld'
): void {
  console.warn('saveCanvasToJsonLd is deprecated. Use saveCanvasToJsonLdAction from canvas-actions.ts instead.');
  throw new Error('saveCanvasToJsonLd is deprecated. Use saveCanvasToJsonLdAction from canvas-actions.ts instead.');
}

/**
 * @deprecated Use loadCanvasFromJsonLdAction from '@/app/(producer)/canvas/canvas-actions' instead.
 * File I/O operations should be handled via Server Actions.
 */
export function loadCanvasFromJsonLd(
  filename: string = 'canvas.jsonld'
): { nodes: RFNode<NodeData>[]; edges: RFEdge[] } | null {
  console.warn('loadCanvasFromJsonLd is deprecated. Use loadCanvasFromJsonLdAction from canvas-actions.ts instead.');
  return null;
}

/**
 * ノードタイプから JSON-LD タイプを取得
 */
function getNodeType(nodeType: string): 'gh:PipelineNode' | 'gh:CharacterNode' | 'gh:EpisodeNode' {
  if (nodeType === 'CharacterNode') {
    return 'gh:CharacterNode';
  }
  if (nodeType === 'EpisodeNode') {
    return 'gh:EpisodeNode';
  }
  return 'gh:PipelineNode';
}

