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
import { PanelLayer } from './konva/PanelLayer';
import { DrawingLayer } from './konva/DrawingLayer';
import { ShapeLayer } from './konva/ShapeLayer';
import { TextLayer } from './konva/TextLayer';
import { SelectionBox } from './konva/SelectionBox';
import { SpeechBubble } from './konva/SpeechBubble';
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

  // Dynamically import react-konva on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-konva').then((mod) => {
        setStage(() => mod.Stage);
        setLayer(() => mod.Layer);
      });
    }
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

  if (typeof window === 'undefined' || !Stage || !Layer) {
    return <div className="flex items-center justify-center h-full">読み込み中...</div>;
  }

  const StageComponent = Stage;
  const LayerComponent = Layer;

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
          <PanelLayer panels={panels} />
          {speechBubbles.map((bubble) => (
            <SpeechBubble
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
        {(selectedTool === 'pen' || selectedTool === 'eraser') && (
          <DrawingLayer tool={selectedTool} />
        )}
        {(selectedTool === 'rect' || selectedTool === 'circle') && (
          <ShapeLayer tool={selectedTool} />
        )}
        {selectedTool === 'text' && (
          <TextLayer />
        )}
        {selectedTool === 'select' && (
          <LayerComponent>
            <SelectionBox selectedNodeId={selectedNodeId} nodes={nodes} />
          </LayerComponent>
        )}
      </StageComponent>
    </div>
  );
}

// Export with dynamic import to avoid SSR issues
export default CanvasAreaComponent;
