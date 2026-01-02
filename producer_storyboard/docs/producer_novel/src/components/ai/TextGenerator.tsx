/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI text generator component
 */
'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { GENERATE_TEXT } from '@/lib/graphql/mutations';

interface TextGeneratorProps {
  onGenerate: (text: string) => void;
}

export function TextGenerator({ onGenerate }: TextGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generateText, { loading: generating }] = useMutation(GENERATE_TEXT);

  const handleGenerate = async () => {
    try {
      const { data } = await generateText({
        variables: {
          input: {
            prompt,
          },
        },
      });
      if (data?.generateText?.text) {
        onGenerate(data.generateText.text);
      }
    } catch (error) {
      console.error('Error generating text:', error);
    }
  };

  return (
    <div className="text-generator">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter prompt for text generation..."
      />
      <button onClick={handleGenerate} disabled={generating || !prompt}>
        {generating ? 'Generating...' : 'Generate'}
      </button>
    </div>
  );
}

