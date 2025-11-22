/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/selection-box
 * 
 * Selection box component using Konva Transformer
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Group as KonvaGroupType } from 'konva';

interface SelectionBoxProps {
  selectedNodeId?: string;
  nodes: Array<{ id: string; node: KonvaGroupType }>;
}

export function SelectionBox({ selectedNodeId, nodes }: SelectionBoxProps) {
  const transformerRef = useRef<any>(null);
  const [Transformer, setTransformer] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-konva').then((mod) => {
        setTransformer(() => mod.Transformer);
      });
    }
  }, []);

  useEffect(() => {
    if (!transformerRef.current || !selectedNodeId) return;

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (selectedNode) {
      transformerRef.current.nodes([selectedNode.node]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
    }
  }, [selectedNodeId, nodes]);

  if (!Transformer) {
    return null;
  }

  const TransformerComponent = Transformer;
  return (
    <TransformerComponent
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Limit resize
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}

