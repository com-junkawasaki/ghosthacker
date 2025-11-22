/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-layer
 * 
 * Panel layer component for Konva
 */
'use client';

import { Group, Rect } from 'react-konva';
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
  return (
    <Group>
      {panels.map((panel) => (
        <Group key={panel.id} x={panel.x} y={panel.y}>
          <Rect width={panel.width} height={panel.height} fill="#ffffff" stroke="#000000" strokeWidth={2} />
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
        </Group>
      ))}
    </Group>
  );
}

