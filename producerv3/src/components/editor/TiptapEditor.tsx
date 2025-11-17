/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * Main Tiptap editor component for EPUB content editing
 */
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { GET_CHAPTER, GET_EPUB } from '@/lib/graphql/queries';
import { UPDATE_CHAPTER } from '@/lib/graphql/mutations';
import { useEditorSaveStore } from '@/stores/editorSave';
import { normalizeProjectId } from '@/lib/utils/uuid';
import { exportEpub } from '@/lib/export/epubExport';
import { importEpub, readExportFile } from '@/lib/import/epubImport';
import { CharacterNode } from './extensions/CharacterNode';
import { GhostNode } from './extensions/GhostNode';
import { LocationNode } from './extensions/LocationNode';
import { OrganizationNode } from './extensions/OrganizationNode';
import { TechnologyNode } from './extensions/TechnologyNode';
import { ChapterLinkNode } from './extensions/ChapterLinkNode';
import {
  EpisodeNode,
  SceneNode,
  ArcNode,
  MotifNode,
  SeasonNode,
  TimelineNode,
  POVNode,
  BeatNode,
} from './extensions/StoryNode';
import {
  SourceRefNode,
  EventNode,
  OccupationNode,
  SettingNode,
} from './extensions/MetaNode';
import { MarkExtension } from './extensions/MarkExtension';
import {
  EmotionMark,
  ThemeMark,
  ContextMark,
  NotesMark,
  RelationshipMark,
  VirtueMark,
  AnchoredToMark,
  EmitsRepelsAvoidsMark,
  PhaseMark,
  RoleMark,
} from './extensions/marks';
import { SlashCommand } from './extensions/SlashCommand';
import { AIContentGenerationExtension } from './extensions/AIContentGenerationExtension';
import { EmotionAnalysisExtension } from './extensions/EmotionAnalysisExtension';
// import { EmotionStyleExtension } from './extensions/EmotionStyleExtension'; // Disabled - using CSS instead
import { NodeSelectorDialog } from './NodeSelectorDialog';
import { ChapterSelectorDialog } from './ChapterSelectorDialog';
import { FloatingToolbar } from './FloatingToolbar';
import { ImageGenerationDialog } from './ImageGenerationDialog';
import { AIContentGenerationControls } from './AIContentGenerationControls';
import { NodeClassificationControls } from './NodeClassificationControls';
import { EmotionSidebar } from './EmotionSidebar';
import '@/styles/editor.css';

interface TiptapEditorProps {
  projectId: string;
  chapterId?: string | undefined;
  epubId?: string | undefined;
  onChapterSelect?: (chapterId: string) => void;
}

