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
      className={`relative aspect-[2/3] bg-white border-2 rounded cursor-pointer overflow-hidden transition-all hover:shadow-md ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      {page.thumbnail ? (
        <img src={page.thumbnail} alt={`Page ${page.pageNumber || page.id}`} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs bg-gray-50">
          <div className="text-2xl mb-1">📄</div>
          <div>Page {page.pageNumber || '?'}</div>
        </div>
      )}
      {page.pageNumber && (
        <div className={`absolute bottom-0 left-0 right-0 text-white text-xs px-2 py-1 text-center font-medium ${
          isSelected ? 'bg-blue-500' : 'bg-black bg-opacity-60'
        }`}>
          {page.pageNumber}ページ目
        </div>
      )}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          ✓
        </div>
      )}
    </div>
  );
}

