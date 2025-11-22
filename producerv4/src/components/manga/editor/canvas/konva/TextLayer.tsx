/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/text-layer
 * 
 * Text layer component for text tool
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import type { Layer as KonvaLayerType } from 'konva';

interface TextLayerProps {
  fontSize?: number;
  fontFamily?: string;
  fillColor?: string;
  onTextComplete?: (text: { x: number; y: number; text: string }) => void;
}

export function TextLayer({
  fontSize = 16,
  fontFamily = 'sans-serif',
  fillColor = '#000000',
  onTextComplete,
}: TextLayerProps) {
  const layerRef = useRef<KonvaLayerType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const currentText = useRef<any>(null);
  const [Layer, setLayer] = useState<any>(null);
  const [Text, setText] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-konva').then((mod) => {
        setLayer(() => mod.Layer);
        setText(() => mod.Text);
      });
    }
  }, []);

  const handleMouseDown = async (e: any) => {
    if (isEditing || !Text || typeof window === 'undefined') return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos || !layerRef.current) return;

    const TextClass = Text;
    const text = new TextClass({
      x: pos.x,
      y: pos.y,
      text: 'テキストを入力',
      fontSize,
      fontFamily,
      fill: fillColor,
      draggable: true,
    });

    layerRef.current.add(text);
    currentText.current = text;
    setIsEditing(true);

    // Focus on text node for editing
    const textNode = text as any;
    textNode.on('dblclick', () => {
      const stage = textNode.getStage();
      if (!stage) return;

      const textPosition = textNode.absolutePosition();
      const areaPosition = {
        x: stage.container().offsetLeft + textPosition.x,
        y: stage.container().offsetTop + textPosition.y,
      };

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = textNode.text();
      textarea.style.position = 'absolute';
      textarea.style.top = `${areaPosition.y}px`;
      textarea.style.left = `${areaPosition.x}px`;
      textarea.style.width = `${textNode.width()}px`;
      textarea.style.height = `${textNode.height()}px`;
      textarea.style.fontSize = `${textNode.fontSize()}px`;
      textarea.style.border = 'none';
      textarea.style.padding = '0px';
      textarea.style.margin = '0px';
      textarea.style.overflow = 'hidden';
      textarea.style.background = 'transparent';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.focus();

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          textNode.text(textarea.value);
          document.body.removeChild(textarea);
          setIsEditing(false);
          onTextComplete?.({
            x: textNode.x(),
            y: textNode.y(),
            text: textNode.text(),
          });
        }
        if (e.key === 'Escape') {
          document.body.removeChild(textarea);
          setIsEditing(false);
        }
      });
    });
  };

  useEffect(() => {
    const stage = layerRef.current?.getStage();
    if (!stage) return;

    if (!isEditing) {
      stage.on('mousedown', handleMouseDown);
    }

    return () => {
      stage.off('mousedown', handleMouseDown);
    };
  }, [isEditing, fontSize, fontFamily, fillColor]);

  if (!Layer) {
    return null;
  }

  const LayerComponent = Layer;
  return <LayerComponent ref={layerRef} />;
}

