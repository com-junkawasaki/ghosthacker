/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-layer
 * 
 * Panel layer component for Konva
 */
'use client';

import { useEffect, useState } from 'react';
import { PanelImage } from './PanelImage';

interface PanelLayerProps {
  panels: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    imageUrl?: string;
    imageData?: string; // Base64 encoded bytea data
  }>;
}

export function PanelLayer({ panels }: PanelLayerProps) {
  const [Group, setGroup] = useState<any>(null);
  const [Rect, setRect] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-konva').then((mod) => {
        setGroup(() => mod.Group);
        setRect(() => mod.Rect);
      });
    }
  }, []);

  if (!Group || !Rect) {
    return null;
  }

  const GroupComponent = Group;
  const RectComponent = Rect;

  return (
    <GroupComponent name="PanelLayer">
      {panels.map((panel) => (
        <GroupComponent key={panel.id} name={`Panel-${panel.id}`} x={panel.x} y={panel.y}>
          <RectComponent name="PanelRect" width={panel.width} height={panel.height} fill="#ffffff" stroke="#000000" strokeWidth={2} />
          {(panel.imageUrl || panel.imageData) && (
            <PanelImage
              x={0}
              y={0}
              width={panel.width}
              height={panel.height}
              imageUrl={panel.imageUrl}
              imageData={panel.imageData}
            />
          )}
        </GroupComponent>
      ))}
    </GroupComponent>
  );
}

