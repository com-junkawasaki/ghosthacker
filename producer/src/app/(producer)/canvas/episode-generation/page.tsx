'use client';

import { useState } from 'react';
import { graphqlClient, episodeMutations } from '@/lib/graphql-client';
import { readJsonLd } from '@/lib/jsonld-storage';

interface Character {
  id: string;
  name: string;
  backstory?: string;
  traits?: string[];
}

export default function EpisodeGenerationPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [sceneSetting, setSceneSetting] = useState<string>('');
  const [dialogue, setDialogue] = useState<string>('');
  const [episode, setEpisode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load characters from JSON-LD files
  const loadCharacters = async () => {
    try {
      const characterFiles = ['character1', 'character2']; // TODO: List actual character files
      const loadedCharacters: Character[] = [];

      for (const file of characterFiles) {
        const data = readJsonLd<{ '@graph'?: Array<{ '@id'?: string; 'schema:name'?: string }> }>(
          'characters',
          `${file}.jsonld`
        );
        if (data && data['@graph']) {
          const char = data['@graph'][0];
          if (char) {
            loadedCharacters.push({
              id: char['@id'] || file,
              name: char['schema:name'] || file,
            });
          }
        }
      }

      setCharacters(loadedCharacters);
    } catch (err) {
      setError(`Failed to load characters: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Generate dialogue
  const handleGenerateDialogue = async () => {
    if (!selectedCharacterId) {
      setError('Please select a character');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlClient.request(episodeMutations.generateCharacterDialogue, {
        characterId: selectedCharacterId,
        sceneSetting: sceneSetting || undefined,
      });

      setDialogue(result.generateCharacterDialogue);
    } catch (err) {
      setError(`Failed to generate dialogue: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Compose episode from dialogue
  const handleComposeEpisode = async () => {
    if (!dialogue) {
      setError('Please generate dialogue first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlClient.request(episodeMutations.composeEpisodeFromDialogue, {
        dialogueJson: dialogue,
        episodeStructure: undefined,
      });

      setEpisode(result.composeEpisodeFromDialogue);
    } catch (err) {
      setError(`Failed to compose episode: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Episode Generation</h1>

      {/* Load Characters */}
      <div className="mb-6">
        <button
          onClick={loadCharacters}
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black"
        >
          Load Characters
        </button>
        {characters.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Select Character</label>
            <select
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">-- Select Character --</option>
              {characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Scene Setting */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Scene Setting (Optional)</label>
        <textarea
          value={sceneSetting}
          onChange={(e) => setSceneSetting(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder="Describe the scene setting..."
        />
      </div>

      {/* Generate Dialogue */}
      <div className="mb-6">
        <button
          onClick={handleGenerateDialogue}
          disabled={loading || !selectedCharacterId}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Dialogue'}
        </button>

        {dialogue && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">Generated Dialogue</h3>
            <pre className="text-sm whitespace-pre-wrap">{dialogue}</pre>
          </div>
        )}
      </div>

      {/* Compose Episode */}
      <div className="mb-6">
        <button
          onClick={handleComposeEpisode}
          disabled={loading || !dialogue}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Composing...' : 'Compose Episode'}
        </button>

        {episode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">Composed Episode</h3>
            <pre className="text-sm whitespace-pre-wrap">{episode}</pre>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
}

