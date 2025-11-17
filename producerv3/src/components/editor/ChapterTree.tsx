/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-chapters
 * 
 * Chapter tree component for managing EPUB chapters
 */
// @ts-ignore - Apollo Client CommonJS import workaround
import pkg from '@apollo/client';
const { useQuery } = pkg;
import { GET_CHAPTERS } from '../../lib/graphql/queries';

interface ChapterTreeProps {
  epubId: string;
  onChapterSelect?: (chapterId: string) => void;
}

export function ChapterTree({ epubId, onChapterSelect }: ChapterTreeProps) {
  const { data, loading, error } = useQuery(GET_CHAPTERS, {
    variables: { epubId },
  });

  if (loading) return <div>Loading chapters...</div>;
  if (error) return <div>Error loading chapters</div>;

  return (
    <div className="chapter-tree">
      <h3>Chapters</h3>
      <ul>
        {data?.chapters?.map((chapter: { id: string; title: string; order: number }) => (
          <li key={chapter.id} onClick={() => onChapterSelect?.(chapter.id)}>
            {chapter.order}. {chapter.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

