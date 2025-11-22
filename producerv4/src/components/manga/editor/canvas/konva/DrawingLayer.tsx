/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/drawing-layer
 * 
 * Drawing layer component for pen and eraser tools
 */
'use client';

import { useRef, useEffect } from 'react';
import { Layer, Line } from 'react-konva';
import { Layer as KonvaLayer } from 'konva';

interface DrawingLayerProps {
  tool: 'pen' | 'eraser';
  color?: string;
  strokeWidth?: number;
  onDrawingComplete?: (points: number[]) => void;
}

export function DrawingLayer({
  tool,
  color = '#000000',
  strokeWidth = 2,
  onDrawingComplete,
}: DrawingLayerProps) {
  const layerRef = useRef<KonvaLayer>(null);
  const isDrawing = useRef(false);
  const currentLine = useRef<Line | null>(null);
  const lines = useRef<Array<{ points: number[]; color: string; strokeWidth: number }>>([]);

  const handleMouseDown = (e: any) => {
    if (tool !== 'pen' && tool !== 'eraser') return;

    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const lineColor = tool === 'eraser' ? '#ffffff' : color;
    const lineWidth = tool === 'eraser' ? strokeWidth * 2 : strokeWidth;

    const line = new Line({
      points: [pos.x, pos.y],
      stroke: lineColor,
      strokeWidth: lineWidth,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
    });

    if (layerRef.current) {
      layerRef.current.add(line);
      currentLine.current = line as any;
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !currentLine.current) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const oldPoints = currentLine.current.points();
    const newPoints = [...oldPoints, pos.x, pos.y];
    currentLine.current.points(newPoints);
  };

  const handleMouseUp = () => {
    if (isDrawing.current && currentLine.current) {
      const points = currentLine.current.points();
      lines.current.push({
        points,
        color: tool === 'eraser' ? '#ffffff' : color,
        strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
      });
      onDrawingComplete?.(points);
      isDrawing.current = false;
      currentLine.current = null;
    }
  };

  useEffect(() => {
    const stage = layerRef.current?.getStage();
    if (!stage) return;

    stage.on('mousedown', handleMouseDown);
    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
    stage.on('mouseleave', handleMouseUp);

    return () => {
      stage.off('mousedown', handleMouseDown);
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      stage.off('mouseleave', handleMouseUp);
    };
  }, [tool, color, strokeWidth]);

  return <Layer ref={layerRef} />;
}

