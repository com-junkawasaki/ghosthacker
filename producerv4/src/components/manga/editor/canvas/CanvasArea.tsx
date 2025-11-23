/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/canvas-area
 * 
 * Canvas area component using Konva
 */
'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import type Konva from 'konva';
type KonvaStageType = Konva.Stage;
import { ToolType } from '@/lib/konva/tools';
import type { ComponentLoadState } from '@/types/manga';
import { matchComponentLoadState } from '@/types/manga';

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
  selectedNodeId?: string | undefined;
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
  const [componentLoadState, setComponentLoadState] = useState<ComponentLoadState>({ status: 'loading' });

  // Dynamically import react-konva and child components on client-side only
  useEffect(() => {
    if (typeof window === 'undefined') {
      setComponentLoadState({ status: 'loading' });
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

        const components = {
          Stage: reactKonvaMod.Stage,
          Layer: reactKonvaMod.Layer,
          PanelLayer: panelLayerMod.PanelLayer,
          DrawingLayer: drawingLayerMod.DrawingLayer,
          ShapeLayer: shapeLayerMod.ShapeLayer,
          TextLayer: textLayerMod.TextLayer,
          SelectionBox: selectionBoxMod.SelectionBox,
          SpeechBubble: speechBubbleMod.SpeechBubble,
        };

        setComponentLoadState({ status: 'loaded', components });
      } catch (error) {
        console.error('Failed to load Konva components:', error);
        if (isMounted) {
          setComponentLoadState({ 
            status: 'error', 
            error: error instanceof Error ? error : new Error('Failed to load components') 
          });
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

  // Expose stageRef globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateGlobalStage = () => {
        if (stageRef.current) {
          (window as any).__KONVA_STAGE__ = stageRef.current;
        } else {
          delete (window as any).__KONVA_STAGE__;
        }
      };
      
      updateGlobalStage();
      
      // Update when stageRef changes
      const interval = setInterval(updateGlobalStage, 100);
      
      return () => {
        clearInterval(interval);
        delete (window as any).__KONVA_STAGE__;
      };
    }
  }, []);

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

  return matchComponentLoadState(componentLoadState, {
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    ),
    error: (error) => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-red-600">エラーが発生しました: {error.message}</div>
      </div>
    ),
    loaded: (components) => {
      const {
        Stage: StageComponent,
        Layer: LayerComponent,
        PanelLayer: PanelLayerComponent,
        DrawingLayer: DrawingLayerComponent,
        ShapeLayer: ShapeLayerComponent,
        TextLayer: TextLayerComponent,
        SelectionBox: SelectionBoxComponent,
        SpeechBubble: SpeechBubbleComponent,
      } = components;

      try {
        return (
          <div className="w-full h-full flex items-center justify-center bg-white overflow-auto p-4 border-2 border-blue-200">
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
    },
  });
}

// Export with dynamic import to avoid SSR issues
export default CanvasAreaComponent;
