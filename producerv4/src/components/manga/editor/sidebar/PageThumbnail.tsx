/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/page-thumbnail
 * 
 * Page thumbnail component
 */
'use client';

interface PageThumbnailProps {
  page: { id: string; pageNumber?: number; thumbnail?: string };
  isSelected?: boolean;
  onClick?: () => void;
}

export function PageThumbnail({ page, isSelected, onClick }: PageThumbnailProps) {
  return (
    <div
      onClick={onClick}
      className={`relative aspect-[2/3] bg-white border-2 rounded cursor-pointer overflow-hidden ${
        isSelected ? 'border-primary-600' : 'border-gray-300'
      }`}
    >
      {page.thumbnail ? (
        <img src={page.thumbnail} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
          Page {page.pageNumber || page.id}
        </div>
      )}
      {page.pageNumber && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5">
          Page {page.pageNumber}
        </div>
      )}
    </div>
  );
}

