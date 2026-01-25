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
  // XState actions
  onDrawingStart?: (x: number, y: number, color?: string, strokeWidth?: number) => void;
  onDrawingMove?: (x: number, y: number) => void;
  onDrawingComplete?: (lineId: string, points: number[]) => void;
  onDrawingCancel?: () => void;
  onShapeStart?: (x: number, y: number, shapeType: 'rect' | 'circle', strokeColor?: string, fillColor?: string, strokeWidth?: number) => void;
  onShapeMove?: (x: number, y: number) => void;
  onShapeComplete?: (shapeId: string, shape: { type: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number }) => void;
  onShapeCancel?: () => void;
  onTextStart?: (x: number, y: number, fontSize?: number, fontFamily?: string, fillColor?: string) => void;
  onTextUpdate?: (textId: string, text: string) => void;
  onTextComplete?: (textId: string) => void;
  onTextCancel?: () => void;
  onStageClick?: (x: number, y: number, targetId?: string) => void;
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
  onDrawingStart,
  onDrawingMove,
  onDrawingComplete,
  onDrawingCancel,
  onShapeStart,
  onShapeMove,
  onShapeComplete,
  onShapeCancel,
  onTextStart,
  onTextUpdate,
  onTextComplete,
  onTextCancel,
  onStageClick,
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
      // Note: We need to be careful not to destroy the stage as it breaks event listeners
      // Instead, we'll update the stage content by clearing and rebuilding layers
      import('konva').then((KonvaModule) => {
        const stage = stageRef.current;
        if (stage && KonvaModule.default) {
          const Konva = KonvaModule.default;
          try {
            // Clear existing layers first (but keep the stage itself)
            const layers = stage.getLayers();
            layers.forEach((layer) => {
              layer.destroy();
            });
            
            // Create a temporary stage from JSON to extract its layers
            const tempStage = Konva.Stage.create(konvaStageJson);
            
            // Copy layers from temp stage to actual stage
            const tempLayers = tempStage.getLayers();
            tempLayers.forEach((tempLayer) => {
              // Clone the layer to avoid destroying it when tempStage is destroyed
              const newLayer = tempLayer.clone();
              stage.add(newLayer);
            });
            
            // Update stage dimensions if they changed
            if (tempStage.width() !== stage.width() || tempStage.height() !== stage.height()) {
              stage.width(tempStage.width());
              stage.height(tempStage.height());
            }
            
            // Destroy the temporary stage (this won't affect the cloned layers)
            tempStage.destroy();
            
            // Force redraw
            stage.draw();
            
            console.log('konvaStageJson loaded successfully');
          } catch (error) {
            console.error('Failed to load konvaStageJson:', error);
          }
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
    const stage = e.target.getStage();
    if (!stage) {
      console.warn('Stage not found in handleStageClick');
      return;
    }
    
    const pos = stage.getPointerPosition();
    if (!pos) {
      console.warn('Pointer position not found in handleStageClick');
      return;
    }
    
    console.log('Stage clicked:', { target: e.target, pos, selectedTool });
    
    // Deselect when clicking on empty area
    if (e.target === stage || e.target === stage.getContent()) {
      console.log('Clicked on stage background, deselecting');
      onNodeSelect?.(undefined);
      onStageClick?.(pos.x, pos.y);
    } else {
      // Select clicked node
      const nodeId = e.target.id();
      console.log('Clicked on node:', { nodeId, targetType: e.target.getType() });
      if (nodeId) {
        onNodeSelect?.(nodeId);
        onStageClick?.(pos.x, pos.y, nodeId);
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
              onMouseDown={(e) => {
                console.log('Stage onMouseDown:', { selectedTool });
                handleStageUpdate();
              }}
              onMouseUp={(e) => {
                console.log('Stage onMouseUp:', { selectedTool });
                handleStageUpdate();
              }}
              onTouchStart={handleStageUpdate}
              onTouchEnd={handleStageUpdate}
              // Enable pointer events for Apple Pencil pressure support
              onPointerDown={(e) => {
                console.log('Stage onPointerDown:', { selectedTool, pressure: e.evt?.pressure });
                handleStageUpdate();
              }}
              onPointerUp={(e) => {
                console.log('Stage onPointerUp:', { selectedTool });
                handleStageUpdate();
              }}
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
                <DrawingLayerComponent 
                  tool={selectedTool}
                  onDrawingStart={onDrawingStart}
                  onDrawingMove={onDrawingMove}
                  onDrawingComplete={onDrawingComplete}
                  onDrawingCancel={onDrawingCancel}
                />
              )}
              {(selectedTool === 'rect' || selectedTool === 'circle') && ShapeLayerComponent && (
                <ShapeLayerComponent 
                  tool={selectedTool}
                  onShapeStart={onShapeStart}
                  onShapeMove={onShapeMove}
                  onShapeComplete={onShapeComplete}
                  onShapeCancel={onShapeCancel}
                />
              )}
              {selectedTool === 'text' && TextLayerComponent && (
                <TextLayerComponent
                  onTextStart={onTextStart}
                  onTextUpdate={onTextUpdate}
                  onTextComplete={onTextComplete}
                  onTextCancel={onTextCancel}
                />
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
