/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/canvas-area
 * 
 * Canvas area component using Konva
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import type Konva from 'konva';
type KonvaStageType = Konva.Stage;
import { ToolType } from '@/lib/konva/tools';

interface CanvasAreaProps {
  width: number;
  height: number;
  konvaStageJson?: Record<string, unknown>;
  panels?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    imageUrl?: string;
    imageData?: string;
  }>;
  speechBubbles?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }>;
  selectedTool?: ToolType;
  selectedNodeId?: string;
  onStageUpdate?: (stageJson: Record<string, unknown>) => void;
  onNodeSelect?: (nodeId: string | undefined) => void;
  stageRef?: React.RefObject<KonvaStageType>;
}

function CanvasAreaComponent({ 
  width, 
  height, 
  konvaStageJson, 
  panels = [],
  speechBubbles = [],
  selectedTool = 'select',
  selectedNodeId,
  onStageUpdate,
  onNodeSelect,
  stageRef: externalStageRef,
}: CanvasAreaProps) {
  const internalStageRef = useRef<KonvaStageType>(null);
  const stageRef = externalStageRef || internalStageRef;
  const [nodes, setNodes] = useState<Array<{ id: string; node: any }>>([]);
  const [Stage, setStage] = useState<any>(null);
  const [Layer, setLayer] = useState<any>(null);
  const [PanelLayer, setPanelLayer] = useState<any>(null);
  const [DrawingLayer, setDrawingLayer] = useState<any>(null);
  const [ShapeLayer, setShapeLayer] = useState<any>(null);
  const [TextLayer, setTextLayer] = useState<any>(null);
  const [SelectionBox, setSelectionBox] = useState<any>(null);
  const [SpeechBubble, setSpeechBubble] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamically import react-konva and child components on client-side only
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadComponents = async () => {
      try {
        const [
          reactKonvaMod,
          panelLayerMod,
          drawingLayerMod,
          shapeLayerMod,
          textLayerMod,
          selectionBoxMod,
          speechBubbleMod,
        ] = await Promise.all([
          import('react-konva'),
          import('./konva/PanelLayer'),
          import('./konva/DrawingLayer'),
          import('./konva/ShapeLayer'),
          import('./konva/TextLayer'),
          import('./konva/SelectionBox'),
          import('./konva/SpeechBubble'),
        ]);

        if (!isMounted) return;

        setStage(() => reactKonvaMod.Stage);
        setLayer(() => reactKonvaMod.Layer);
        setPanelLayer(() => panelLayerMod.PanelLayer);
        setDrawingLayer(() => drawingLayerMod.DrawingLayer);
        setShapeLayer(() => shapeLayerMod.ShapeLayer);
        setTextLayer(() => textLayerMod.TextLayer);
        setSelectionBox(() => selectionBoxMod.SelectionBox);
        setSpeechBubble(() => speechBubbleMod.SpeechBubble);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load Konva components:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadComponents();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (konvaStageJson && stageRef.current && typeof window !== 'undefined') {
      // Load stage from JSON
      import('konva').then((KonvaModule) => {
        const stage = stageRef.current;
        if (stage && KonvaModule.default) {
          const Konva = KonvaModule.default;
          stage.destroy();
          const newStage = Konva.Stage.create(konvaStageJson);
          Object.assign(stage, newStage);
        }
      });
    }
  }, [konvaStageJson]);

  const handleStageUpdate = () => {
    if (stageRef.current && onStageUpdate) {
      const stageJson = stageRef.current.toJSON();
      onStageUpdate(stageJson);
    }
  };

  const handleStageClick = (e: any) => {
    // Deselect when clicking on empty area
    if (e.target === e.target.getStage()) {
      onNodeSelect?.(undefined);
    } else {
      // Select clicked node
      const nodeId = e.target.id();
      if (nodeId) {
        onNodeSelect?.(nodeId);
      }
    }
  };

  if (typeof window === 'undefined' || isLoading || !Stage || !Layer || !PanelLayer || !SpeechBubble) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  const StageComponent = Stage;
  const LayerComponent = Layer;
  const PanelLayerComponent = PanelLayer;
  const SpeechBubbleComponent = SpeechBubble;
  const DrawingLayerComponent = DrawingLayer;
  const ShapeLayerComponent = ShapeLayer;
  const TextLayerComponent = TextLayer;
  const SelectionBoxComponent = SelectionBox;

  try {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 overflow-auto p-4">
        <StageComponent
          ref={stageRef}
          width={width}
          height={height}
          className="bg-white shadow-lg"
          onClick={handleStageClick}
          onMouseDown={handleStageUpdate}
          onMouseUp={handleStageUpdate}
          onTouchStart={handleStageUpdate}
          onTouchEnd={handleStageUpdate}
        >
          <LayerComponent>
            <PanelLayerComponent panels={panels} />
            {speechBubbles.map((bubble) => (
              <SpeechBubbleComponent
                key={bubble.id}
                id={bubble.id}
                x={bubble.x}
                y={bubble.y}
                width={bubble.width}
                height={bubble.height}
                text={bubble.text}
                speaker={bubble.speaker}
                bubbleType={bubble.bubbleType}
                onClick={() => onNodeSelect?.(bubble.id)}
              />
            ))}
          </LayerComponent>
          {(selectedTool === 'pen' || selectedTool === 'eraser') && DrawingLayerComponent && (
            <DrawingLayerComponent tool={selectedTool} />
          )}
          {(selectedTool === 'rect' || selectedTool === 'circle') && ShapeLayerComponent && (
            <ShapeLayerComponent tool={selectedTool} />
          )}
          {selectedTool === 'text' && TextLayerComponent && (
            <TextLayerComponent />
          )}
          {selectedTool === 'select' && SelectionBoxComponent && (
            <LayerComponent>
              <SelectionBoxComponent selectedNodeId={selectedNodeId} nodes={nodes} />
            </LayerComponent>
          )}
        </StageComponent>
      </div>
    );
  } catch (error) {
    console.error('CanvasArea render error:', error);
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-red-600">エラーが発生しました: {error instanceof Error ? error.message : 'Unknown error'}</div>
      </div>
    );
  }
}

// Export with dynamic import to avoid SSR issues
export default CanvasAreaComponent;
