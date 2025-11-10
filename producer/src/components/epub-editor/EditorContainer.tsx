'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ContentEditable from './ContentEditable';
import SettingsPanel from './SettingsPanel';
import AIPanel from './AIPanel';
import type { EpubEditorSettings, EpubDocument } from '@/lib/epub-settings';
import { getDefaultEpubSettings } from '@/lib/epub-settings';
import { downloadEpub3 } from '@/lib/epub-export';
import { saveEpubJsonLd, saveEpubSettingsAction, loadEpubSettingsAction } from '@/app/(producer)/editor/epub/actions';

interface EditorContainerProps {
  initialContent?: string;
  initialDocument?: EpubDocument;
  className?: string;
}

/**
 * ePubエディタコンテナコンポーネント
 * 
 * Scroll View + Page View のハイブリッド
 * LLM統合、OWL/SHACL検証を統合
 */
export default function EditorContainer({
  initialContent = '<h1>Chapter Title</h1><p>Start writing...</p>',
  initialDocument,
  className = '',
}: EditorContainerProps) {
  const [viewMode, setViewMode] = useState<'scroll' | 'page'>('scroll');
  const [content, setContent] = useState(initialContent);
  const [settings, setSettings] = useState<EpubEditorSettings>(() => getDefaultEpubSettings());
  const [showSettings, setShowSettings] = useState(false);
  
  // 初期設定の読み込み（マウント時）
  useEffect(() => {
    loadEpubSettingsAction().then((result) => {
      if (result.ok) {
        setSettings(result.data);
      }
    });
  }, []);
  const [jsonLd, setJsonLd] = useState<unknown>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | undefined>();
  const [characterId, setCharacterId] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleJsonLdChange = useCallback((newJsonLd: unknown) => {
    setJsonLd(newJsonLd);
  }, []);

  const handleSettingsChange = useCallback(async (newSettings: EpubEditorSettings) => {
    setSettings(newSettings);
    // Server Action経由で保存
    await saveEpubSettingsAction(newSettings);
  }, []);

  // テキスト選択ハンドラ
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setCursorPosition({
        x: rect.right,
        y: rect.top,
      });
      setShowAIPanel(true);
    } else {
      setShowAIPanel(false);
    }
  }, []);

  // エクスポートハンドラ
  const handleExport = useCallback(async () => {
    if (!jsonLd) {
      alert('No content to export');
      return;
    }

    try {
      const document: EpubDocument = {
        '@context': {
          '@base': 'https://ghosthacker.gftd.co.jp/',
          '@vocab': 'https://ghosthacker.gftd.co.jp/ontology#',
          'gh': 'https://ghosthacker.gftd.co.jp/ontology#',
          'schema': 'http://schema.org/',
        },
        '@id': 'epub:document-1',
        '@type': 'gh:EpubDocument',
        'schema:title': 'Ghost Hacker',
        'gh:hasChapter': [],
      };

      await downloadEpub3(
        document,
        settings,
        {
          title: 'Ghost Hacker',
          author: 'GFTD.ai',
          language: 'en',
        },
        'ghost-hacker.epub'
      );
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [jsonLd, settings]);

  // LLM生成ハンドラ
  const handleGenerateText = useCallback((text: string) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        setContent(editorRef.current.innerHTML);
      }
    }
    setShowAIPanel(false);
  }, []);

  const handleGenerateImage = useCallback((imageUrl: string) => {
    if (editorRef.current) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Generated image';
      editorRef.current.appendChild(img);
      setContent(editorRef.current.innerHTML);
    }
    setShowAIPanel(false);
  }, []);

  const handleGenerateDialogue = useCallback((dialogue: unknown) => {
    // TODO: 会話をJSON-LDノードとして挿入
    console.log('Generated dialogue:', dialogue);
    setShowAIPanel(false);
  }, []);

  // JSON-LD のリアルタイム保存（debounce 付き）
  useEffect(() => {
    // 既存のタイマーをクリア
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // jsonLd が null または空の場合は保存しない
    if (!jsonLd || (typeof jsonLd === 'object' && Object.keys(jsonLd).length === 0)) {
      return;
    }

    // 500ms の debounce 後に保存
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      setSaveError(null);

      try {
        const result = await saveEpubJsonLd(jsonLd as Record<string, unknown>, 'epub-document.jsonld');
        
        if (result.ok) {
          setSaveStatus('saved');
          // 2秒後に 'idle' に戻す
          setTimeout(() => {
            setSaveStatus('idle');
          }, 2000);
        } else {
          setSaveStatus('error');
          setSaveError(result.error);
        }
      } catch (error) {
        setSaveStatus('error');
        setSaveError(error instanceof Error ? error.message : 'Unknown error');
      }
    }, 500);

    // クリーンアップ関数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [jsonLd]);

  return (
    <div className={`epub-editor-container flex h-screen ${className}`}>
      {/* メインエディタエリア */}
      <div className="flex-1 flex flex-col">
        {/* ツールバー */}
        <div className="border-b border-gray-200 bg-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('scroll')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'scroll' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Scroll
            </button>
            <button
              onClick={() => setViewMode('page')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'page' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Page
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* 保存状態の表示 */}
            {saveStatus === 'saving' && (
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <span className="animate-spin">⏳</span>
                <span>Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="text-sm text-green-600 flex items-center gap-1">
                <span>✓</span>
                <span>Saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="text-sm text-red-600 flex items-center gap-1" title={saveError || 'Save error'}>
                <span>✗</span>
                <span>Error</span>
              </div>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
            >
              Settings
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
            >
              Export
            </button>
            <div className="text-sm text-gray-600">
              Font: {settings['gh:fontSize']}
            </div>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              AI
            </button>
          </div>
        </div>

        {/* エディタコンテンツ */}
        <div className="flex-1 overflow-auto" onMouseUp={handleTextSelection}>
          {viewMode === 'scroll' ? (
            <div ref={editorRef}>
              <ContentEditable
                content={content}
                settings={settings}
                onContentChange={handleContentChange}
                onJsonLdChange={handleJsonLdChange}
                className="max-w-4xl mx-auto"
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-8">
              <div className="bg-white shadow-lg" style={{ minHeight: settings['gh:pageHeight'] || '1200px' }}>
                <div ref={editorRef}>
                  <ContentEditable
                    content={content}
                    settings={settings}
                    onContentChange={handleContentChange}
                    onJsonLdChange={handleJsonLdChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* AIパネル */}
      {showAIPanel && (
        <AIPanel
          selectedText={selectedText}
          cursorPosition={cursorPosition}
          characterId={characterId}
          onGenerateText={handleGenerateText}
          onGenerateImage={handleGenerateImage}
          onGenerateDialogue={handleGenerateDialogue}
          onClose={() => setShowAIPanel(false)}
        />
      )}
    </div>
  );
}

