/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-chapters
 * 
 * Chapter tree component for managing EPUB chapters
 */
'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_CHAPTERS } from '@/lib/graphql/queries';
import { CREATE_CHAPTER } from '@/lib/graphql/mutations';

interface ChapterTreeProps {
  epubId: string;
  onChapterSelect?: (chapterId: string) => void;
  selectedChapterId?: string;
}

export function ChapterTree({ epubId, onChapterSelect, selectedChapterId }: ChapterTreeProps) {
  const { data, loading, error, refetch } = useQuery(GET_CHAPTERS, {
    variables: { epubId },
  });

  const [createChapter, { loading: creating }] = useMutation(CREATE_CHAPTER, {
    onCompleted: (data) => {
      if (data?.createChapter?.id) {
        onChapterSelect?.(data.createChapter.id);
        refetch();
      }
    },
  });

  const handleCreateChapter = async () => {
    const chapters = data?.chapters || [];
    const nextOrder = chapters.length > 0 
      ? Math.max(...chapters.map((c: { order: number }) => c.order)) + 1 
      : 1;
    
    await createChapter({
      variables: {
        input: {
          epubId,
          title: `Chapter ${nextOrder}`,
          order: nextOrder,
          contentHtml: '',
        },
      },
    });
  };

  if (loading) return <div className="p-2 text-gray-500">Loading chapters...</div>;
  if (error) return <div className="p-2 text-red-500">Error loading chapters: {error.message}</div>;

  return (
    <div className="chapter-tree mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Chapters</h3>
        <button
          onClick={handleCreateChapter}
          disabled={creating}
          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          title="Create new chapter"
        >
          +
        </button>
      </div>
      {data?.chapters && data.chapters.length > 0 ? (
        <ul className="list-none p-0">
          {data.chapters.map((chapter: { id: string; title: string; order: number }) => (
            <li
              key={chapter.id}
              onClick={() => onChapterSelect?.(chapter.id)}
              className={`p-2 cursor-pointer rounded transition-colors ${
                selectedChapterId === chapter.id
                  ? 'bg-blue-100 border border-blue-300'
                  : 'hover:bg-gray-100'
              }`}
            >
              {chapter.order}. {chapter.title || 'Untitled'}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500 text-sm">
          <p className="mb-2">No chapters found</p>
          <button
            onClick={handleCreateChapter}
            disabled={creating}
            className="text-blue-500 hover:text-blue-600 underline text-xs disabled:opacity-50"
          >
            Create your first chapter
          </button>
        </div>
      )}
    </div>
  );
}

