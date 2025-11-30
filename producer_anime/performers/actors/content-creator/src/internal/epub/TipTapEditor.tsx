/**
 * TipTap Editor Component
 * WYSIWYGエディタコンポーネント
 * 
 * @context {
 *   "@id": "ex:TipTapEditor",
 *   "@type": "ex:Component",
 *   "ex:provides": "ex:WYSIWYGEditing"
 * }
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { JSONContent } from '@tiptap/core';

interface TipTapEditorProps {
  content: JSONContent;
  onUpdate: (content: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TipTapEditor({
  content,
  onUpdate,
  placeholder = 'コンテンツを入力...',
  editable = true,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }) as any,
      Placeholder.configure({
        placeholder,
      }) as any,
    ] as any,
    content,
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onUpdate(json);
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-editor border border-gray-300 dark:border-gray-600 rounded-lg">
      {/* ツールバー */}
      <div className="flex flex-wrap gap-2 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleBold().run()}
          disabled={!(editor.can().chain().focus() as any).toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('bold')
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleItalic().run()}
          disabled={!(editor.can().chain().focus() as any).toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('italic')
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleStrike().run()}
          disabled={!(editor.can().chain().focus() as any).toggleStrike().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('strike')
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <s>S</s>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).setParagraph().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('paragraph')
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          P
        </button>
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('bulletList')
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm font-medium ${
            editor.isActive('orderedList')
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          1. List
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).undo().run()}
          disabled={!(editor.can().chain().focus() as any).undo().run()}
          className="px-3 py-1 rounded text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          onClick={() => (editor.chain().focus() as any).redo().run()}
          disabled={!(editor.can().chain().focus() as any).redo().run()}
          className="px-3 py-1 rounded text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          ↷ Redo
        </button>
      </div>

      {/* エディタコンテンツ */}
      <div className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap-editor .ProseMirror {
          outline: none;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap-editor .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.67em;
          margin-bottom: 0.67em;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.83em;
          margin-bottom: 0.83em;
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 1em;
        }
        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol {
          padding-left: 1.5em;
        }
        .tiptap-editor .ProseMirror ul {
          list-style-type: disc;
        }
        .tiptap-editor .ProseMirror ol {
          list-style-type: decimal;
        }
      `}</style>
    </div>
  );
}

