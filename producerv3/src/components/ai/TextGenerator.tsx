/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI text generator component
 */
'use client';

import { useState } from 'react';

interface TextGeneratorProps {
  onGenerate: (text: string) => void;
}

export function TextGenerator({ onGenerate }: TextGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // TODO: Call AI service API
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      onGenerate(data.text);
    } catch (error) {
      console.error('Error generating text:', error);
    } finally {
      setGenerating(false);
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

