/**
 * Import/Export Component
 * JSON-LDインポート/エクスポートコンポーネント
 */

'use client';

import { useState } from 'react';
import { graphqlRequest } from '@/internal/graphql/client';

interface ImportExportProps {
  projectId: string;
}

export default function ImportExport({ projectId }: ImportExportProps) {
  const [nodeIds, setNodeIds] = useState('');
  const [exportedJsonld, setExportedJsonld] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleExport = async () => {
    if (!nodeIds.trim()) {
      setError('Please enter node IDs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ids = nodeIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      const query = `
        mutation ExportJsonLd($nodeIds: [String!]!) {
          exportJsonLd(nodeIds: $nodeIds)
        }
      `;

      const result = await graphqlRequest(query, {
        variables: { nodeIds: ids },
      });

      if (result?.exportJsonLd) {
        setExportedJsonld(result.exportJsonLd);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImportFile = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const jsonld = JSON.parse(text);

      const mutation = `
        mutation ImportJsonLd($jsonld: JSON!, $projectId: String) {
          importJsonLd(jsonld: $jsonld, projectId: $projectId)
        }
      `;

      const result = await graphqlRequest(mutation, {
        variables: { jsonld, projectId },
      });

      if (result?.importJsonLd) {
        alert(`Successfully imported ${result.importJsonLd.length} nodes`);
        setFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!exportedJsonld) return;

    const blob = new Blob([JSON.stringify(exportedJsonld, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-export-${Date.now()}.jsonld`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Import / Export
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Export JSON-LD
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Node IDs (comma-separated)
              </label>
              <input
                type="text"
                value={nodeIds}
                onChange={(e) => setNodeIds(e.target.value)}
                placeholder="node1, node2, node3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export'}
            </button>
            {exportedJsonld && (
              <div>
                <button
                  onClick={handleDownload}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download JSON-LD
                </button>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                    Preview
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                    {JSON.stringify(exportedJsonld, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Import */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Import JSON-LD
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select JSON-LD file
              </label>
              <input
                type="file"
                accept=".json,.jsonld"
                onChange={handleFileSelect}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {file.name}
                </p>
              )}
            </div>
            <button
              onClick={handleImportFile}
              disabled={loading || !file}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

