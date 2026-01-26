/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/drawing-layer
 * 
 * Drawing layer component for pen and eraser tools
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import type { Layer as KonvaLayerType } from 'konva';

interface DrawingLayerProps {
  tool: 'pen' | 'eraser';
  color?: string;
  strokeWidth?: number;
  onDrawingComplete?: ((points: number[]) => void) | ((lineId: string, points: number[]) => void);
  onDrawingStart?: (x: number, y: number, color?: string, strokeWidth?: number) => void;
  onDrawingMove?: (x: number, y: number) => void;
  onDrawingCancel?: () => void;
}

interface PressurePoint {
  x: number;
  y: number;
  pressure: number;
  width: number;
}

export function DrawingLayer({
  tool,
  color = '#000000',
  strokeWidth = 2,
  onDrawingComplete,
  onDrawingStart,
  onDrawingMove,
  onDrawingCancel,
}: DrawingLayerProps) {
  const layerRef = useRef<KonvaLayerType | null>(null);
  const isDrawing = useRef(false);
  const currentLine = useRef<any>(null);
  const pressurePoints = useRef<PressurePoint[]>([]);
  const lines = useRef<Array<{ points: number[]; color: string; strokeWidth: number }>>([]);
  const [Layer, setLayer] = useState<any>(null);
  const [Line, setLine] = useState<any>(null);
  
  // Helper function to get pressure from PointerEvent
  const getPressure = (e: any): number => {
    // Check if PointerEvent is available (Apple Pencil, stylus, etc.)
    if (e.evt && typeof (e.evt as PointerEvent).pressure === 'number') {
      const pressure = (e.evt as PointerEvent).pressure;
      // Pressure ranges from 0.0 to 1.0, but some devices may return values outside this range
      return Math.max(0.0, Math.min(1.0, pressure));
    }
    // Default pressure for mouse/touch without pressure support
    return 0.5;
  };
  
  // Calculate stroke width based on pressure
  const calculateStrokeWidth = (pressure: number, baseWidth: number, isEraser: boolean): number => {
    // Pressure ranges from 0.0 to 1.0
    // For pen: min 30% of base width, max 200% of base width
    // For eraser: min 50% of base width, max 300% of base width
    const minMultiplier = isEraser ? 0.5 : 0.3;
    const maxMultiplier = isEraser ? 3.0 : 2.0;
    const multiplier = minMultiplier + pressure * (maxMultiplier - minMultiplier);
    return baseWidth * multiplier;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-konva').then((mod) => {
        setLayer(() => mod.Layer);
        setLine(() => mod.Line);
      });
    }
  }, []);

  const handleMouseDown = async (e: any) => {
    if (tool !== 'pen' && tool !== 'eraser' || !Line || typeof window === 'undefined') return;

    isDrawing.current = true;
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Get pressure from PointerEvent (Apple Pencil support)
    const pressure = getPressure(e);
    const lineColor = tool === 'eraser' ? '#ffffff' : color;
    const lineWidth = calculateStrokeWidth(pressure, strokeWidth, tool === 'eraser');

    // Store pressure point
    pressurePoints.current = [{
      x: pos.x,
      y: pos.y,
      pressure,
      width: lineWidth,
    }];

    // Notify XState
    onDrawingStart?.(pos.x, pos.y, lineColor, lineWidth);

    const LineClass = Line;
    const line = new LineClass({
      points: [pos.x, pos.y],
      stroke: lineColor,
      strokeWidth: lineWidth,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
      // Enable tension for smoother curves with pressure variation
      tension: 0.5,
      // Use bezier curves for smoother pressure transitions
      bezier: false,
    });

    if (layerRef.current) {
      layerRef.current.add(line);
      currentLine.current = line;
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !currentLine.current) return;

    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Get pressure from PointerEvent (Apple Pencil support)
    const pressure = getPressure(e);
    const lineWidth = calculateStrokeWidth(pressure, strokeWidth, tool === 'eraser');

    // Store pressure point
    pressurePoints.current.push({
      x: pos.x,
      y: pos.y,
      pressure,
      width: lineWidth,
    });

    // Notify XState
    onDrawingMove?.(pos.x, pos.y);

    // Update line points
    const oldPoints = currentLine.current.points();
    const newPoints = [...oldPoints, pos.x, pos.y];
    currentLine.current.points(newPoints);
    
    // Update stroke width based on recent pressure points for smoother transitions
    // Use weighted average of last few points for more responsive pressure changes
    const recentPoints = pressurePoints.current.slice(-5); // Last 5 points
    const weightedPressure = recentPoints.reduce((sum, p, index) => {
      // Give more weight to recent points
      const weight = (index + 1) / recentPoints.length;
      return sum + p.pressure * weight;
    }, 0) / recentPoints.reduce((sum, _, index) => sum + (index + 1) / recentPoints.length, 0);
    
    const currentWidth = calculateStrokeWidth(weightedPressure, strokeWidth, tool === 'eraser');
    currentLine.current.strokeWidth(currentWidth);
    
    // Force redraw
    if (layerRef.current) {
      layerRef.current.draw();
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current && currentLine.current) {
      const points = currentLine.current.points();
      const lineId = currentLine.current.id();
      
      // Calculate average pressure for the completed line
      const avgPressure = pressurePoints.current.length > 0
        ? pressurePoints.current.reduce((sum, p) => sum + p.pressure, 0) / pressurePoints.current.length
        : 0.5;
      const avgWidth = calculateStrokeWidth(avgPressure, strokeWidth, tool === 'eraser');
      
      // Update final stroke width
      currentLine.current.strokeWidth(avgWidth);
      
      lines.current.push({
        points,
        color: tool === 'eraser' ? '#ffffff' : color,
        strokeWidth: avgWidth,
      });
      
      // Call callback with lineId and points for XState
      if (onDrawingComplete) {
        if (onDrawingComplete.length === 2) {
          (onDrawingComplete as (lineId: string, points: number[]) => void)(lineId, points);
        } else {
          (onDrawingComplete as (points: number[]) => void)(points);
        }
      }
      
      // Reset pressure points for next stroke
      pressurePoints.current = [];
      isDrawing.current = false;
      currentLine.current = null;
    } else if (isDrawing.current) {
      // Cancel drawing if no line was created
      pressurePoints.current = [];
      onDrawingCancel?.();
      isDrawing.current = false;
    }
  };

  useEffect(() => {
    const stage = layerRef.current?.getStage();
    if (!stage) return;

    // Use pointer events for Apple Pencil pressure support
    // Konva.js supports pointer events through the same event names
    stage.on('mousedown', handleMouseDown);
    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
    stage.on('mouseleave', () => {
      if (isDrawing.current) {
        handleMouseUp();
        onDrawingCancel?.();
      }
    });
    
    // Also listen to pointer events for better Apple Pencil support
    // Note: Konva.js maps pointer events to mouse events, but we can access the native event
    stage.on('pointerdown', handleMouseDown);
    stage.on('pointermove', handleMouseMove);
    stage.on('pointerup', handleMouseUp);
    stage.on('pointerleave', () => {
      if (isDrawing.current) {
        handleMouseUp();
        onDrawingCancel?.();
      }
    });

    return () => {
      stage.off('mousedown', handleMouseDown);
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      stage.off('mouseleave', handleMouseUp);
      stage.off('pointerdown', handleMouseDown);
      stage.off('pointermove', handleMouseMove);
      stage.off('pointerup', handleMouseUp);
      stage.off('pointerleave', handleMouseUp);
    };
  }, [tool, color, strokeWidth, onDrawingStart, onDrawingMove, onDrawingComplete, onDrawingCancel]);

  if (!Layer) {
    return null;
  }

  const LayerComponent = Layer;
  return <LayerComponent ref={layerRef} />;
}

