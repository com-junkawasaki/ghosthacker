/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI summarizer component
 */
'use client';

import { useMutation } from '@apollo/client';
import { SUMMARIZE_CHAPTER } from '@/lib/graphql/mutations';

interface SummarizerProps {
  chapterId: string;
  onSummarize: (summary: string) => void;
}

export function Summarizer({ chapterId, onSummarize }: SummarizerProps) {
  const [summarizeChapter, { loading: summarizing }] = useMutation(SUMMARIZE_CHAPTER);

  const handleSummarize = async () => {
    try {
      const { data } = await summarizeChapter({
        variables: {
          input: {
            chapterId: chapterId,
          },
        },
      });
      if (data?.summarizeChapter?.text) {
        onSummarize(data.summarizeChapter.text);
      }
    } catch (error) {
      console.error('Error summarizing:', error);
    }
  };

  return (
    <div className="summarizer">
      <button onClick={handleSummarize} disabled={summarizing}>
        {summarizing ? 'Summarizing...' : 'Summarize Chapter'}
      </button>
    </div>
  );
}

