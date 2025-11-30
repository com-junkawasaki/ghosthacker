/**
 * JSON-LD Editor Component
 * JSON-LDエディタコンポーネント
 */

'use client';

import { useState } from 'react';
import { validateJsonLd, importJsonLd } from '@/internal/grpc/services/graph_client';

interface JsonLdEditorProps {
  projectId: string;
}

export default function JsonLdEditor({ projectId }: JsonLdEditorProps) {
  const [jsonld, setJsonld] = useState(`{
  "@context": {
    "@version": 1.1,
    "id": "@id",
    "type": "@type",
    "ex": "https://gftd.ai/producerv2#"
  },
  "@graph": []
}`);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    setLoading(true);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonld);
      } catch (e) {
        setValidationResult({
          valid: false,
          message: `JSON Parse Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        });
        return;
      }

      const result = await validateJsonLd(parsed);
      setValidationResult({
        valid: result.valid,
        message: result.valid
          ? 'JSON-LD is valid'
          : result.error || 'JSON-LD validation failed',
      });
    } catch (err) {
      setValidationResult({
        valid: false,
        message: err instanceof Error ? err.message : 'Validation failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonld);
      const result = await importJsonLd(parsed);
      if (result.success) {
        alert('Successfully imported JSON-LD');
        setValidationResult({
          valid: true,
          message: 'JSON-LD imported successfully',
        });
      } else {
        setValidationResult({
          valid: false,
          message: result.error || 'Import failed',
        });
      }
    } catch (err) {
      setValidationResult({
        valid: false,
        message: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        JSON-LD Editor
      </h2>

      <div className="mb-4 flex gap-2">
        <button
          onClick={handleValidate}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Validate
        </button>
        <button
          onClick={handleImport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Import
        </button>
      </div>

      {validationResult && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            validationResult.valid
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={
              validationResult.valid ? 'text-green-700' : 'text-red-700'
            }
          >
            {validationResult.message}
          </p>
        </div>
      )}

      <textarea
        value={jsonld}
        onChange={(e) => setJsonld(e.target.value)}
        className="w-full h-96 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        placeholder="Enter JSON-LD here..."
      />

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Note: Full Monaco Editor integration will be added for syntax highlighting and validation
      </div>
    </div>
  );
}

