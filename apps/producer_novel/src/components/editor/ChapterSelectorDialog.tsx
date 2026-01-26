/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/chapter-selector-dialog
 * 
 * 章選択ダイアログ
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CHAPTERS } from '@/lib/graphql/queries';
import { normalizeProjectId } from '@/lib/utils/uuid';

interface ChapterSelectorDialogProps {
  epubId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chapter: { id: string; title: string; order: number }) => void;
}

export function ChapterSelectorDialog({ epubId, isOpen, onClose, onSelect }: ChapterSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ensure epubId is normalized to UUID format for GraphQL ID type
  const normalizedEpubId = normalizeProjectId(epubId);

  const { data, loading, error } = useQuery(GET_CHAPTERS, {
    variables: { epubId: normalizedEpubId },
    skip: !isOpen || !normalizedEpubId,
  });

  if (!isOpen) {
    return null;
  }

  const chapters = (data?.chapters as Array<{ id: string; title: string; order: number }>) || [];
  const filteredChapters = chapters.filter((chapter) => {
    const title = chapter.title || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort by order
  const sortedChapters = [...filteredChapters].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Select Chapter</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-center py-4">Loading...</div>}
          {error && <div className="text-center py-4 text-red-500">Error: {error.message}</div>}
          {!loading && !error && sortedChapters.length === 0 && (
            <div className="text-center py-4 text-gray-500">No chapters found</div>
          )}
          {!loading && !error && sortedChapters.map((chapter) => (
            <div
              key={chapter.id}
              onClick={() => {
                onSelect(chapter);
                onClose();
              }}
              className="p-3 mb-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
            >
              <div className="font-semibold">Chapter {chapter.order}: {chapter.title || 'Untitled'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

