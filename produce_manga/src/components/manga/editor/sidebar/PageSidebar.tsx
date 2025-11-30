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
import type { PanelLayerGroup } from '@/lib/konva/layerExtractor';

interface PageSidebarProps {
  pages: Array<{ id: string; pageNumber?: number; thumbnail?: string }>;
  selectedPageId?: string;
  onPageSelect?: (pageId: string) => void;
  layerGroups?: PanelLayerGroup[];
  layers?: Array<{ id: string; name: string; visible: boolean }>; // Backward compatibility
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

export function PageSidebar({
  pages,
  selectedPageId,
  onPageSelect,
  layerGroups,
  layers,
  onLayerToggle,
}: PageSidebarProps) {
  return (
    <div className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col h-full">
      {/* Pages Section */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="p-4">
          <h2 className="font-semibold text-sm text-gray-700 mb-2">ページ</h2>
        </div>
        <div className="px-2 pb-2 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {pages.length > 0 ? (
              pages.map((page) => (
                <PageThumbnail
                  key={page.id}
                  page={page}
                  isSelected={selectedPageId === page.id}
                  onClick={() => onPageSelect?.(page.id)}
                />
              ))
            ) : (
              <div className="col-span-2 text-sm text-gray-500 p-4 text-center">
                ページがありません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layers Section */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-200">
        <div className="p-4 flex-shrink-0">
          <h2 className="font-semibold text-sm text-gray-700 mb-2">レイヤー</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <LayerList
            layerGroups={layerGroups}
            layers={layers}
            onLayerToggle={onLayerToggle}
          />
        </div>
      </div>
    </div>
  );
}

