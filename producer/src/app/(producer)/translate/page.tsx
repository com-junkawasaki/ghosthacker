'use client';

import { useState, useEffect } from 'react';
import { graphqlClient, episodeMutations } from '@/lib/graphql-client';
import { readJsonLd, listJsonLdFiles } from '@/lib/jsonld-storage';

interface Episode {
  id: string;
  title: string;
  content: string;
  sentences: Sentence[];
}

interface Sentence {
  id: string;
  text: string;
  translation?: string;
}

export default function TranslatePage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load episodes from JSON-LD files
  useEffect(() => {
    const loadEpisodes = async () => {
      try {
        const episodeFiles = listJsonLdFiles('episodes');
        const loadedEpisodes: Episode[] = [];

        for (const file of episodeFiles) {
          const data = readJsonLd<{
            '@graph'?: Array<{
              '@id'?: string;
              'schema:title'?: string;
              'gh:content'?: string;
            }>;
          }>('episodes', `${file}.jsonld`);

          if (data && data['@graph']) {
            const ep = data['@graph'][0];
            if (ep) {
              const content = ep['gh:content'] || '';
              // Split content into sentences (simple split by period/newline)
              const sentences: Sentence[] = content
                .split(/[.\n]/)
                .filter((s) => s.trim().length > 0)
                .map((text, idx) => ({
                  id: `sentence-${idx}`,
                  text: text.trim(),
                }));

              loadedEpisodes.push({
                id: ep['@id'] || file,
                title: ep['schema:title'] || file,
                content,
                sentences,
              });
            }
          }
        }

        setEpisodes(loadedEpisodes);
      } catch (err) {
        setError(`Failed to load episodes: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    loadEpisodes();
  }, []);

  // Update selected episode
  useEffect(() => {
    if (selectedEpisodeId) {
      const episode = episodes.find((ep) => ep.id === selectedEpisodeId);
      setSelectedEpisode(episode || null);
    } else {
      setSelectedEpisode(null);
    }
  }, [selectedEpisodeId, episodes]);

  // Translate a sentence
  const handleTranslateSentence = async (sentenceId: string) => {
    if (!selectedEpisode) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlClient.request(episodeMutations.translateEpisodeSentence, {
        episodeId: selectedEpisode.id,
        sentenceId,
        targetLanguage,
      });

      // Update the sentence translation
      if (selectedEpisode) {
        const updatedSentences = selectedEpisode.sentences.map((s) =>
          s.id === sentenceId ? { ...s, translation: result.translateEpisodeSentence } : s
        );
        setSelectedEpisode({ ...selectedEpisode, sentences: updatedSentences });
      }
    } catch (err) {
      setError(`Failed to translate sentence: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Episode Translation</h1>

      {/* Episode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Episode</label>
        <select
          value={selectedEpisodeId}
          onChange={(e) => setSelectedEpisodeId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">-- Select Episode --</option>
          {episodes.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.title}
            </option>
          ))}
        </select>
      </div>

      {/* Target Language */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Target Language</label>
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="en">English</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="zh">Chinese</option>
        </select>
      </div>

      {/* Episode Sentences */}
      {selectedEpisode && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{selectedEpisode.title}</h2>
          {selectedEpisode.sentences.map((sentence) => (
            <div key={sentence.id} className="p-4 border border-gray-200 rounded-md">
              <div className="mb-2">
                <div className="text-sm text-gray-600 mb-1">Original:</div>
                <div className="text-base">{sentence.text}</div>
              </div>
              {sentence.translation && (
                <div className="mb-2">
                  <div className="text-sm text-gray-600 mb-1">Translation ({targetLanguage}):</div>
                  <div className="text-base">{sentence.translation}</div>
                </div>
              )}
              <button
                onClick={() => handleTranslateSentence(sentence.id)}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Translating...' : 'Translate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
}

