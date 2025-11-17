/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-chapters
 * 
 * Chapter tree component for managing EPUB chapters
 */
'use client';

import { useQuery } from '@apollo/client';
import { GET_CHAPTERS } from '@/lib/graphql/queries';

interface ChapterTreeProps {
  epubId: string;
  onChapterSelect?: (chapterId: string) => void;
}

export function ChapterTree({ epubId, onChapterSelect }: ChapterTreeProps) {
  const { data, loading, error } = useQuery(GET_CHAPTERS, {
    variables: { epubId },
  });

  if (loading) return <div className="p-2 text-gray-500">Loading chapters...</div>;
  if (error) return <div className="p-2 text-red-500">Error loading chapters: {error.message}</div>;

  return (
    <div className="chapter-tree mb-4">
      <h3 className="font-bold mb-2">Chapters</h3>
      {data?.chapters && data.chapters.length > 0 ? (
        <ul className="list-none p-0">
          {data.chapters.map((chapter: { id: string; title: string; order: number }) => (
            <li
              key={chapter.id}
              onClick={() => onChapterSelect?.(chapter.id)}
              className="p-2 cursor-pointer hover:bg-gray-100 rounded"
            >
              {chapter.order}. {chapter.title || 'Untitled'}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">No chapters found</p>
      )}
    </div>
  );
}

