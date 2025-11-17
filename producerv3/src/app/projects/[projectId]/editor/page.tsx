/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * EPUB Editor page with Tiptap editor
 */
import { EditorLayout } from './EditorLayout';

interface EditorPageProps {
  params: {
    projectId: string;
  };
}

export default function EditorPage({ params }: EditorPageProps) {
  return <EditorLayout projectId={params.projectId} />;
}

