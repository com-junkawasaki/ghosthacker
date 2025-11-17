/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * Main Tiptap editor component for EPUB content editing
 */
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CHAPTER } from '@/lib/graphql/queries';
import { UPDATE_CHAPTER } from '@/lib/graphql/mutations';

interface TiptapEditorProps {
  projectId: string;
  chapterId?: string;
}

export function TiptapEditor({ projectId, chapterId }: TiptapEditorProps) {
  const { data, loading } = useQuery(GET_CHAPTER, {
    variables: { id: chapterId },
    skip: !chapterId,
  });

  const [updateChapter] = useMutation(UPDATE_CHAPTER);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: data?.chapter?.contentHtml || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (chapterId) {
        updateChapter({
          variables: {
            input: {
              id: chapterId,
              contentHtml: editor.getHTML(),
            },
          },
        });
      }
    },
  });

  useEffect(() => {
    if (editor && data?.chapter?.contentHtml) {
      editor.commands.setContent(data.chapter.contentHtml);
    }
  }, [editor, data]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-container h-full flex flex-col">
      <div className="editor-toolbar flex gap-2 p-2 border-b border-gray-300">
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
      <div className="editor-content flex-1 p-4 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

