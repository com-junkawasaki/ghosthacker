/**
 * Vector Search Component
 * ベクトル類似度検索コンポーネント
 */

'use client';

import { useState } from 'react';
import { graphqlRequest } from '@/internal/graphql/client';

interface VectorSearchProps {
  projectId: string;
}

interface SearchResult {
  node_id: string;
  label: string;
  properties: Record<string, any>;
  score: number;
}

export default function VectorSearch({ projectId }: VectorSearchProps) {
  const [queryVector, setQueryVector] = useState('');
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!queryVector.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // ベクトルをパース（カンマ区切りの数値）
      const vector = queryVector
        .split(',')
        .map((v) => parseFloat(v.trim()))
        .filter((v) => !isNaN(v));

      if (vector.length === 0) {
        setError('Invalid vector format. Please provide comma-separated numbers.');
        return;
      }

      const query = `
        query VectorSearch($queryVector: [Float!]!, $limit: Int) {
          vectorSearch(queryVector: $queryVector, limit: $limit) {
            node_id
            label
            properties
            score
          }
        }
      `;

      const result = await graphqlRequest(query, {
        variables: { queryVector: vector, limit },
      });

      if (result?.vectorSearch) {
        setResults(result.vectorSearch);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vector search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Vector Search
      </h2>

      <div className="mb-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Query Vector (comma-separated numbers)
          </label>
          <input
            type="text"
            value={queryVector}
            onChange={(e) => setQueryVector(e.target.value)}
            placeholder="0.1, 0.2, 0.3, ..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Limit
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
            min={1}
            max={100}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Results ({results.length})
          </h3>
          {results.map((result) => (
            <div
              key={result.node_id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {result.label}
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Score: {result.score.toFixed(4)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                ID: {result.node_id}
              </p>
              {Object.keys(result.properties).length > 0 && (
                <div className="mt-2">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
                      Properties
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.properties, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

