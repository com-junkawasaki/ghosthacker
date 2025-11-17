/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI translator component
 */
'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { TRANSLATE_CHAPTER } from '@/lib/graphql/mutations';

interface TranslatorProps {
  chapterId: string;
  onTranslate: (translatedText: string) => void;
}

export function Translator({ chapterId, onTranslate }: TranslatorProps) {
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translateChapter, { loading: translating }] = useMutation(TRANSLATE_CHAPTER);

  const handleTranslate = async () => {
    try {
      const { data } = await translateChapter({
        variables: {
          input: {
            chapterId: chapterId,
            targetLanguage: targetLanguage,
          },
        },
      });
      if (data?.translateChapter?.text) {
        onTranslate(data.translateChapter.text);
      }
    } catch (error) {
      console.error('Error translating:', error);
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

