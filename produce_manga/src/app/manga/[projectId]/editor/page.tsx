/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-manga-page
 * 
 * Manga editor page with GraphQL data fetching and ts-pattern type safety
 */
'use client';

import { useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type Konva from 'konva';
type KonvaStageType = Konva.Stage;
import { useQuery, gql } from '@apollo/client';
import { TopBar } from '@/components/manga/editor/header/TopBar';
import { PageSidebar } from '@/components/manga/editor/sidebar/PageSidebar';
import { RightSidebar } from '@/components/manga/editor/sidebar/RightSidebar';
import { useMangaEditorMachine } from '@/hooks/useMangaEditorMachine';

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
import { DebugPanel } from '@/components/manga/editor/debug/DebugPanel';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { exportStageAsPNG, exportStageAsJPEG, exportStageAsPDF } from '@/lib/export/imageExport';
import { ToolType } from '@/lib/konva/tools';
import { AIModel } from '@/lib/ai/modelBrowser';
import type { 
  MangaPage, 
  MangaPanel, 
  CanvasPanel, 
  SpeechBubble,
  DataState,
  BubbleSelectionState,
  PanelSelectionState
} from '@/types/manga';
import { toPanelImageSource, matchDataState, matchBubbleSelection, matchPanelSelection } from '@/types/manga';

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

const MANGA_SCRIPTS_QUERY = gql`
  query MangaScripts($projectId: ID!) {
    mangaScripts(projectId: $projectId) {
      id
      projectId
      scriptId
      title
      pageCount
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
  // Use XState machine for state management
  const { snapshot, send, actions, data: machineData, editor: machineEditor } = useMangaEditorMachine(params.projectId);
  const stageRef = useRef<KonvaStageType | null>(null);
  const prevStageRef = useRef<KonvaStageType | null>(null);
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo(stageRef);
  
  // Update stage ref in machine when it changes (using previous value comparison to prevent infinite loops)
  // actions is memoized, so it's safe to include in dependency array
  useEffect(() => {
    if (stageRef.current && stageRef.current !== prevStageRef.current) {
      prevStageRef.current = stageRef.current;
      actions.setStageRef(stageRef.current);
    }
  }, [actions]);

  // Fetch project data
  const { data: projectData, loading: projectLoading, error: projectError } = useQuery(MANGA_PROJECT_QUERY, {
    variables: { id: params.projectId },
    skip: !params.projectId,
  });

  // Send project loaded event to machine
  useEffect(() => {
    if (projectData?.mangaProject) {
      send({ type: 'PROJECT_LOADED', project: projectData.mangaProject });
    }
    if (projectError) {
      send({ type: 'PROJECT_ERROR', error: projectError });
    }
  }, [projectData, projectError, send]);

  // Fetch scripts for the project
  const { data: scriptsData, loading: scriptsLoading, error: scriptsError } = useQuery(MANGA_SCRIPTS_QUERY, {
    variables: { projectId: params.projectId },
    skip: !params.projectId,
  });

  // Send scripts loaded event to machine
  useEffect(() => {
    if (scriptsData?.mangaScripts) {
      send({ type: 'SCRIPTS_LOADED', scripts: scriptsData.mangaScripts });
    }
    if (scriptsError) {
      send({ type: 'SCRIPTS_ERROR', error: scriptsError });
    }
  }, [scriptsData, scriptsError, send]);

  // Get the first script ID from machine context
  const scriptId = machineData.selectedScriptId;

  // Fetch pages data
  const { data: pagesData, loading: pagesLoading, error: pagesError } = useQuery(MANGA_PAGES_QUERY, {
    variables: { scriptId: scriptId || '' },
    skip: !scriptId,
  });

  // Send pages loaded event to machine
  useEffect(() => {
    if (pagesData?.mangaPages) {
      send({ type: 'PAGES_LOADED', pages: pagesData.mangaPages });
    }
    if (pagesError) {
      send({ type: 'PAGES_ERROR', error: pagesError });
    }
  }, [pagesData, pagesError, send]);

  // Get selected page ID from machine context
  const selectedPageId = machineData.selectedPageId;

  // Fetch panels data for selected page
  const { data: panelsData, loading: panelsLoading, error: panelsError } = useQuery(MANGA_PANELS_QUERY, {
    variables: { pageId: selectedPageId || '' },
    skip: !selectedPageId,
    fetchPolicy: 'cache-and-network',
  });

  // Send panels loaded event to machine
  useEffect(() => {
    if (panelsData?.mangaPanels) {
      send({ type: 'PANELS_LOADED', panels: panelsData.mangaPanels });
    }
    if (panelsError) {
      send({ type: 'PANELS_ERROR', error: panelsError });
    }
  }, [panelsData, panelsError, send]);
  
  // Debug: Log selectedPageId and panels query state
  useEffect(() => {
    if (selectedPageId) {
      console.log('Selected page ID:', selectedPageId);
      console.log('Panels loading:', panelsLoading);
      console.log('Panels data:', panelsData);
      console.log('Panels error:', panelsError);
    } else {
      console.log('No page selected - panels query skipped');
    }
  }, [selectedPageId, panelsLoading, panelsData, panelsError]);

  // Convert pages data to component format
  const pages = useMemo(() => {
    if (!pagesData?.mangaPages) return [];
    return pagesData.mangaPages.map((page: MangaPage) => ({
      id: page.id, // Use UUID id, not pageId (TEXT)
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
        
        // Convert dialogue to speech bubbles and add to machine
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
          // Check if bubble already exists in machine context
          const exists = machineEditor.speechBubbles.find((b) => b.id === bubble.id);
          if (!exists) {
            actions.addSpeechBubble(bubble);
          }
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
  }, [panelsData, actions, machineEditor.speechBubbles]);

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
    // If project is still loading, show loading
    if (projectLoading) {
      return { status: 'loading' };
    }
    
    // If project failed to load, show error
    if (projectError) {
      return { 
        status: 'error', 
        error: new Error(projectError.message || 'Failed to load project')
      };
    }
    
    // If scripts are still loading, show loading
    if (scriptsLoading) {
      return { status: 'loading' };
    }
    
    // If scripts failed to load, show error
    if (scriptsError) {
      return { 
        status: 'error', 
        error: new Error(scriptsError.message || 'Failed to load scripts')
      };
    }
    
    // If no script exists, return success with empty data (user needs to generate story)
    if (!scriptId) {
      return { 
        status: 'success', 
        data: { pages: [], panels: [] }
      };
    }
    
    // If pages are still loading, show loading
    if (pagesLoading) {
      return { status: 'loading' };
    }
    
    // If pages failed to load, show error
    if (pagesError) {
      return { 
        status: 'error', 
        error: new Error(pagesError.message || 'Failed to load pages')
      };
    }
    
    // If panels are loading for selected page, show loading
    if (selectedPageId && panelsLoading) {
      return { status: 'loading' };
    }
    
    // If panels failed to load, show error
    if (selectedPageId && panelsError) {
      return { 
        status: 'error', 
        error: new Error(panelsError.message || 'Failed to load panels')
      };
    }
    
    // All data loaded successfully
    return { 
      status: 'success', 
      data: { pages, panels: canvasPanels }
    };
  }, [
    projectLoading, 
    scriptsLoading, 
    pagesLoading, 
    panelsLoading, 
    projectError, 
    scriptsError,
    pagesError, 
    panelsError, 
    pages, 
    canvasPanels, 
    selectedPageId,
    scriptId
  ]);

  // Auto-select first page if available (handled by machine when PAGES_LOADED event is sent)

  const handleExport = async (format: 'png' | 'jpeg' | 'pdf', resolution?: number) => {
    if (!stageRef.current) return;

    actions.startExport(format);
    try {
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
      actions.completeExport();
    } catch (error) {
      actions.errorExport(error instanceof Error ? error : new Error('Export failed'));
    }
  };

  const handleStageUpdate = (stageJson: Record<string, unknown>) => {
    saveState();
  };

  const handleAddSpeechBubble = () => {
    const newBubble: SpeechBubble = {
      id: `bubble-${Date.now()}`,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      text: 'セリフを入力',
      bubbleType: 'speech',
    };
    actions.addSpeechBubble(newBubble);
    saveState();
  };

  const handleBubbleSave = (bubble: {
    id: string;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => {
    actions.updateSpeechBubble(bubble.id, bubble);
    saveState();
  };

  const handleBubbleDelete = (id: string) => {
    actions.deleteSpeechBubble(id);
    saveState();
  };

  // Get state from machine
  const selectedNodeId = machineEditor.selectedNodeId;
  const speechBubbles = machineEditor.speechBubbles;
  const selectedTool = machineEditor.selectedTool;
  const zoom = machineEditor.zoom;

  // Convert selectedBubble to BubbleSelectionState union type
  const bubbleSelectionState: BubbleSelectionState = useMemo(() => {
    const bubble = speechBubbles.find((b) => b.id === selectedNodeId);
    if (!bubble) {
      return { type: 'none' };
    }
    return { type: 'selected', bubble };
  }, [speechBubbles, selectedNodeId]);

  // Convert selectedPanel to PanelSelectionState union type
  const panelSelectionState: PanelSelectionState = useMemo(() => {
    if (!selectedNodeId) {
      return { type: 'none' };
    }
    // Check if selectedNodeId is a panel (not a bubble)
    const isPanel = canvasPanels.some((p) => p.id === selectedNodeId);
    if (!isPanel) {
      return { type: 'none' };
    }
    return {
      type: 'selected',
      panel: {
        id: selectedNodeId,
        order: 1, // TODO: Get actual order from panel data
        hideBorder: false, // TODO: Get actual value from panel data
        ignoreNeighborPanels: false, // TODO: Get actual value from panel data
      },
    };
  }, [selectedNodeId, canvasPanels]);

  // Render based on data state using ts-pattern
  const content = matchDataState(dataState, {
    idle: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-600">プロジェクトを読み込み中...</div>
      </div>
    ),
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    ),
    error: (error: Error) => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-red-600 p-4 bg-red-50 rounded">
          <div className="font-semibold mb-2">エラーが発生しました</div>
          <div>{error.message}</div>
        </div>
      </div>
    ),
    success: (data: { pages: typeof pages; panels: typeof canvasPanels }) => {
      // If no script exists, show message to generate story
      if (!scriptId) {
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">ストーリーがまだ生成されていません</h2>
              <p className="text-gray-600 mb-6">
                右側のサイドバーから「ストーリーを生成」ボタンをクリックして、マンガのストーリーとページを生成してください。
              </p>
            </div>
          </div>
        );
      }
      
      // If no pages exist, show message
      if (data.pages.length === 0) {
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">ページがまだ生成されていません</h2>
              <p className="text-gray-600 mb-6">
                右側のサイドバーから「ストーリーを生成」ボタンをクリックして、マンガのページを生成してください。
              </p>
            </div>
          </div>
        );
      }
      
      // Always show PageSidebar and CanvasArea if pages exist
      const pageSidebarProps = selectedPageId 
        ? { pages: data.pages, selectedPageId, onPageSelect: (pageId: string) => actions.selectPage(pageId), layers }
        : { pages: data.pages, onPageSelect: (pageId: string) => actions.selectPage(pageId), layers };
      
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
        onStageUpdate: (stageJson: Record<string, unknown>) => {
          actions.updateStage(stageJson);
          handleStageUpdate(stageJson);
        },
        onNodeSelect: (nodeId: string | undefined) => {
          if (nodeId) {
            actions.selectNode(nodeId);
          } else {
            actions.deselectNode();
          }
        },
        stageRef: stageRef as React.RefObject<KonvaStageType>,
        // XState Konva actions
        onDrawingStart: actions.startDrawing,
        onDrawingMove: actions.moveDrawing,
        onDrawingComplete: actions.completeDrawing,
        onDrawingCancel: actions.cancelDrawing,
        onShapeStart: actions.startShape,
        onShapeMove: actions.moveShape,
        onShapeComplete: actions.completeShape,
        onShapeCancel: actions.cancelShape,
        onTextStart: actions.startText,
        onTextUpdate: actions.updateText,
        onTextComplete: actions.completeText,
        onTextCancel: actions.cancelText,
        onStageClick: actions.clickStage,
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
          projectId={params.projectId}
          selectedBubble={matchBubbleSelection(bubbleSelectionState, {
            none: () => undefined,
            selected: (bubble) => bubble,
          })}
          selectedPanel={matchPanelSelection(panelSelectionState, {
            none: () => undefined,
            selected: (panel) => panel,
          })}
          panelLayers={[
            { id: 'image', name: 'Image', type: 'image', visible: true },
            { id: 'dialogue', name: 'Dialogue', type: 'dialogue', visible: true },
          ]}
          onBubbleSave={handleBubbleSave}
          onBubbleDelete={handleBubbleDelete}
          onPanelSettingsChange={(settings) => {
            console.log('Panel settings changed:', settings);
            // TODO: Implement panel settings update mutation
          }}
          onLayerToggle={(layerId, visible) => {
            console.log('Layer toggle:', layerId, visible);
            // TODO: Implement layer visibility update
          }}
          onModelSelect={(model) => {
            console.log('Selected model:', model);
            // Model selection is handled locally in the component
          }}
          onStoryGenerated={() => {
            // Refetch queries to update the UI
            // Apollo Client will automatically refetch due to refetchQueries in mutation
            console.log('Story generated successfully');
          }}
        />
        <DebugPanel
          projectState={{
            loading: projectLoading,
            error: projectError ? new Error(projectError.message || 'Unknown error') : undefined,
            data: projectData?.mangaProject,
          }}
          scriptsState={{
            loading: scriptsLoading,
            error: scriptsError ? new Error(scriptsError.message || 'Unknown error') : undefined,
            data: scriptsData?.mangaScripts,
          }}
          pagesState={{
            loading: pagesLoading,
            error: pagesError ? new Error(pagesError.message || 'Unknown error') : undefined,
            data: pagesData?.mangaPages,
          }}
          panelsState={{
            loading: panelsLoading,
            error: panelsError ? new Error(panelsError.message || 'Unknown error') : undefined,
            data: panelsData?.mangaPanels,
          }}
          canvasState={{
            panelsCount: canvasPanels.length,
            selectedNodeId: selectedNodeId,
            speechBubblesCount: speechBubbles.length,
            stageWidth: 1200,
            stageHeight: 1800,
            zoom: zoom,
            selectedTool: selectedTool,
          }}
          scriptId={scriptId}
          selectedPageId={selectedPageId}
          snapshot={snapshot}
          send={send}
          projectId={params.projectId}
        />
      </div>
      <div className="h-16 bg-gray-200 border-t border-gray-300 flex items-center justify-between px-4">
        <BottomToolbar selectedTool={selectedTool} onToolSelect={(tool) => actions.selectTool(tool as ToolType)} />
        <div className="flex items-center gap-4">
          <SaveLoadControls />
          <ZoomControls zoom={zoom} onZoomChange={(newZoom) => actions.setZoom(newZoom)} />
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

