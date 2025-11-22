/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/shape-layer
 * 
 * Shape layer component for rect and circle tools
 */
'use client';

import { useRef, useEffect } from 'react';
import { Layer, Rect, Circle } from 'react-konva';
import { Layer as KonvaLayer } from 'konva';

interface ShapeLayerProps {
  tool: 'rect' | 'circle';
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  onShapeComplete?: (shape: { type: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number }) => void;
}

export function ShapeLayer({
  tool,
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 2,
  onShapeComplete,
}: ShapeLayerProps) {
  const layerRef = useRef<KonvaLayer>(null);
  const isDrawing = useRef(false);
  const currentShape = useRef<Rect | Circle | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: any) => {
    if (tool !== 'rect' && tool !== 'circle') return;

    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos || !layerRef.current) return;

    startPos.current = { x: pos.x, y: pos.y };

    if (tool === 'rect') {
      const rect = new Rect({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
      });
      layerRef.current.add(rect);
      currentShape.current = rect as any;
    } else {
      const circle = new Circle({
        x: pos.x,
        y: pos.y,
        radius: 0,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
      });
      layerRef.current.add(circle);
      currentShape.current = circle as any;
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !currentShape.current || !startPos.current) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (tool === 'rect') {
      const rect = currentShape.current as Rect;
      rect.x(Math.min(startPos.current.x, pos.x));
      rect.y(Math.min(startPos.current.y, pos.y));
      rect.width(Math.abs(pos.x - startPos.current.x));
      rect.height(Math.abs(pos.y - startPos.current.y));
    } else {
      const circle = currentShape.current as Circle;
      const radius = Math.sqrt(
        Math.pow(pos.x - startPos.current.x, 2) + Math.pow(pos.y - startPos.current.y, 2)
      );
      circle.radius(radius);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current && currentShape.current && startPos.current) {
      if (tool === 'rect') {
        const rect = currentShape.current as Rect;
        onShapeComplete?.({
          type: 'rect',
          x: rect.x(),
          y: rect.y(),
          width: rect.width(),
          height: rect.height(),
        });
      } else {
        const circle = currentShape.current as Circle;
        onShapeComplete?.({
          type: 'circle',
          x: circle.x(),
          y: circle.y(),
          radius: circle.radius(),
        });
      }
      isDrawing.current = false;
      currentShape.current = null;
      startPos.current = null;
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
  }, [tool, strokeColor, fillColor, strokeWidth]);

  return <Layer ref={layerRef} />;
}

