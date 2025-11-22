/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-manga-page
 * 
 * Manga editor page
 */
'use client';

import { useState } from 'react';
import { TopBar } from '@/components/manga/editor/header/TopBar';
import { PageSidebar } from '@/components/manga/editor/sidebar/PageSidebar';
import { RightSidebar } from '@/components/manga/editor/sidebar/RightSidebar';
import { CanvasArea } from '@/components/manga/editor/canvas/CanvasArea';
import { BottomToolbar } from '@/components/manga/editor/toolbar/BottomToolbar';
import { SaveLoadControls } from '@/components/manga/editor/bottom-right/SaveLoadControls';
import { ZoomControls } from '@/components/manga/editor/bottom-right/ZoomControls';
import { HelpButton } from '@/components/manga/editor/bottom-right/HelpButton';

export default function MangaEditorPage({
  params,
}: {
  params: { projectId: string };
}) {
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [zoom, setZoom] = useState(1.0);
  const [selectedPageId, setSelectedPageId] = useState<string>();

  // Mock data
  const pages = [
    { id: '1', pageNumber: 3 },
    { id: '2', pageNumber: 4 },
  ];

  const layers = [
    { id: '1', name: 'Panel', visible: true },
    { id: '2', name: 'Panel', visible: true },
  ];

  return (
    <div className="h-screen flex flex-col">
      <TopBar onExport={() => console.log('Export')} />
      <div className="flex-1 flex overflow-hidden">
        <PageSidebar
          pages={pages}
          selectedPageId={selectedPageId}
          onPageSelect={setSelectedPageId}
          layers={layers}
        />
        <div className="flex-1 relative">
          <CanvasArea width={1200} height={1800} />
        </div>
        <RightSidebar />
      </div>
      <div className="h-16 bg-gray-200 border-t border-gray-300 flex items-center justify-between px-4">
        <BottomToolbar selectedTool={selectedTool} onToolSelect={setSelectedTool} />
        <div className="flex items-center gap-4">
          <SaveLoadControls />
          <ZoomControls zoom={zoom} onZoomChange={setZoom} />
          <HelpButton />
        </div>
      </div>
    </div>
  );
}

