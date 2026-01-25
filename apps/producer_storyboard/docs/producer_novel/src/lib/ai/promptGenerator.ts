/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-image-prompt
 * 
 * エディターコンテキストから画像生成プロンプトを生成するユーティリティ
 */

import type { EditorContext, ExtractedNode, MaskInfo } from '@/lib/editor/contextExtractor';
import type { StructuredContext } from '@/lib/editor/structuredContextExtractor';

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

/**
 * 構造化コンテキストからプロンプトを生成
 */
export function generateStructuredPrompt(
  context: StructuredContext,
  options: PromptGenerationOptions = {}
): string {
  const {
    style = 'descriptive',
  } = options;

  const promptParts: string[] = [];

  // Scene情報
  if (context.scene) {
    promptParts.push(`シーン: ${context.scene.name}`);
    if (style === 'detailed' && context.scene.attributes.description) {
      promptParts.push(`シーン説明: ${context.scene.attributes.description}`);
    }
  }

  // Location情報
  if (context.location) {
    promptParts.push(`場所: ${context.location.name}`);
    if (style === 'detailed' && context.location.attributes.description) {
      promptParts.push(`場所説明: ${context.location.attributes.description}`);
    }
  }

  // Characters情報
  if (context.characters.length > 0) {
    const characterParts: string[] = [];
    context.characters.forEach((charWithMarks) => {
      let charText = `人物: ${charWithMarks.node.name}`;
      
      if (style === 'detailed') {
        const attrs = charWithMarks.node.attributes;
        if (attrs.description) {
          charText += ` (${attrs.description})`;
        }
        if (attrs.role) {
          charText += ` [役割: ${attrs.role}]`;
        }
        if (attrs.virtue) {
          charText += ` [美徳: ${attrs.virtue}]`;
        }
      }

      // Marks情報を追加
      if (charWithMarks.marks.length > 0) {
        const markTexts = charWithMarks.marks.map((mark) => {
          const maskLabel = MASK_TYPE_LABELS[mark.type] || mark.type;
          return maskLabel;
        });
        if (markTexts.length > 0) {
          charText += ` [${markTexts.join(', ')}]`;
        }
      }

      characterParts.push(charText);
    });
    promptParts.push(`登場人物: ${characterParts.join('; ')}`);
  }

  // Dialogue情報
  if (context.dialogue.length > 0) {
    const dialogueParts: string[] = [];
    context.dialogue.forEach((dialogue) => {
      let dialogueText = `「${dialogue.text}」`;
      
      // Character情報
      if (dialogue.characterId) {
        const character = context.characters.find(
          (char) => (char.node.attributes.characterId as string) === dialogue.characterId
        );
        if (character) {
          dialogueText = `${character.node.name}: ${dialogueText}`;
        }
      }

      // Emotion Marks
      const emotionMarks = dialogue.marks.filter((mark) => mark.type === 'emotion');
      if (emotionMarks.length > 0) {
        const emotionTexts = emotionMarks.map((mark) => {
          if (mark.attributes.emotionVector) {
            const emotions = Object.entries(mark.attributes.emotionVector as Record<string, number>)
              .filter(([, score]) => score && score > 0)
              .map(([emotion]) => emotion);
            return emotions.join(', ');
          }
          return '感情';
        });
        dialogueText += ` [感情: ${emotionTexts.join(', ')}]`;
      }

      // Context Marks
      const contextMarks = dialogue.marks.filter((mark) => mark.type === 'context');
      if (contextMarks.length > 0) {
        const contextTexts = contextMarks.map((mark) => {
          if (mark.attributes.contextType) {
            return `${mark.attributes.contextType}: ${mark.attributes.contextValue || ''}`;
          }
          return 'コンテキスト';
        });
        dialogueText += ` [文脈: ${contextTexts.join(', ')}]`;
      }

      dialogueParts.push(dialogueText);
    });
    promptParts.push(`会話: ${dialogueParts.join('\n')}`);
  }

  // Emotions情報（全体）
  if (context.emotions.length > 0) {
    const emotionTexts = context.emotions.map((emotion) => {
      if (emotion.attributes.emotionVector) {
        const emotions = Object.entries(emotion.attributes.emotionVector as Record<string, number>)
          .filter(([, score]) => score && score > 0)
          .map(([emotion]) => emotion);
        return emotions.join(', ');
      }
      return '感情';
    });
    promptParts.push(`感情状態: ${emotionTexts.join('; ')}`);
  }

  // Contexts情報（全体）
  if (context.contexts.length > 0) {
    const contextTexts = context.contexts.map((ctx) => {
      if (ctx.attributes.contextType) {
        return `${ctx.attributes.contextType}: ${ctx.attributes.contextValue || ''}`;
      }
      return 'コンテキスト';
    });
    promptParts.push(`文脈情報: ${contextTexts.join('; ')}`);
  }

  // プロンプトを組み立て
  let prompt = promptParts.join('\n');

  // プロンプトが空の場合はデフォルトメッセージ
  if (!prompt.trim()) {
    prompt = 'このコンテキストに基づいたコンテンツを生成してください';
  } else {
    // AI生成用のプロンプトとして整形
    prompt = `以下の構造化コンテキストを基にコンテンツを生成してください:\n\n${prompt}`;
  }

  return prompt;
}

