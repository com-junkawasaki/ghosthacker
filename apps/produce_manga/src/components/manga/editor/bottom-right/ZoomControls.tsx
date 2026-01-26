/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/zoom-controls
 * 
 * Zoom controls component
 */
'use client';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange?: (zoom: number) => void;
}

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onZoomChange?.(Math.max(0.1, zoom - 0.1))}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700"
      >
        -
      </button>
      <span className="text-sm text-gray-700 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
      <button
        onClick={() => onZoomChange?.(Math.min(3, zoom + 0.1))}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700"
      >
        +
      </button>
    </div>
  );
}

