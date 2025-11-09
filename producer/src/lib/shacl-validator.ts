/**
 * SHACL バリデーション（TypeScript）
 * 
 * ノード追加・更新時の自動バリデーション
 * ファイル保存前のバリデーション
 * 
 * 注意: 完全な SHACL バリデーションは TypeScript では限定的。
 * 本実装は基本的な構造チェックを提供する。
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 */
import type { CanvasNodeJsonLd, CanvasEdgeJsonLd, CanvasJsonLd } from './canvas-jsonld';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Canvas JSON-LD をバリデーション
 */
export function validateCanvasJsonLd(jsonLd: CanvasJsonLd): ValidationResult {
  const errors: ValidationError[] = [];

  // Canvas の基本構造チェック
  if (!jsonLd['@id']) {
    errors.push({
      path: '@id',
      message: 'Canvas must have @id',
      severity: 'error',
    });
  }

  if (jsonLd['@type'] !== 'gh:Canvas') {
    errors.push({
      path: '@type',
      message: 'Canvas must have @type = gh:Canvas',
      severity: 'error',
    });
  }

  // ノードのバリデーション
  if (jsonLd['gh:has_node']) {
    jsonLd['gh:has_node'].forEach((node, index) => {
      const nodeErrors = validateCanvasNode(node, `gh:has_node[${index}]`);
      errors.push(...nodeErrors);
    });
  }

  // エッジのバリデーション
  if (jsonLd['gh:has_edge']) {
    jsonLd['gh:has_edge'].forEach((edge, index) => {
      const edgeErrors = validateCanvasEdge(edge, `gh:has_edge[${index}]`);
      errors.push(...edgeErrors);
    });
  }

  // エッジの参照整合性チェック
  if (jsonLd['gh:has_node'] && jsonLd['gh:has_edge']) {
    const nodeIds = new Set(jsonLd['gh:has_node'].map(n => n['@id']));
    jsonLd['gh:has_edge'].forEach((edge, index) => {
      const sourceId = edge['gh:source']['@id'];
      const targetId = edge['gh:target']['@id'];
      
      if (!nodeIds.has(sourceId)) {
        errors.push({
          path: `gh:has_edge[${index}].gh:source`,
          message: `Source node ${sourceId} does not exist`,
          severity: 'error',
        });
      }
      
      if (!nodeIds.has(targetId)) {
        errors.push({
          path: `gh:has_edge[${index}].gh:target`,
          message: `Target node ${targetId} does not exist`,
          severity: 'error',
        });
      }
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Canvas ノードをバリデーション
 */
export function validateCanvasNode(
  node: CanvasNodeJsonLd,
  path: string = 'node'
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 必須プロパティチェック
  if (!node['@id']) {
    errors.push({
      path: `${path}.@id`,
      message: 'Node must have @id',
      severity: 'error',
    });
  }

  if (!node['@type']) {
    errors.push({
      path: `${path}.@type`,
      message: 'Node must have @type',
      severity: 'error',
    });
  }

  if (!node['gh:node_type']) {
    errors.push({
      path: `${path}.gh:node_type`,
      message: 'Node must have gh:node_type',
      severity: 'error',
    });
  }

  if (!node['gh:node_label']) {
    errors.push({
      path: `${path}.gh:node_label`,
      message: 'Node must have gh:node_label',
      severity: 'error',
    });
  }

  // タイプ固有のバリデーション
  if (node['@type'] === 'gh:CharacterNode') {
    if (!node['gh:has_character']) {
      errors.push({
        path: `${path}.gh:has_character`,
        message: 'CharacterNode must have gh:has_character',
        severity: 'error',
      });
    }
  }

  if (node['@type'] === 'gh:EpisodeNode') {
    if (!node['gh:has_episode']) {
      errors.push({
        path: `${path}.gh:has_episode`,
        message: 'EpisodeNode must have gh:has_episode',
        severity: 'error',
      });
    }
  }

  // 座標のチェック
  if (node['gh:position_x'] !== undefined && typeof node['gh:position_x'] !== 'number') {
    errors.push({
      path: `${path}.gh:position_x`,
      message: 'gh:position_x must be a number',
      severity: 'error',
    });
  }

  if (node['gh:position_y'] !== undefined && typeof node['gh:position_y'] !== 'number') {
    errors.push({
      path: `${path}.gh:position_y`,
      message: 'gh:position_y must be a number',
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Canvas エッジをバリデーション
 */
export function validateCanvasEdge(
  edge: CanvasEdgeJsonLd,
  path: string = 'edge'
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 必須プロパティチェック
  if (!edge['@id']) {
    errors.push({
      path: `${path}.@id`,
      message: 'Edge must have @id',
      severity: 'error',
    });
  }

  if (!edge['gh:source']) {
    errors.push({
      path: `${path}.gh:source`,
      message: 'Edge must have gh:source',
      severity: 'error',
    });
  }

  if (!edge['gh:target']) {
    errors.push({
      path: `${path}.gh:target`,
      message: 'Edge must have gh:target',
      severity: 'error',
    });
  }

  // 自己ループチェック（警告）
  if (edge['gh:source'] && edge['gh:target'] && 
      edge['gh:source']['@id'] === edge['gh:target']['@id']) {
    errors.push({
      path: `${path}`,
      message: 'Edge creates a self-loop',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * バリデーション結果をフォーマット
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return 'Validation passed';
  }

  const errorMessages = result.errors.map(err => 
    `[${err.severity.toUpperCase()}] ${err.path}: ${err.message}`
  );

  return errorMessages.join('\n');
}

