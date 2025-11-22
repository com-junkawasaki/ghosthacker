/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/page-sidebar
 * 
 * Left sidebar component with page list and layer list
 */
'use client';

import { PageThumbnail } from './PageThumbnail';
import { LayerList } from './LayerList';

interface PageSidebarProps {
  pages: Array<{ id: string; pageNumber?: number; thumbnail?: string }>;
  selectedPageId?: string;
  onPageSelect?: (pageId: string) => void;
  layers: Array<{ id: string; name: string; visible: boolean }>;
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

export function PageSidebar({
  pages,
  selectedPageId,
  onPageSelect,
  layers,
  onLayerToggle,
}: PageSidebarProps) {
  return (
    <div className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-sm text-gray-700">ページ</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {pages.map((page) => (
            <PageThumbnail
              key={page.id}
              page={page}
              isSelected={selectedPageId === page.id}
              onClick={() => onPageSelect?.(page.id)}
            />
          ))}
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="p-4">
          <h2 className="font-semibold text-sm text-gray-700 mb-2">レイヤー</h2>
          <LayerList layers={layers} onLayerToggle={onLayerToggle} />
        </div>
      </div>
    </div>
  );
}

