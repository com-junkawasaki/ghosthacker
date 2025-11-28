'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EpubEditorSettings } from '@/lib/epub-settings';
import { settingsToCss } from '@/lib/epub-settings';

interface ContentEditableProps {
  content: string;
  settings: EpubEditorSettings;
  onContentChange: (content: string) => void;
  onJsonLdChange?: (jsonLd: unknown) => void;
  className?: string;
}

/**
 * ContentEditableベースのePubエディタコンポーネント
 * 
 * JSON-LDを直接操作し、SHACL検証を統合
 * Tiptap不使用
 */
export default function ContentEditable({
  content,
  settings,
  onContentChange,
  onJsonLdChange,
  className = '',
}: ContentEditableProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // DOMからJSON-LDを生成
  const domToJsonLd = useCallback((element: HTMLElement): unknown => {
    const jsonLd: Record<string, unknown> = {
      '@context': {
        '@base': 'https://ghosthacker.gftd.co.jp/',
        '@vocab': 'https://ghosthacker.gftd.co.jp/ontology#',
        'gh': 'https://ghosthacker.gftd.co.jp/ontology#',
        'schema': 'http://schema.org/',
      },
      '@graph': [],
    };

    // 段落を抽出
    const paragraphs = element.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
      const text = p.textContent || '';
      if (text.trim()) {
        jsonLd['@graph'].push({
          '@id': `epub:paragraph-${index}`,
          '@type': 'gh:EpubParagraph',
          'gh:content': text,
        });
      }
    });

    // 見出しを抽出
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((h, index) => {
      const text = h.textContent || '';
      if (text.trim()) {
        jsonLd['@graph'].push({
          '@id': `epub:heading-${index}`,
          '@type': 'gh:EpubChapter',
          'schema:title': text,
        });
      }
    });

    // 画像を抽出
    const images = element.querySelectorAll('img');
    images.forEach((img, index) => {
      const src = img.getAttribute('src') || '';
      if (src) {
        jsonLd['@graph'].push({
          '@id': `epub:image-${index}`,
          '@type': 'gh:EpubImage',
          'gh:imageUrl': src,
          'schema:title': img.getAttribute('alt') || '',
        });
      }
    });

    return jsonLd;
  }, []);

  // JSON-LDからDOMを生成
  const jsonLdToDom = useCallback((jsonLd: unknown): string => {
    if (!jsonLd || typeof jsonLd !== 'object') {
      return content;
    }

    const graph = (jsonLd as { '@graph'?: unknown[] })['@graph'] || [];
    let html = '';

    graph.forEach((item) => {
      if (typeof item !== 'object' || item === null) return;

      const type = (item as { '@type'?: string })['@type'];
      const id = (item as { '@id'?: string })['@id'];

      if (type === 'gh:EpubChapter') {
        const title = (item as { 'schema:title'?: string })['schema:title'] || '';
        html += `<h2 data-jsonld-id="${id}">${title}</h2>`;
      } else if (type === 'gh:EpubParagraph') {
        const text = (item as { 'gh:content'?: string })['gh:content'] || '';
        html += `<p data-jsonld-id="${id}">${text}</p>`;
      } else if (type === 'gh:EpubImage') {
        const imageUrl = (item as { 'gh:imageUrl'?: string })['gh:imageUrl'] || '';
        const alt = (item as { 'schema:title'?: string })['schema:title'] || '';
        html += `<img data-jsonld-id="${id}" src="${imageUrl}" alt="${alt}" />`;
      }
    });

    return html || content;
  }, [content]);

  // コンテンツ変更ハンドラ
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const newContent = editorRef.current.innerHTML;
    onContentChange(newContent);

    // JSON-LDを生成
    const jsonLd = domToJsonLd(editorRef.current);
    if (onJsonLdChange) {
      onJsonLdChange(jsonLd);
    }

    // TODO: SHACL検証を実行
    // const validation = validateEpubJsonLd(jsonLd);
    // setValidationErrors(validation.errors.map(e => e.message));
  }, [onContentChange, onJsonLdChange, domToJsonLd]);

  // 設定変更時にCSSを適用
  useEffect(() => {
    if (editorRef.current) {
      const css = settingsToCss(settings);
      const styleId = 'epub-editor-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = css;
    }
  }, [settings]);

  // 初期コンテンツを設定（編集モードでない場合のみ）
  useEffect(() => {
    if (editorRef.current && !isEditing && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content, isEditing]);

  return (
    <div className={`epub-editor ${className}`}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        className="epub-content-editable min-h-[600px] p-8 focus:outline-none"
        style={{
          fontFamily: settings['gh:fontFamily'] === 'serif' 
            ? 'Georgia, "Times New Roman", serif' 
            : settings['gh:fontFamily'] === 'sans-serif'
            ? 'Arial, sans-serif'
            : 'monospace',
          fontSize: settings['gh:fontSize'],
          lineHeight: settings['gh:lineHeight'] || 1.6,
          letterSpacing: settings['gh:letterSpacing'] || '0.05em',
          color: settings['gh:textColor'] || '#333333',
          backgroundColor: settings['gh:backgroundColor'] || '#FFFFFF',
        }}
      />
      {validationErrors.length > 0 && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          <div className="font-medium mb-1">Validation Errors:</div>
          <ul className="list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

