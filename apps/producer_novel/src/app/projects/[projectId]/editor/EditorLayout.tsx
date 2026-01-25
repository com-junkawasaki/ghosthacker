/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content-layout
 * 
 * Editor layout component (Client Component)
 */
'use client';

import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { ChapterTree } from '@/components/editor/ChapterTree';
import { MetadataForm } from '@/components/editor/MetadataForm';
import { MediaLibrary } from '@/components/editor/MediaLibrary';
import { GraphPanel } from '@/components/editor/GraphPanel';
import { ApolloProvider } from '@/components/editor/ApolloProvider';
import { normalizeProjectId } from '@/lib/utils/uuid';

interface EditorLayoutProps {
  projectId: string;
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  // Normalize projectId to UUID format for GraphQL ID type
  const normalizedEpubId = normalizeProjectId(projectId);
  
  // State for selected chapter
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
  
  // State for graph panel visibility
  const [showGraphPanel, setShowGraphPanel] = useState(true);
  
  return (
    <ApolloProvider>
      <div className="flex h-screen">
        <PanelGroup direction="horizontal">
          {/* Left sidebar */}
          <Panel defaultSize={20} minSize={15} maxSize={30}>
            <aside className="h-full border-r border-gray-300 p-4 overflow-y-auto">
              <ChapterTree 
                epubId={normalizedEpubId} 
                onChapterSelect={setSelectedChapterId}
                selectedChapterId={selectedChapterId}
              />
              <MetadataForm epubId={normalizedEpubId} />
              <MediaLibrary chapterId={selectedChapterId || ''} />
            </aside>
          </Panel>

          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />

          {/* Main editor area */}
          <Panel defaultSize={showGraphPanel ? 50 : 80} minSize={30}>
            <main className="h-full p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Editor</h2>
                <button
                  type="button"
                  onClick={() => setShowGraphPanel(!showGraphPanel)}
                  className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  {showGraphPanel ? 'Hide Graph' : 'Show Graph'}
                </button>
              </div>
              <TiptapEditor 
                projectId={projectId} 
                chapterId={selectedChapterId}
                epubId={normalizedEpubId}
                onChapterSelect={setSelectedChapterId}
              />
            </main>
          </Panel>

          {/* Right graph panel */}
          {showGraphPanel && (
            <>
              <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />
              <Panel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full border-l border-gray-300 flex flex-col">
                  <div className="p-2 border-b border-gray-300 bg-gray-50">
                    <h3 className="text-sm font-semibold">Graph View</h3>
                  </div>
                  <div className="flex-1">
                    <GraphPanel projectId={projectId} />
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </ApolloProvider>
  );
}