/**
 * 構造化コンテキストからマルチエージェント生成用プロンプトを生成
 */
export function generateMultiAgentPrompt(
  context: StructuredContext,
  characterId?: string,
  options: PromptGenerationOptions = {}
): string {
  const {
    style = 'detailed',
  } = options;

  const promptParts: string[] = [];

  // Scene情報
  if (context.scene) {
    promptParts.push(`## シーン情報`);
    promptParts.push(`シーン名: ${context.scene.name}`);
    if (context.scene.attributes.description) {
      promptParts.push(`説明: ${context.scene.attributes.description}`);
    }
    promptParts.push('');
  }

  // Location情報
  if (context.location) {
    promptParts.push(`## 場所情報`);
    promptParts.push(`場所名: ${context.location.name}`);
    if (context.location.attributes.description) {
      promptParts.push(`説明: ${context.location.attributes.description}`);
    }
    promptParts.push('');
  }

  // Characters情報
  if (context.characters.length > 0) {
    promptParts.push(`## 登場人物`);
    context.characters.forEach((charWithMarks) => {
      const attrs = charWithMarks.node.attributes;
      const charId = attrs.characterId as string;
      const isTargetCharacter = characterId ? charId === characterId : false;
      
      if (isTargetCharacter) {
        promptParts.push(`### [対象] ${charWithMarks.node.name}`);
      } else {
        promptParts.push(`### ${charWithMarks.node.name}`);
      }
      
      if (attrs.description) {
        promptParts.push(`説明: ${attrs.description}`);
      }
      if (attrs.role) {
        promptParts.push(`役割: ${attrs.role}`);
      }
      if (attrs.virtue) {
        promptParts.push(`美徳: ${attrs.virtue}`);
      }
      if (attrs.age) {
        promptParts.push(`年齢: ${attrs.age}`);
      }
      
      // Marks情報
      if (charWithMarks.marks.length > 0) {
        promptParts.push(`適用されたマーク: ${charWithMarks.marks.map(m => m.type).join(', ')}`);
      }
      
      promptParts.push('');
    });
  }

  // Dialogue情報
  if (context.dialogue.length > 0) {
    promptParts.push(`## 会話履歴`);
    context.dialogue.forEach((dialogue) => {
      const character = dialogue.characterId
        ? context.characters.find(
            (char) => (char.node.attributes.characterId as string) === dialogue.characterId
          )
        : null;
      
      if (character) {
        promptParts.push(`${character.node.name}: 「${dialogue.text}」`);
      } else {
        promptParts.push(`「${dialogue.text}」`);
      }
      
      // Emotion Marks
      const emotionMarks = dialogue.marks.filter((mark) => mark.type === 'emotion');
      if (emotionMarks.length > 0) {
        emotionMarks.forEach((mark) => {
          if (mark.attributes.emotionVector) {
            const emotions = Object.entries(mark.attributes.emotionVector as Record<string, number>)
              .filter(([, score]) => score && score > 0)
              .map(([emotion, score]) => `${emotion}: ${score}`);
            promptParts.push(`  感情: ${emotions.join(', ')}`);
          }
        });
      }
      
      // Context Marks
      const contextMarks = dialogue.marks.filter((mark) => mark.type === 'context');
      if (contextMarks.length > 0) {
        contextMarks.forEach((mark) => {
          if (mark.attributes.contextType) {
            promptParts.push(`  文脈: ${mark.attributes.contextType}: ${mark.attributes.contextValue || ''}`);
          }
        });
      }
      
      promptParts.push('');
    });
  }

  // プロンプトを組み立て
  let prompt = promptParts.join('\n');

  // プロンプトが空の場合はデフォルトメッセージ
  if (!prompt.trim()) {
    prompt = 'このコンテキストに基づいたコンテンツを生成してください';
  }

  return prompt;
}

