/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI summarizer component
 */
import { useState } from 'react';

interface SummarizerProps {
  chapterId: string;
  onSummarize: (summary: string) => void;
}

export function Summarizer({ chapterId, onSummarize }: SummarizerProps) {
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId }),
      });
      const data = await response.json();
      onSummarize(data.text);
    } catch (error) {
      console.error('Error summarizing:', error);
    } finally {
      setSummarizing(false);
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

