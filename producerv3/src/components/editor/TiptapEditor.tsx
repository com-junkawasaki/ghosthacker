/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * Main Tiptap editor component for EPUB content editing
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
// @ts-ignore - Apollo Client CommonJS import workaround
import pkg from '@apollo/client';
const { useQuery, useMutation } = pkg;
import { GET_CHAPTER } from '../../lib/graphql/queries';
import { UPDATE_CHAPTER } from '../../lib/graphql/mutations';

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
    content: data?.chapter?.content_html || '',
    onUpdate: ({ editor }) => {
      if (chapterId) {
        updateChapter({
          variables: {
            input: {
              id: chapterId,
              content_html: editor.getHTML(),
            },
          },
        });
      }
    },
  });

  useEffect(() => {
    if (editor && data?.chapter?.content_html) {
      editor.commands.setContent(data.chapter.content_html);
    }
  }, [editor, data]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        >
          H2
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

