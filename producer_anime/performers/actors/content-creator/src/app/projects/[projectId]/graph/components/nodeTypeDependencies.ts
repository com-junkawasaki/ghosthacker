/**
 * Node Type Dependencies
 * ノードタイプごとのコンテクストレイヤー依存関係定義
 * 
 * 既存のデータ設計に統合するため、TypeScript設定ファイルとして管理
 */

import { StoryElementNodeType, NodeTypeMetadata } from './types';

/**
 * ノードタイプごとのデフォルト依存関係定義
 */
export const NODE_TYPE_DEPENDENCIES: Record<StoryElementNodeType, NodeTypeMetadata> = {
  // ログライン
  logline: {
    defaultContextLayers: ['logline-layer'],
    requiredContextLayers: [],
    parentNodeTypes: [],
    childNodeTypes: ['story'],
    metadata: {
      label: 'ログライン',
      description: 'ストーリーの核心を1-2文で表現',
    },
  },

  // ストーリー
  story: {
    defaultContextLayers: ['story-layer'],
    requiredContextLayers: ['logline-layer'],
    parentNodeTypes: ['logline'],
    childNodeTypes: ['beat', 'scene', 'event'],
    metadata: {
      label: 'ストーリー',
      description: '物語の全体構造',
    },
  },

  // 世界観
  worldview: {
    defaultContextLayers: ['worldview-layer'],
    requiredContextLayers: [],
    parentNodeTypes: [],
    childNodeTypes: ['character', 'background', 'timeline'],
    metadata: {
      label: '世界観',
      description: '物語の世界設定',
    },
  },

  // キャラクター
  character: {
    defaultContextLayers: ['story-layer', 'worldview-layer'],
    requiredContextLayers: [],
    parentNodeTypes: ['story', 'worldview'],
    childNodeTypes: ['costume'],
    metadata: {
      label: 'キャラクター',
      description: '登場人物',
    },
  },

  // シーン
  scene: {
    defaultContextLayers: ['story-layer', 'worldview-layer'],
    requiredContextLayers: ['story-layer'],
    parentNodeTypes: ['story'],
    childNodeTypes: ['cut', 'costume', 'camera-angle'],
    metadata: {
      label: 'シーン',
      description: '物語の場面',
    },
  },

  // カット
  cut: {
    defaultContextLayers: ['story-layer', 'scene-layer'],
    requiredContextLayers: ['scene-layer'],
    parentNodeTypes: ['scene'],
    childNodeTypes: ['camera-angle'],
    metadata: {
      label: 'カット',
      description: 'シーン内の連続したショット',
    },
  },

  // 服装
  costume: {
    defaultContextLayers: ['scene-layer', 'character-layer'],
    requiredContextLayers: [],
    parentNodeTypes: ['scene', 'character'],
    childNodeTypes: [],
    metadata: {
      label: '服装',
      description: 'キャラクターの服装',
    },
  },

  // カメラアングル
  'camera-angle': {
    defaultContextLayers: ['cut-layer', 'scene-layer'],
    requiredContextLayers: [],
    parentNodeTypes: ['cut', 'scene'],
    childNodeTypes: [],
    metadata: {
      label: 'カメラアングル',
      description: 'カメラの視点と角度',
    },
  },

  // ビート（既存）
  beat: {
    defaultContextLayers: ['story-layer'],
    requiredContextLayers: ['story-layer'],
    parentNodeTypes: ['story'],
    childNodeTypes: [],
    metadata: {
      label: 'ビート',
      description: 'ストーリーの最小単位',
    },
  },

  // 背景（既存）
  background: {
    defaultContextLayers: ['worldview-layer'],
    requiredContextLayers: [],
    parentNodeTypes: ['worldview'],
    childNodeTypes: [],
    metadata: {
      label: '背景',
      description: 'キャラクターの背景設定',
    },
  },

  // 時間軸（既存）
  timeline: {
    defaultContextLayers: ['worldview-layer'],
    requiredContextLayers: [],
    parentNodeTypes: ['worldview'],
    childNodeTypes: [],
    metadata: {
      label: '時間軸',
      description: '物語の時間的流れ',
    },
  },

  // イベント（既存）
  event: {
    defaultContextLayers: ['story-layer'],
    requiredContextLayers: ['story-layer'],
    parentNodeTypes: ['story'],
    childNodeTypes: [],
    metadata: {
      label: 'イベント',
      description: '物語の出来事',
    },
  },

  // コンテキスト（既存）
  context: {
    defaultContextLayers: [],
    requiredContextLayers: [],
    parentNodeTypes: [],
    childNodeTypes: [],
    metadata: {
      label: 'コンテキスト',
      description: 'JSON-LDコンテキスト定義',
    },
  },

  // プロセス（既存）
  process: {
    defaultContextLayers: [],
    requiredContextLayers: [],
    parentNodeTypes: [],
    childNodeTypes: [],
    metadata: {
      label: 'プロセス',
      description: '自動生成プロセス',
    },
  },
};

