/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/create-project-dialog
 * 
 * Dialog component for creating a new manga project
 */
'use client';

import { useState } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import { getGrpcErrorMessage, isNetworkError, isClientError } from '@/lib/grpc/error';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

export function CreateProjectDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await mangaEditorServiceClient.CreateProject({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      if (result.id) {
        onProjectCreated(result.id);
        setTitle('');
        setDescription('');
      }
    } catch (err) {
      const errorMessage = getGrpcErrorMessage(err);
      setError(new Error(errorMessage));
      console.error('Failed to create project:', err);
      
      // Log additional context for debugging
      if (isNetworkError(err)) {
        console.error('Network error detected - check gRPC server connection');
      } else if (isClientError(err)) {
        console.error('Client error - check request parameters');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">新規プロジェクト作成</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="プロジェクトタイトル"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              説明（オプション）
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="プロジェクトの説明"
              rows={4}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 text-red-600 text-sm">
              エラー: {error.message}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !title.trim()}
            >
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

