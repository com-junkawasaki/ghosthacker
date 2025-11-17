/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content-layout
 * 
 * Editor layout component (Client Component)
 */
'use client';

import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { ChapterTree } from '@/components/editor/ChapterTree';
import { MetadataForm } from '@/components/editor/MetadataForm';
import { MediaLibrary } from '@/components/editor/MediaLibrary';
import { ApolloProvider } from '@/components/editor/ApolloProvider';
import { normalizeProjectId } from '@/lib/utils/uuid';

interface EditorLayoutProps {
  projectId: string;
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  // Normalize projectId to UUID format for GraphQL ID type
  const normalizedEpubId = normalizeProjectId(projectId);
  
  return (
    <ApolloProvider>
      <div className="flex h-screen">
        <aside className="w-[300px] border-r border-gray-300 p-4 overflow-y-auto">
          <ChapterTree epubId={normalizedEpubId} />
          <MetadataForm epubId={normalizedEpubId} />
          <MediaLibrary chapterId="" />
        </aside>
        <main className="flex-1 p-4 overflow-y-auto">
          <TiptapEditor projectId={projectId} />
        </main>
      </div>
    </ApolloProvider>
  );
}

