/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/canvas-area
 * 
 * Canvas area component using Konva
 */
'use client';

import { useRef, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { Stage as KonvaStage } from 'konva';
import { PanelLayer } from './konva/PanelLayer';

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
  }>;
  onStageUpdate?: (stageJson: Record<string, unknown>) => void;
}

export function CanvasArea({ 
  width, 
  height, 
  konvaStageJson, 
  panels = [],
  onStageUpdate,
}: CanvasAreaProps) {
  const stageRef = useRef<KonvaStage>(null);

  useEffect(() => {
    if (konvaStageJson && stageRef.current) {
      // Load stage from JSON
      const stage = stageRef.current;
      stage.destroy();
      const newStage = KonvaStage.create(konvaStageJson);
      Object.assign(stage, newStage);
    }
  }, [konvaStageJson]);

  const handleStageUpdate = () => {
    if (stageRef.current && onStageUpdate) {
      const stageJson = stageRef.current.toJSON();
      onStageUpdate(stageJson);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 overflow-auto p-4">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        className="bg-white shadow-lg"
        onMouseDown={handleStageUpdate}
        onMouseUp={handleStageUpdate}
        onTouchStart={handleStageUpdate}
        onTouchEnd={handleStageUpdate}
      >
        <Layer>
          <PanelLayer panels={panels} />
        </Layer>
      </Stage>
    </div>
  );
}

