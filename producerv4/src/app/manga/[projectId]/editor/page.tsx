/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-manga-page
 * 
 * Manga editor page with GraphQL data fetching and ts-pattern type safety
 */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type Konva from 'konva';
type KonvaStageType = Konva.Stage;
import { useQuery, gql } from '@apollo/client';
import { TopBar } from '@/components/manga/editor/header/TopBar';
import { PageSidebar } from '@/components/manga/editor/sidebar/PageSidebar';
import { RightSidebar } from '@/components/manga/editor/sidebar/RightSidebar';

// Dynamically import CanvasArea to avoid SSR issues with Konva
const CanvasArea = dynamic(
  () => import('@/components/manga/editor/canvas/CanvasArea'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">読み込み中...</div>
  }
);
import { BottomToolbar } from '@/components/manga/editor/toolbar/BottomToolbar';
import { SaveLoadControls } from '@/components/manga/editor/bottom-right/SaveLoadControls';
import { ZoomControls } from '@/components/manga/editor/bottom-right/ZoomControls';
import { HelpButton } from '@/components/manga/editor/bottom-right/HelpButton';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { exportStageAsPNG, exportStageAsJPEG, exportStageAsPDF } from '@/lib/export/imageExport';
import { ToolType } from '@/lib/konva/tools';
import { AIModel } from '@/lib/ai/modelBrowser';
import type { 
  MangaPage, 
  MangaPanel, 
  CanvasPanel, 
  SpeechBubble,
  DataState
} from '@/types/manga';
import { toPanelImageSource, matchDataState } from '@/types/manga';

const MANGA_PROJECT_QUERY = gql`
  query MangaProject($id: ID!) {
    mangaProject(id: $id) {
      id
      title
      description
      createdAt
      updatedAt
    }
  }
`;

const MANGA_PAGES_QUERY = gql`
  query MangaPages($scriptId: ID!) {
    mangaPages(scriptId: $scriptId) {
      id
      pageId
      pageNumber
      width
      height
      konvaStageJson
      createdAt
      updatedAt
    }
  }
`;

const MANGA_PANELS_QUERY = gql`
  query MangaPanels($pageId: ID!) {
    mangaPanels(pageId: $pageId) {
      id
      panelId
      layout
      visual
      dialogue {
        speaker
        text
      }
      x
      y
      width
      height
      zIndex
      imageUrl
      imageBase64
      imageData
      createdAt
      updatedAt
    }
  }
`;

