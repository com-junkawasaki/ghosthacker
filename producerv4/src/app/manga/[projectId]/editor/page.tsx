/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-manga-page
 * 
 * Manga editor page
 */
'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Stage as KonvaStageType } from 'konva';
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

export default function MangaEditorPage({
  params,
}: {
  params: { projectId: string };
}) {
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(1.0);
  const [selectedPageId, setSelectedPageId] = useState<string>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [speechBubbles, setSpeechBubbles] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }>>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const stageRef = useRef<KonvaStageType | null>(null);
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo(stageRef);

  // Mock data
  const pages = [
    { id: '1', pageNumber: 3 },
    { id: '2', pageNumber: 4 },
  ];

  const layers = [
    { id: '1', name: 'Panel', visible: true },
    { id: '2', name: 'Panel', visible: true },
  ];

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
    setSpeechBubbles((prev: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      speaker?: string;
      bubbleType: 'speech' | 'thought' | 'shout';
    }>) =>
      prev.map((b) => (b.id === bubble.id ? { ...b, ...bubble } : b))
    );
    saveState();
  };

  const handleBubbleDelete = (id: string) => {
    setSpeechBubbles((prev: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      speaker?: string;
      bubbleType: 'speech' | 'thought' | 'shout';
    }>) => prev.filter((b) => b.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(undefined);
    }
    saveState();
  };

  const selectedBubble = speechBubbles.find((b: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => b.id === selectedNodeId);

  return (
    <div className="h-screen flex flex-col">
      <TopBar onExport={handleExport} />
      <div className="flex-1 flex overflow-hidden">
        <PageSidebar
          pages={pages}
          selectedPageId={selectedPageId}
          onPageSelect={setSelectedPageId}
          layers={layers}
        />
        <div className="flex-1 relative">
          <CanvasArea
            width={1200}
            height={1800}
            selectedTool={selectedTool}
            selectedNodeId={selectedNodeId}
            speechBubbles={speechBubbles}
            onStageUpdate={handleStageUpdate}
            onNodeSelect={setSelectedNodeId}
            stageRef={stageRef}
          />
        </div>
        <RightSidebar
          selectedBubble={selectedBubble}
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

