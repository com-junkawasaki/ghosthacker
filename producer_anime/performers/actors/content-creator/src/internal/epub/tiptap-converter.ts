/**
 * TipTap ↔ EPUB構造変換ユーティリティ
 * 
 * @context {
 *   "@id": "ex:TipTapConverter",
 *   "@type": "ex:Service",
 *   "ex:consumes": ["ex:TipTapJSON", "ex:EPUBStructure"],
 *   "ex:produces": ["ex:EPUBStructure", "ex:TipTapJSON"]
 * }
 */

import { JSONContent } from '@tiptap/core';
import { nanoid } from 'nanoid';

export interface ParagraphData {
  id: string;
  order: number;
  style: string | null;
  textNodes: TextNodeData[];
}

export interface TextNodeData {
  id: string;
  content: string;
  order: number;
  style: string | null;
}

/**
 * TipTap JSONをEPUB構造（Paragraph/TextNode）に変換
 */
export function tiptapToEPUB(
  tiptapJSON: JSONContent,
  chapterId: string
): { paragraphs: ParagraphData[] } {
  const paragraphs: ParagraphData[] = [];
  let paragraphOrder = 0;

  if (!tiptapJSON.content) {
    return { paragraphs: [] };
  }

  for (const node of tiptapJSON.content) {
    // paragraph または heading ノードを処理
    if (node.type === 'paragraph' || node.type === 'heading') {
      paragraphOrder++;
      const paragraphId = `Paragraph_${nanoid()}`;
      const textNodes: TextNodeData[] = [];
      let textNodeOrder = 0;

      // 段落内のテキストノードを抽出
      if (node.content) {
        for (const child of node.content) {
          if (child.type === 'text') {
            textNodeOrder++;
            const textNodeId = `TextNode_${nanoid()}`;
            
            // マーク（bold, italicなど）をstyleに変換
            const marks = child.marks || [];
            const styles: string[] = [];
            
            marks.forEach((mark) => {
              if (mark.type === 'bold') {
                styles.push('bold');
              } else if (mark.type === 'italic') {
                styles.push('italic');
              } else if (mark.type === 'underline') {
                styles.push('underline');
              } else if (mark.type === 'strike') {
                styles.push('strike');
              }
            });

            textNodes.push({
              id: textNodeId,
              content: child.text || '',
              order: textNodeOrder,
              style: styles.length > 0 ? styles.join(',') : null,
            });
          } else if (child.type === 'hardBreak') {
            // 改行はテキストノードとして扱う
            textNodeOrder++;
            const textNodeId = `TextNode_${nanoid()}`;
            textNodes.push({
              id: textNodeId,
              content: '\n',
              order: textNodeOrder,
              style: null,
            });
          }
        }
      }

      // 段落のstyleを決定（headingの場合はlevelを保存）
      let paragraphStyle: string | null = null;
      if (node.type === 'heading') {
        paragraphStyle = `heading-${node.attrs?.level || 1}`;
      }

      paragraphs.push({
        id: paragraphId,
        order: paragraphOrder,
        style: paragraphStyle,
        textNodes,
      });
    }
  }

  return { paragraphs };
}

/**
 * EPUB構造（Paragraph/TextNode）をTipTap JSONに変換
 */
export function epubToTipTap(
  paragraphs: Array<{
    id: string;
    order: number;
    style: string | null;
    textNodes: Array<{
      id: string;
      content: string;
      order: number;
      style: string | null;
    }>;
  }>
): JSONContent {
  const content: JSONContent[] = [];

  // 段落をorder順にソート
  const sortedParagraphs = [...paragraphs].sort((a, b) => a.order - b.order);

  for (const paragraph of sortedParagraphs) {
    // 段落のタイプを決定（headingの場合はheading、それ以外はparagraph）
    const isHeading = paragraph.style?.startsWith('heading-');
    const nodeType = isHeading ? 'heading' : 'paragraph';
    const level = isHeading ? parseInt(paragraph.style?.split('-')[1] || '1') : undefined;

    // テキストノードをorder順にソート
    const sortedTextNodes = [...paragraph.textNodes].sort((a, b) => a.order - b.order);

    const textContent: JSONContent[] = [];

    for (const textNode of sortedTextNodes) {
      if (textNode.content === '\n') {
        // 改行
        textContent.push({
          type: 'hardBreak',
        });
      } else {
        // テキストノード
        const marks: JSONContent['marks'] = [];
        
        if (textNode.style) {
          const styles = textNode.style.split(',');
          styles.forEach((style) => {
            const trimmedStyle = style.trim();
            if (trimmedStyle === 'bold') {
              marks.push({ type: 'bold' });
            } else if (trimmedStyle === 'italic') {
              marks.push({ type: 'italic' });
            } else if (trimmedStyle === 'underline') {
              marks.push({ type: 'underline' });
            } else if (trimmedStyle === 'strike') {
              marks.push({ type: 'strike' });
            }
          });
        }

        textContent.push({
          type: 'text',
          text: textNode.content,
          ...(marks.length > 0 && { marks }),
        });
      }
    }

    const node: JSONContent = {
      type: nodeType,
      ...(textContent.length > 0 && { content: textContent }),
    };

    if (isHeading && level) {
      node.attrs = { level };
    }

    content.push(node);
  }

  return {
    type: 'doc',
    content,
  };
}

