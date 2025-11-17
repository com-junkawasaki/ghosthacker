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
import { useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CHAPTER } from '@/lib/graphql/queries';
import { UPDATE_CHAPTER } from '@/lib/graphql/mutations';

interface TiptapEditorProps {
  projectId: string;
  chapterId?: string | undefined;
}

export function TiptapEditor({ projectId, chapterId }: TiptapEditorProps) {
  const { data, loading } = useQuery(GET_CHAPTER, {
    variables: { id: chapterId },
    skip: !chapterId,
  });

  const [updateChapter, { error: updateError }] = useMutation(UPDATE_CHAPTER);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Debounce save operation (wait 1 second after last change)
        saveTimeoutRef.current = setTimeout(() => {
          updateChapter({
            variables: {
              input: {
                id: chapterId,
                contentHtml: editor.getHTML(),
              },
            },
          }).catch((err) => {
            console.error('Error saving chapter:', err);
          });
        }, 1000);
      }
    },
  });

  useEffect(() => {
    if (editor && data?.chapter?.contentHtml) {
      editor.commands.setContent(data.chapter.contentHtml);
    }
  }, [editor, data, chapterId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!editor) {
    return null;
  }

  if (!chapterId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Please select a chapter to edit</div>
      </div>
    );
  }

  return (
    <div className="editor-container h-full flex flex-col">
      {updateError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-2">
          Error saving: {updateError.message}
        </div>
      )}
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