export default function MangaEditorPage({
  params,
}: {
  params: { projectId: string };
}) {
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(1.0);
  const [selectedPageId, setSelectedPageId] = useState<string>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([]);
  const [, setSelectedModel] = useState<AIModel | null>(null);
  const stageRef = useRef<KonvaStageType | null>(null);
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo(stageRef);

  // Fetch project data
  const { data: projectData, loading: projectLoading, error: projectError } = useQuery(MANGA_PROJECT_QUERY, {
    variables: { id: params.projectId },
    skip: !params.projectId,
  });

  // For now, we'll use a mock scriptId. In production, this should come from the project data
  const scriptId = projectData?.mangaProject?.id || params.projectId;

  // Fetch pages data
  const { data: pagesData, loading: pagesLoading, error: pagesError } = useQuery(MANGA_PAGES_QUERY, {
    variables: { scriptId },
    skip: !scriptId,
  });

  // Fetch panels data for selected page
  const { data: panelsData, loading: panelsLoading, error: panelsError } = useQuery(MANGA_PANELS_QUERY, {
    variables: { pageId: selectedPageId || '' },
    skip: !selectedPageId,
  });

  // Convert pages data to component format
  const pages = useMemo(() => {
    if (!pagesData?.mangaPages) return [];
    return pagesData.mangaPages.map((page: MangaPage) => ({
      id: page.pageId,
      pageNumber: page.pageNumber || 0,
    }));
  }, [pagesData]);

  // Convert panels data to canvas format using union types
  const canvasPanels: CanvasPanel[] = useMemo(() => {
    if (!panelsData?.mangaPanels) return [];
    
    return panelsData.mangaPanels
      .filter((panel: MangaPanel) => panel.x != null && panel.y != null && panel.width != null && panel.height != null)
      .map((panel: MangaPanel) => {
        const imageSource = toPanelImageSource(panel.imageUrl, panel.imageBase64, panel.imageData);
        
        // Convert dialogue to speech bubbles
        panel.dialogue.forEach((dialogue, index) => {
          const bubble: SpeechBubble = {
            id: `bubble-${panel.id}-${index}`,
            x: (panel.x || 0) + 20,
            y: (panel.y || 0) + (panel.height || 0) - 80 - (index * 100),
            width: (panel.width || 200) - 40,
            height: 60,
            text: dialogue.text,
            speaker: dialogue.speaker,
            bubbleType: 'speech',
          };
          setSpeechBubbles((prev) => {
            const exists = prev.find((b) => b.id === bubble.id);
            if (!exists) {
              return [...prev, bubble];
            }
            return prev;
          });
        });

        return {
          id: panel.id,
          x: panel.x || 0,
          y: panel.y || 0,
          width: panel.width || 200,
          height: panel.height || 200,
          imageSource,
        };
      });
  }, [panelsData]);

  // Derive layers from panels
  const layers = useMemo(() => {
    return canvasPanels.map((panel, index) => ({
      id: panel.id,
      name: `Panel ${index + 1}`,
      visible: true,
    }));
  }, [canvasPanels]);

  // Determine data loading state using ts-pattern
  const dataState: DataState<{ pages: typeof pages; panels: typeof canvasPanels }> = useMemo(() => {
    if (projectLoading || pagesLoading) {
      return { status: 'loading' };
    }
    if (projectError || pagesError) {
      return { 
        status: 'error', 
        error: new Error(projectError?.message || pagesError?.message || 'Failed to load data')
      };
    }
    if (selectedPageId && panelsLoading) {
      return { status: 'loading' };
    }
    if (selectedPageId && panelsError) {
      return { 
        status: 'error', 
        error: new Error(panelsError.message || 'Failed to load panels')
      };
    }
    return { 
      status: 'success', 
      data: { pages, panels: canvasPanels }
    };
  }, [projectLoading, pagesLoading, panelsLoading, projectError, pagesError, panelsError, pages, canvasPanels, selectedPageId]);

  // Auto-select first page if available
  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  const handleExport = async (format: 'png' | 'jpeg' | 'pdf', resolution?: number) => {
    if (!stageRef.current) return;

    const filename = `manga-page-${Date.now()}.${format === 'pdf' ? 'pdf' : format}`;
    switch (format) {
      case 'png':
        await exportStageAsPNG(stageRef.current, filename);
        break;
      case 'jpeg':
        await exportStageAsJPEG(stageRef.current, filename);
        break;
      case 'pdf':
        await exportStageAsPDF(stageRef.current, filename, resolution);
        break;
    }
  };

  const handleStageUpdate = (stageJson: Record<string, unknown>) => {
    saveState();
  };

  const handleAddSpeechBubble = () => {
    const newBubble = {
      id: `bubble-${Date.now()}`,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      text: 'セリフを入力',
      bubbleType: 'speech' as const,
    };
    setSpeechBubbles([...speechBubbles, newBubble]);
    setSelectedNodeId(newBubble.id);
    saveState();
  };

  const handleBubbleSave = (bubble: {
    id: string;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => {
    setSpeechBubbles((prev) =>
      prev.map((b) => (b.id === bubble.id ? { ...b, ...bubble } : b))
    );
    saveState();
  };

  const handleBubbleDelete = (id: string) => {
    setSpeechBubbles((prev) => prev.filter((b) => b.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(undefined);
    }
    saveState();
  };

  const selectedBubble = speechBubbles.find((b) => b.id === selectedNodeId);

  // Render based on data state using ts-pattern
  const content = matchDataState(dataState, {
    idle: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">プロジェクトを読み込み中...</div>
      </div>
    ),
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    ),
    error: (error: Error) => (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">エラー: {error.message}</div>
      </div>
    ),
    success: (data: { pages: typeof pages; panels: typeof canvasPanels }) => {
      const pageSidebarProps = selectedPageId 
        ? { pages: data.pages, selectedPageId, onPageSelect: setSelectedPageId, layers }
        : { pages: data.pages, onPageSelect: setSelectedPageId, layers };
      
      const canvasAreaProps = {
        width: 1200,
        height: 1800,
        panels: data.panels.map((panel: CanvasPanel) => {
          const result: {
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            imageUrl?: string;
            imageData?: string;
          } = {
            id: panel.id,
            x: panel.x,
            y: panel.y,
            width: panel.width,
            height: panel.height,
          };
          if (panel.imageSource.type === 'url') {
            result.imageUrl = panel.imageSource.value;
          }
          if (panel.imageSource.type === 'bytea' || panel.imageSource.type === 'base64') {
            result.imageData = panel.imageSource.value;
          }
          return result;
        }),
        selectedTool,
        selectedNodeId: selectedNodeId || undefined,
        speechBubbles,
        onStageUpdate: handleStageUpdate,
        onNodeSelect: setSelectedNodeId,
        stageRef: stageRef as React.RefObject<KonvaStageType>,
      };

      return (
        <>
          <PageSidebar {...pageSidebarProps} />
          <div className="flex-1 relative">
            <CanvasArea {...canvasAreaProps} />
          </div>
        </>
      );
    },
  });

  return (
    <div className="h-screen flex flex-col">
      <TopBar onExport={handleExport} />
      <div className="flex-1 flex overflow-hidden">
        {content}
        <RightSidebar
          {...(selectedBubble ? { selectedBubble } : {})}
          onBubbleSave={handleBubbleSave}
          onBubbleDelete={handleBubbleDelete}
          onModelSelect={(model) => {
            setSelectedModel(model);
            console.log('Selected model:', model);
          }}
        />
      </div>
      <div className="h-16 bg-gray-200 border-t border-gray-300 flex items-center justify-between px-4">
        <BottomToolbar selectedTool={selectedTool} onToolSelect={(tool) => setSelectedTool(tool as ToolType)} />
        <div className="flex items-center gap-4">
          <SaveLoadControls />
          <ZoomControls zoom={zoom} onZoomChange={setZoom} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className={`w-10 h-10 flex items-center justify-center rounded hover:bg-gray-300 ${
                canUndo ? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'
              }`}
              title="元に戻す"
            >
              <span className="text-lg">↶</span>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className={`w-10 h-10 flex items-center justify-center rounded hover:bg-gray-300 ${
                canRedo ? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'
              }`}
              title="やり直す"
            >
              <span className="text-lg">↷</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddSpeechBubble}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
          >
            吹き出しを追加
          </button>
          <HelpButton />
        </div>
      </div>
    </div>
  );
}

