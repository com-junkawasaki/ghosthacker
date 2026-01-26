/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI proofreader component
 */
'use client';

import { useMutation } from '@apollo/client';
import { PROOFREAD_CHAPTER } from '@/lib/graphql/mutations';

interface ProofreaderProps {
  chapterId: string;
  onProofread: (proofreadText: string) => void;
}

export function Proofreader({ chapterId, onProofread }: ProofreaderProps) {
  const [proofreadChapter, { loading: proofreading }] = useMutation(PROOFREAD_CHAPTER);

  const handleProofread = async () => {
    try {
      const { data } = await proofreadChapter({
        variables: {
          input: {
            chapterId: chapterId,
          },
        },
      });
      if (data?.proofreadChapter?.text) {
        onProofread(data.proofreadChapter.text);
      }
    } catch (error) {
      console.error('Error proofreading:', error);
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

