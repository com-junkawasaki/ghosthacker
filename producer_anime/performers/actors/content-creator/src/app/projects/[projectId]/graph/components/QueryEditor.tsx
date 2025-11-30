/**
 * Query Editor Component
 * SPARQL/GraphQLクエリエディタコンポーネント
 */

'use client';

import { useState } from 'react';
import { graphQuery } from '@/internal/grpc/services/graph_client';

interface QueryEditorProps {
  projectId: string;
}

export default function QueryEditor({ projectId }: QueryEditorProps) {
  const [query, setQuery] = useState('MATCH (n) RETURN n LIMIT 10');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const result = await graphQuery(query);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Query Editor
      </h2>

      <div className="mb-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-32 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Enter your graph query..."
        />
        <button
          onClick={handleExecute}
          disabled={loading}
          className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Executing...' : 'Execute Query'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {results && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Results
          </h3>
          <pre className="overflow-x-auto text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

