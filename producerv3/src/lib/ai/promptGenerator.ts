/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-image-prompt
 * 
 * エディターコンテキストから画像生成プロンプトを生成するユーティリティ
 */

import type { EditorContext, ExtractedNode, MaskInfo } from '@/lib/editor/contextExtractor';

/**
 * プロンプト生成オプション
 */
export interface PromptGenerationOptions {
  includeSelectedNodes?: boolean;
  includeMaskedNodes?: boolean;
  includeMasks?: boolean;
  includeSelectedText?: boolean;
  style?: 'descriptive' | 'concise' | 'detailed';
}

/**
 * ノードタイプの日本語ラベル
 */
const NODE_TYPE_LABELS: Record<string, string> = {
  character: 'キャラクター',
  ghost: 'ゴースト',
  location: '場所',
  organization: '組織',
  company: '企業',
  technology: '技術',
  episode: 'エピソード',
  scene: 'シーン',
  arc: 'アーク',
  motif: 'モチーフ',
  season: 'シーズン',
  timeline: 'タイムライン',
  sourceRef: '参照',
  event: 'イベント',
  occupation: '職業',
  setting: '設定',
};

/**
 * Maskタイプの日本語ラベル
 */
const MASK_TYPE_LABELS: Record<string, string> = {
  emotion: '感情',
  theme: 'テーマ',
  context: 'コンテキスト',
  notes: 'ノート',
  relationship: '関係性',
  virtue: '美徳',
  anchoredTo: 'アンカー',
  emitsRepelsAvoids: '発散/反発/回避',
  phase: 'フェーズ',
  role: '役割',
};

/**
 * ノード情報をテキストに変換
 */
function nodeToText(node: ExtractedNode, style: 'descriptive' | 'concise' | 'detailed' = 'descriptive'): string {
  const typeLabel = NODE_TYPE_LABELS[node.type] || node.type;
  const name = node.name || 'Unknown';

  if (style === 'concise') {
    return `${typeLabel}: ${name}`;
  }

  const parts: string[] = [`${typeLabel}「${name}」`];

  if (style === 'detailed') {
    // 属性情報を追加
    const attrs = node.attributes;
    
    if (attrs.description) {
      parts.push(`説明: ${attrs.description}`);
    }
    if (attrs.role) {
      parts.push(`役割: ${attrs.role}`);
    }
    if (attrs.virtue) {
      parts.push(`美徳: ${attrs.virtue}`);
    }
    if (attrs.age) {
      parts.push(`年齢: ${attrs.age}`);
    }
    if (attrs.occupation) {
      const occupation = Array.isArray(attrs.occupation)
        ? attrs.occupation.join(', ')
        : attrs.occupation;
      parts.push(`職業: ${occupation}`);
    }
  }

  return parts.join(', ');
}

/**
 * Mask情報をテキストに変換
 */
function maskToText(mask: MaskInfo): string {
  const maskLabel = MASK_TYPE_LABELS[mask.type] || mask.type;
  
  if (mask.attributes) {
    const attrs = mask.attributes;
    const details: string[] = [];

    switch (mask.type) {
      case 'emotion':
        if (attrs.targetEmotions) {
          const emotions = Object.entries(attrs.targetEmotions as Record<string, number>)
            .filter(([, score]) => score && score > 0)
            .map(([emotion]) => emotion);
          if (emotions.length > 0) {
            details.push(`感情: ${emotions.join(', ')}`);
          }
        }
        break;
      case 'theme':
        if (attrs.theme) {
          details.push(`テーマ: ${attrs.theme}`);
        }
        if (attrs.featuredThemes) {
          const themes = Array.isArray(attrs.featuredThemes)
            ? attrs.featuredThemes.join(', ')
            : attrs.featuredThemes;
          details.push(`主要テーマ: ${themes}`);
        }
        break;
      case 'virtue':
        if (attrs.virtue) {
          details.push(`美徳: ${attrs.virtue}`);
        }
        break;
      case 'role':
        if (attrs.role) {
          details.push(`役割: ${attrs.role}`);
        }
        break;
      case 'phase':
        if (attrs.phase) {
          details.push(`フェーズ: ${attrs.phase}`);
        }
        break;
    }

    if (details.length > 0) {
      return `${maskLabel} (${details.join(', ')})`;
    }
  }

  return maskLabel;
}

/**
 * エディターコンテキストから画像生成プロンプトを生成
 */
export function generateImagePrompt(
  context: EditorContext,
  options: PromptGenerationOptions = {}
): string {
  const {
    includeSelectedNodes = true,
    includeMaskedNodes = true,
    includeMasks = true,
    includeSelectedText = true,
    style = 'descriptive',
  } = options;

  const promptParts: string[] = [];

  // 選択されたノード情報を追加
  if (includeSelectedNodes && context.selectedNodes.length > 0) {
    const nodeTexts = context.selectedNodes.map((node) => nodeToText(node, style));
    promptParts.push(`選択された要素: ${nodeTexts.join('; ')}`);
  }

  // Mask範囲のノード情報を追加
  if (includeMaskedNodes && context.maskedNodes.length > 0) {
    const maskedNodeTexts = context.maskedNodes.map((node) => nodeToText(node, style));
    promptParts.push(`マスクされた要素: ${maskedNodeTexts.join('; ')}`);
  }

  // Mask情報を追加
  if (includeMasks && context.masks.length > 0) {
    const maskTexts = context.masks.map((mask) => maskToText(mask));
    promptParts.push(`マスク情報: ${maskTexts.join('; ')}`);
  }

  // 選択されたテキストを追加
  if (includeSelectedText && context.selectedText.trim()) {
    const text = context.selectedText.trim();
    if (text.length > 0 && text.length < 500) {
      // 長すぎるテキストは省略
      promptParts.push(`テキスト: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
    }
  }

  // プロンプトを組み立て
  let prompt = promptParts.join('\n');

  // プロンプトが空の場合はデフォルトメッセージ
  if (!prompt.trim()) {
    prompt = 'このコンテキストに基づいた画像を生成してください';
  } else {
    // 画像生成用のプロンプトとして整形
    prompt = `以下の情報を基に画像を生成してください:\n${prompt}`;
  }

  return prompt;
}

/**
 * プロンプトを最適化（画像生成API用に調整）
 */
export function optimizePromptForImageGeneration(prompt: string): string {
  // 不要な改行や空白を整理
  let optimized = prompt
    .replace(/\n+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  // 長すぎる場合は切り詰め
  if (optimized.length > 1000) {
    optimized = optimized.substring(0, 1000) + '...';
  }

  return optimized;
}

