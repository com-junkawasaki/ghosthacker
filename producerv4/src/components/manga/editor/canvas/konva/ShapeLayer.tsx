/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/shape-layer
 * 
 * Shape layer component for rect and circle tools
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import type { Layer as KonvaLayerType } from 'konva';

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
  const layerRef = useRef<KonvaLayerType | null>(null);
  const isDrawing = useRef(false);
  const currentShape = useRef<any>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const [Layer, setLayer] = useState<any>(null);
  const [Rect, setRect] = useState<any>(null);
  const [Circle, setCircle] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-konva').then((mod) => {
        setLayer(() => mod.Layer);
        setRect(() => mod.Rect);
        setCircle(() => mod.Circle);
      });
    }
  }, []);

  const handleMouseDown = async (e: any) => {
    if (tool !== 'rect' && tool !== 'circle' || !Rect || !Circle || typeof window === 'undefined') return;

    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos || !layerRef.current) return;

    startPos.current = { x: pos.x, y: pos.y };

    if (tool === 'rect') {
      const RectClass = Rect;
      const rect = new RectClass({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
      });
      layerRef.current.add(rect);
      currentShape.current = rect;
    } else {
      const CircleClass = Circle;
      const circle = new CircleClass({
        x: pos.x,
        y: pos.y,
        radius: 0,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth,
      });
      layerRef.current.add(circle);
      currentShape.current = circle;
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !currentShape.current || !startPos.current) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (tool === 'rect') {
      const rect = currentShape.current;
      rect.x(Math.min(startPos.current.x, pos.x));
      rect.y(Math.min(startPos.current.y, pos.y));
      rect.width(Math.abs(pos.x - startPos.current.x));
      rect.height(Math.abs(pos.y - startPos.current.y));
    } else {
      const circle = currentShape.current;
      const radius = Math.sqrt(
        Math.pow(pos.x - startPos.current.x, 2) + Math.pow(pos.y - startPos.current.y, 2)
      );
      circle.radius(radius);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current && currentShape.current && startPos.current) {
      if (tool === 'rect') {
        const rect = currentShape.current;
        onShapeComplete?.({
          type: 'rect',
          x: rect.x(),
          y: rect.y(),
          width: rect.width(),
          height: rect.height(),
        });
      } else {
        const circle = currentShape.current;
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

  if (!Layer) {
    return null;
  }

  const LayerComponent = Layer;
  return <LayerComponent ref={layerRef} />;
}