export function TiptapEditor({ projectId, chapterId, epubId, onChapterSelect }: TiptapEditorProps) {
  // Ensure epubId is normalized to UUID format for GraphQL ID type
  const normalizedEpubId = epubId ? normalizeProjectId(epubId) : undefined;
  
  // Get single chapter if chapterId is selected
  const { data: chapterData, loading: chapterLoading } = useQuery(GET_CHAPTER, {
    variables: { id: chapterId },
    skip: !chapterId,
  });

  // Get all chapters if no chapterId is selected
  const { data: epubData, loading: epubLoading } = useQuery(GET_EPUB, {
    variables: { id: normalizedEpubId },
    skip: !normalizedEpubId || !!chapterId,
  });

  const loading = chapterId ? chapterLoading : epubLoading;
  
  // Combine content from all chapters if no chapterId is selected
  const combinedContent = useMemo(() => {
    // Helper function to normalize contentHtml to string using ts-pattern
    const normalizeContentHtml = (contentHtml: unknown): string => {
      return match(contentHtml)
        .when((val): val is string => typeof val === 'string', (str) => str)
        .when(Array.isArray, () => {
          console.warn('contentHtml is an array, converting to empty string:', contentHtml);
          return '';
        })
        .when((val): val is object => val !== null && typeof val === 'object', () => {
          console.warn('contentHtml is an object, converting to empty string:', contentHtml);
          return '';
        })
        .otherwise(() => '');
    };

    if (!chapterId && epubData?.epub?.chapters) {
      return [...epubData.epub.chapters]
        .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
        .map((chapter: { title: string; order: number; contentHtml: unknown }) => {
          const chapterTitle = chapter.title || `Chapter ${chapter.order}`;
          const normalizedContent = normalizeContentHtml(chapter.contentHtml);
          return `<h1>${chapterTitle}</h1>${normalizedContent}`;
        })
        .join('');
    }
    return normalizeContentHtml(chapterData?.chapter?.contentHtml) || '';
  }, [chapterId, epubData?.epub?.chapters, chapterData?.chapter?.contentHtml]);

  const { status: saveStatus, error: saveError, setSaving, setSaved, setError } = useEditorSaveStore();
  const [updateChapter, { loading: isSaving }] = useMutation(UPDATE_CHAPTER, {
    onCompleted: () => {
      setSaved();
      // Reset to idle after 3 seconds
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        useEditorSaveStore.getState().reset();
      }, 3000);
    },
    onError: (err) => {
      console.error('Error saving chapter:', err);
      setError(err.message || '保存に失敗しました');
    },
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImageGenerationDialog, setShowImageGenerationDialog] = useState(false);
  const apolloClient = useApolloClient();

  const editor = useEditor({
    extensions: [
      // 基本ノード（必須）- Documentは最初に配置する必要がある
      Document.configure({
        content: 'block+',
      }),
      Paragraph,
      Text,
      // フォーマット
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Bold,
      Italic,
      Strike,
      Code,
      // リスト
      BulletList,
      OrderedList,
      ListItem,
      // その他
      Blockquote,
      HardBreak,
      History,
      // メディア
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      // JSON-LDノード拡張
      CharacterNode,
      GhostNode,
      LocationNode,
      OrganizationNode,
      TechnologyNode,
      ChapterLinkNode.configure(
        onChapterSelect
          ? {
              onChapterSelect,
            }
          : {}
      ),
      EpisodeNode,
      SceneNode,
      ArcNode,
      MotifNode,
      SeasonNode,
      TimelineNode,
      POVNode,
      BeatNode,
      SourceRefNode,
      EventNode,
      OccupationNode,
      SettingNode,
      // Mark拡張（10種類のマスクタイプ）
      EmotionMark,
      ThemeMark,
      ContextMark,
      NotesMark,
      RelationshipMark,
      VirtueMark,
      AnchoredToMark,
      EmitsRepelsAvoidsMark,
      PhaseMark,
      RoleMark,
      // Mark統合制御Extension
      MarkExtension,
      // 感情分析拡張
      EmotionAnalysisExtension,
      // 感情スタイル拡張（CSSで適用するため一時的に無効化）
      // EmotionStyleExtension,
      // AIコンテンツ生成拡張
      AIContentGenerationExtension.configure({
        onGenerateStart: () => {
          console.log('AI generation started');
        },
        onGenerateComplete: (text: string) => {
          console.log('AI generation completed:', text);
        },
        onGenerateError: (error: Error) => {
          console.error('AI generation error:', error);
        },
      }),
      // スラッシュコマンド拡張
      SlashCommand.configure({
        suggestion: {
          char: '/',
          allowSpaces: false,
          allowedPrefixes: [' '],
          startOfLine: false,
          decorationTag: 'span',
          decorationClass: 'slash-command',
          command: () => {},
          items: (query: string) => {
            const nodeTypes = [
              'character',
              'ghost',
              'location',
              'organization',
              'company',
              'technology',
              'episode',
              'scene',
              'arc',
              'motif',
              'season',
              'timeline',
              'pov',
              'beat',
              'event',
            ];
            return nodeTypes
              .filter((type) => type.toLowerCase().startsWith(query.toLowerCase()))
              .map((type) => ({
                title: type.charAt(0).toUpperCase() + type.slice(1),
                command: ({ editor, range }: { editor: unknown; range: { from: number; to: number } }) => {
                  setSelectedNodeType(type);
                },
              }));
          },
        },
      }),
    ],
    content: '', // Initialize with empty content, set via useEffect
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Only auto-save if a specific chapter is selected
      if (chapterId) {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Set status to saving when debounce starts
        setSaving();
        
        // Debounce save operation (wait 1 second after last change)
        saveTimeoutRef.current = setTimeout(() => {
          updateChapter({
            variables: {
              input: {
                id: chapterId,
                contentHtml: editor.getHTML(),
              },
            },
          });
        }, 1000);
      }
      // If no chapterId, don't auto-save (all chapters view is read-only for editing)
    },
  });

  // Helper function to safely set editor content using ts-pattern
  const setEditorContent = useCallback((editor: import('@tiptap/react').Editor, content: unknown) => {
    try {
      // Helper function to validate Tiptap JSON structure
      const isValidTiptapJSON = (obj: unknown): obj is { type: string; content?: unknown } => {
        if (!obj || typeof obj !== 'object') return false;
        const jsonObj = obj as { type?: unknown; content?: unknown };
        // Must have type property and be a string
        if (typeof jsonObj.type !== 'string') return false;
        // If content exists, it must be an array (Tiptap JSON format)
        if (jsonObj.content !== undefined && !Array.isArray(jsonObj.content)) return false;
        return true;
      };

      const contentResult = match(content)
        .when((val): val is string => typeof val === 'string', (str) => {
          const trimmed = str.trim() || '<p></p>';
          // Validate HTML string format
          if (!trimmed.startsWith('<') && !trimmed.match(/^[\s\n]*$/)) {
            return { type: 'string' as const, value: `<p>${trimmed}</p>` };
          }
          return { type: 'string' as const, value: trimmed };
        })
        .when(Array.isArray, () => {
          console.warn('Content is an array (invalid), converting to empty string:', content);
          return { type: 'string' as const, value: '<p></p>' };
        })
        .when(isValidTiptapJSON, (obj) => {
          // Valid Tiptap JSON format - use it directly
          // Ensure it's properly structured
          const jsonContent = obj as { type: string; content?: unknown[] };
          if (jsonContent.type === 'doc' && Array.isArray(jsonContent.content)) {
            return { type: 'json' as const, value: jsonContent };
          }
          // Fallback to string if structure is unexpected
          console.warn('Tiptap JSON has unexpected structure, converting to empty string:', obj);
          return { type: 'string' as const, value: '<p></p>' };
        })
        .when((val): val is object => val !== null && typeof val === 'object', () => {
          console.warn('Content is an invalid object, converting to empty string:', content);
          return { type: 'string' as const, value: '<p></p>' };
        })
        .otherwise(() => ({ type: 'string' as const, value: '<p></p>' }));

      const currentContent = editor.getHTML();
      
      // Avoid unnecessary updates
      if (contentResult.type === 'json') {
        // For JSON content, validate it's not an array before setting
        try {
          // Double-check that value is not an array
          if (Array.isArray(contentResult.value)) {
            console.warn('JSON value is an array, converting to empty string');
            editor.commands.setContent('<p></p>');
          } else {
            editor.commands.setContent(contentResult.value as string | import('@tiptap/core').JSONContent | import('@tiptap/core').JSONContent[] | null);
          }
        } catch (jsonError) {
          console.error('Error setting JSON content, falling back to empty:', jsonError);
          editor.commands.setContent('<p></p>');
        }
      } else if (currentContent !== contentResult.value) {
        editor.commands.setContent(contentResult.value);
      }
    } catch (error) {
      console.error('Error setting editor content:', error, 'Content:', content);
      setEditorError(error instanceof Error ? error.message : 'エディタコンテンツの設定に失敗しました');
      
      // Fallback: try setting empty content
      try {
        editor.commands.setContent('<p></p>');
      } catch (fallbackError) {
        console.error('Error setting fallback content:', fallbackError);
      }
    }
  }, []);

  // Set editor content when combinedContent changes
  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    // Wait for editor to be fully initialized
    if (!editor.view || !editor.view.state) {
      // Retry after editor is ready
      const timeoutId = setTimeout(() => {
        if (editor?.view?.state && combinedContent) {
          setEditorContent(editor, combinedContent);
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    if (combinedContent) {
      setEditorContent(editor, combinedContent);
    }
    
    return undefined;
  }, [editor, combinedContent, setEditorContent]);

  // Set editor editable state based on chapterId
  useEffect(() => {
    if (!editor) {
      return;
    }

    // Wait for editor to be fully initialized
    try {
      // Check if editor is ready by checking if it has a view
      if (editor.view && editor.view.state) {
        editor.setEditable(!!chapterId);
      }
    } catch (error) {
      console.error('Error setting editor editable state:', error);
      // Retry after a short delay
      setTimeout(() => {
        try {
          if (editor.view && editor.view.state) {
            editor.setEditable(!!chapterId);
          }
        } catch (retryError) {
          console.error('Error retrying setEditable:', retryError);
        }
      }, 100);
    }
  }, [editor, chapterId]);

  // Handle chapter link clicks
  useEffect(() => {
    if (!editor || !onChapterSelect) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const chapterLinkNode = target.closest('.chapter-link-node');
      if (chapterLinkNode) {
        const chapterId = chapterLinkNode.getAttribute('data-chapter-id');
        if (chapterId) {
          event.preventDefault();
          onChapterSelect(chapterId);
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('click', handleClick);

    return () => {
      editorElement.removeEventListener('click', handleClick);
    };
  }, [editor, onChapterSelect]);

  // Manual save function
  const handleManualSave = () => {
    if (!editor || !chapterId || isSaving) return;
    
    setSaving();
    updateChapter({
      variables: {
        input: {
          id: chapterId,
          contentHtml: editor.getHTML(),
        },
      },
    });
  };

  // Export EPUB function
  const handleExport = async () => {
    if (!normalizedEpubId || isExporting) return;

    try {
      setIsExporting(true);
      setImportError(null);
      await exportEpub(apolloClient, normalizedEpubId);
    } catch (error) {
      console.error('Export failed:', error);
      setImportError(error instanceof Error ? error.message : 'エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  // Import EPUB function
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !normalizedEpubId || isImporting) return;

    try {
      setIsImporting(true);
      setImportError(null);

      // Read and parse export file
      const exportData = await readExportFile(file);

      // Import EPUB content
      await importEpub(apolloClient, normalizedEpubId, exportData);

      // Refresh EPUB data
      if (normalizedEpubId) {
        await apolloClient.refetchQueries({
          include: [GET_EPUB],
        });
      }

      // Show success message
      alert('インポートが完了しました');
    } catch (error) {
      console.error('Import failed:', error);
      setImportError(error instanceof Error ? error.message : 'インポートに失敗しました');
      alert(`インポートエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  // Handle Ctrl+A / Cmd+A to select only editor content
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+A (Windows/Linux) または Cmd+A (Mac) を検出
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      // エディタがフォーカスされている場合のみ処理
      if (editor && editor.isFocused) {
        event.preventDefault();
        event.stopPropagation();
        // エディタ内のコンテンツのみを選択
        editor.commands.selectAll();
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (editorError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          <div className="font-bold">エラー:</div>
          <div>{editorError}</div>
        </div>
      </div>
    );
  }

  if (!editor) {
    return <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">エディタを初期化中...</div>
    </div>;
  }

  // Show editor even if no chapter is selected (display all chapters)
  // Note: Editing is disabled when no specific chapter is selected

  return (
    <div className="editor-container h-full flex flex-col">
      <div className="editor-toolbar flex flex-wrap gap-2 p-2 border-b border-gray-300 items-center">
        {/* Phase 1: 作成（Content Creation） */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 px-2">作成</span>
          {/* JSON-LDノード挿入ボタン */}
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedNodeType('character')}
              className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800 hover:bg-purple-200"
            >
              Character
            </button>
            <button
              onClick={() => setSelectedNodeType('ghost')}
              className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
              Ghost
            </button>
            <button
              onClick={() => setSelectedNodeType('location')}
              className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              Location
            </button>
            <button
              onClick={() => setSelectedNodeType('organization')}
              className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 hover:bg-green-200"
            >
              Org
            </button>
            <button
              onClick={() => setSelectedNodeType('technology')}
              className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            >
              Tech
            </button>
            <button
              onClick={() => setSelectedNodeType('episode')}
              className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
            >
              Episode
            </button>
            <button
              onClick={() => setSelectedNodeType('scene')}
              className="px-2 py-1 text-xs rounded bg-pink-100 text-pink-800 hover:bg-pink-200"
            >
              Scene
            </button>
            <button
              onClick={() => setSelectedNodeType('arc')}
              className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800 hover:bg-orange-200"
            >
              Arc
            </button>
            <button
              onClick={() => setSelectedNodeType('motif')}
              className="px-2 py-1 text-xs rounded bg-teal-100 text-teal-800 hover:bg-teal-200"
            >
              Motif
            </button>
            <button
              onClick={() => setShowChapterSelector(true)}
              className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
              disabled={!normalizedEpubId}
              title="Insert chapter link"
            >
              Chapter
            </button>
          </div>
          {/* 画像生成ボタン */}
          <div className="border-l border-gray-300 pl-2 ml-2">
            <button
              onClick={() => setShowImageGenerationDialog(true)}
              className="px-3 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200 text-sm font-medium"
              title="画像を生成して挿入"
            >
              🖼️ 画像生成
            </button>
          </div>
        </div>

        {/* Phase 2: 編集（Content Editing） */}
        <div className="flex items-center gap-2 border-l border-gray-300 pl-2 ml-2">
          <span className="text-xs font-semibold text-gray-500 px-2">編集</span>
          {/* 基本フォーマット */}
          <div className="flex gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-3 py-1 rounded ${
                editor.isActive('bold')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Bold
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-3 py-1 rounded ${
                editor.isActive('italic')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Italic
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-3 py-1 rounded ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-3 py-1 rounded ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              H2
            </button>
          </div>
          {/* AI生成ボタン */}
          <div className="border-l border-gray-300 pl-2 ml-2">
            <AIContentGenerationControls editor={editor} />
          </div>
          {/* ノード分類ボタン */}
          <div className="border-l border-gray-300 pl-2 ml-2">
            <NodeClassificationControls editor={editor} />
          </div>
        </div>

        {/* Phase 4: エクスポート（Content Export） */}
        <div className="flex items-center gap-2 border-l border-gray-300 pl-2 ml-2 ml-auto">
          <span className="text-xs font-semibold text-gray-500 px-2">エクスポート</span>
          {/* エクスポート/インポートボタン */}
          {normalizedEpubId && (
            <div className="flex gap-1">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  isExporting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                title="EPUB全体をエクスポート"
              >
                {isExporting ? 'エクスポート中...' : 'エクスポート'}
              </button>
              <label
                className={`px-3 py-1 rounded text-sm font-medium cursor-pointer ${
                  isImporting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isImporting ? 'インポート中...' : 'インポート'}
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImport}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          )}
          {/* 保存ボタンと状態表示 */}
          <div className="flex items-center gap-2 border-l border-gray-300 pl-2 ml-2">
            {/* インポートエラー表示 */}
            {importError && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span>{importError}</span>
              </div>
            )}
            {/* 保存状態インジケーター - ts-pattern で型安全に */}
            {match(saveStatus)
              .with('saving', () => (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <svg
                    className="animate-spin h-4 w-4 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-label="保存中"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>保存中...</span>
                </div>
              ))
              .with('saved', () => (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="保存済み"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>保存済み</span>
                </div>
              ))
              .with('error', () => (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="エラー"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>{saveError || '保存エラー'}</span>
                </div>
              ))
              .with('idle', () => null)
              .exhaustive()}
            
            {/* 手動保存ボタン */}
            <button
              onClick={handleManualSave}
              disabled={isSaving || !chapterId}
              className={`px-4 py-1 rounded text-sm font-medium ${
                isSaving || !chapterId
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              title={!chapterId ? '章を選択してから編集・保存してください' : '保存'}
            >
              保存
            </button>
            {!chapterId && (
              <div className="text-xs text-gray-500 px-2">
                全章表示モード（編集するには章を選択してください）
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="editor-content-wrapper flex-1 flex overflow-hidden">
        <div 
          className="editor-content flex-1 p-4 overflow-y-auto relative"
          onKeyDown={handleKeyDown}
        >
          <EditorContent editor={editor} />
          <FloatingToolbar 
            editor={editor} 
            onInsertNode={(nodeType) => setSelectedNodeType(nodeType)}
          />
        </div>
        
        {/* Emotion Sidebar */}
        <EmotionSidebar editor={editor} selectedBenchmark={selectedBenchmark} onBenchmarkChange={setSelectedBenchmark} />
      </div>
      
      {/* ノード選択ダイアログ */}
      {selectedNodeType && (
        <NodeSelectorDialog
          nodeType={selectedNodeType}
          isOpen={true}
          onClose={() => setSelectedNodeType(null)}
          onSelect={(node) => {
            if (!editor) return;
            
            const nodeId = node.id as string;
            const nodeName = (node.name as string) || 'Untitled';
            
            // Use ts-pattern for exhaustive node type matching
            match(selectedNodeType)
              .with('character', () => {
                editor.chain().focus().insertCharacter({ characterId: nodeId, name: nodeName }).run();
              })
              .with('ghost', () => {
                editor.chain().focus().insertGhost({ ghostId: nodeId, name: nodeName }).run();
              })
              .with('location', () => {
                editor.chain().focus().insertLocation({ locationId: nodeId, name: nodeName }).run();
              })
              .with('organization', () => {
                editor.chain().focus().insertOrganization({ organizationId: nodeId, name: nodeName }).run();
              })
              .with('company', () => {
                editor.chain().focus().insertCompany({ companyId: nodeId, name: nodeName }).run();
              })
              .with('technology', () => {
                editor.chain().focus().insertTechnology({ technologyId: nodeId, name: nodeName }).run();
              })
              .with('episode', () => {
                editor.chain().focus().insertEpisode({ episodeId: nodeId, name: nodeName }).run();
              })
              .with('scene', () => {
                editor.chain().focus().insertScene({ sceneId: nodeId, name: nodeName }).run();
              })
              .with('arc', () => {
                editor.chain().focus().insertArc({ arcId: nodeId, name: nodeName }).run();
              })
              .with('motif', () => {
                editor.chain().focus().insertMotif({ motifId: nodeId, name: nodeName }).run();
              })
              .with('season', () => {
                editor.chain().focus().insertSeason({ seasonId: nodeId, name: nodeName }).run();
              })
              .with('timeline', () => {
                editor.chain().focus().insertTimeline({ timelineId: nodeId, name: nodeName }).run();
              })
              .with('pov', () => {
                editor.chain().focus().insertPOV({ povId: nodeId, name: nodeName }).run();
              })
              .with('beat', () => {
                editor.chain().focus().insertBeat({ beatId: nodeId, name: nodeName }).run();
              })
              .with('event', () => {
                editor.chain().focus().insertEvent({ eventId: nodeId, name: nodeName }).run();
              })
              .otherwise(() => {
                console.warn('Unknown node type:', selectedNodeType);
              });
            
            setSelectedNodeType(null);
          }}
        />
      )}
      
      {/* 章選択ダイアログ */}
      {normalizedEpubId && (
        <ChapterSelectorDialog
          epubId={normalizedEpubId}
          isOpen={showChapterSelector}
          onClose={() => setShowChapterSelector(false)}
          onSelect={(chapter) => {
            if (!editor || !normalizedEpubId) return;
            
            editor.chain().focus().insertChapterLink({
              chapterId: chapter.id,
              title: chapter.title,
              order: chapter.order,
              epubId: normalizedEpubId,
            }).run();
            
            setShowChapterSelector(false);
          }}
        />
      )}

      {/* 画像生成ダイアログ */}
      <ImageGenerationDialog
        isOpen={showImageGenerationDialog}
        onClose={() => setShowImageGenerationDialog(false)}
        onInsertImage={(imageBase64) => {
          if (!editor) return;
          // Base64画像をエディターに挿入
          editor.chain().focus().setImage({ src: imageBase64 }).run();
        }}
        editor={editor}
      />
    </div>
  );
}

