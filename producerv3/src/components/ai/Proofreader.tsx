/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI proofreader component
 */
import { useState } from 'react';

interface ProofreaderProps {
  chapterId: string;
  onProofread: (proofreadText: string) => void;
}

export function Proofreader({ chapterId, onProofread }: ProofreaderProps) {
  const [proofreading, setProofreading] = useState(false);

  const handleProofread = async () => {
    setProofreading(true);
    try {
      const response = await fetch('/api/ai/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId }),
      });
      const data = await response.json();
      onProofread(data.text);
    } catch (error) {
      console.error('Error proofreading:', error);
    } finally {
      setProofreading(false);
    }
  };

  return (
    <div className="proofreader">
      <button onClick={handleProofread} disabled={proofreading}>
        {proofreading ? 'Proofreading...' : 'Proofread Chapter'}
      </button>
    </div>
  );
}