/**
 * ノードタイプのメタデータを取得
 */
export function getNodeTypeMetadata(nodeType: StoryElementNodeType): NodeTypeMetadata {
  return NODE_TYPE_DEPENDENCIES[nodeType] || {
    defaultContextLayers: [],
    requiredContextLayers: [],
    parentNodeTypes: [],
    childNodeTypes: [],
    metadata: {},
  };
}

/**
 * コンテクストレイヤー名からレイヤーIDを解決
 * 実際のコンテクストノードのIDを取得する必要がある場合は、nodes配列から検索
 */
export function resolveContextLayerId(
  layerName: string,
  contextNodes: Array<{ id: string; label: string; data: { isContext?: boolean } }>
): string | null {
  // レイヤー名のパターンマッチング
  const normalizedName = layerName.toLowerCase().replace(/-layer$/, '');
  
  // レイヤー名のマッピング（日本語対応）
  const layerNameMap: Record<string, string[]> = {
    'logline': ['ログライン', 'logline'],
    'story': ['ストーリー', 'story', '物語'],
    'worldview': ['世界観', 'worldview', 'world'],
    'character': ['キャラクター', 'character', 'char'],
    'scene': ['シーン', 'scene'],
    'cut': ['カット', 'cut'],
    'costume': ['服装', 'costume'],
    'camera-angle': ['カメラアングル', 'camera', 'angle'],
  };
  
  // マッピングから検索キーワードを取得
  const searchKeywords = layerNameMap[normalizedName] || [normalizedName];
  
  // コンテクストノードから検索
  const contextNode = contextNodes.find(node => {
    if (!node.data.isContext) return false;
    const nodeLabel = node.label.toLowerCase();
    
    // 完全一致または部分一致をチェック
    for (const keyword of searchKeywords) {
      if (nodeLabel.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(nodeLabel)) {
        return true;
      }
    }
    
    // レイヤー名が直接含まれているかチェック
    if (nodeLabel.includes(normalizedName) || normalizedName.includes(nodeLabel)) {
      return true;
    }
    
    return false;
  });
  
  return contextNode?.id || null;
}

/**
 * ノードタイプに基づいてデフォルトのコンテクストレイヤーIDを取得
 */
export function getDefaultContextLayerIds(
  nodeType: StoryElementNodeType,
  contextNodes: Array<{ id: string; label: string; data: { isContext?: boolean } }>
): string[] {
  const metadata = getNodeTypeMetadata(nodeType);
  const layerIds: string[] = [];
  
  for (const layerName of metadata.defaultContextLayers) {
    const layerId = resolveContextLayerId(layerName, contextNodes);
    if (layerId) {
      layerIds.push(layerId);
    }
  }
  
  return layerIds;
}

/**
 * 必須のコンテクストレイヤーが存在するかチェック
 */
export function validateRequiredContextLayers(
  nodeType: StoryElementNodeType,
  contextNodes: Array<{ id: string; label: string; data: { isContext?: boolean } }>
): { valid: boolean; missingLayers: string[] } {
  const metadata = getNodeTypeMetadata(nodeType);
  const missingLayers: string[] = [];
  
  for (const layerName of metadata.requiredContextLayers) {
    const layerId = resolveContextLayerId(layerName, contextNodes);
    if (!layerId) {
      missingLayers.push(layerName);
    }
  }
  
  return {
    valid: missingLayers.length === 0,
    missingLayers,
  };
}

