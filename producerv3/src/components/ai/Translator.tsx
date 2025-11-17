/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI translator component
 */
import { useState } from 'react';

interface TranslatorProps {
  chapterId: string;
  onTranslate: (translatedText: string) => void;
}

export function Translator({ chapterId, onTranslate }: TranslatorProps) {
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: chapterId,
          target_language: targetLanguage,
        }),
      });
      const data = await response.json();
      onTranslate(data.text);
    } catch (error) {
      console.error('Error translating:', error);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="translator">
      <select
        value={targetLanguage}
        onChange={(e) => setTargetLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="ja">Japanese</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
      </select>
      <button onClick={handleTranslate} disabled={translating}>
        {translating ? 'Translating...' : 'Translate'}
      </button>
    </div>
  );
}

