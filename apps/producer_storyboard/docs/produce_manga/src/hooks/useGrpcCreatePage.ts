/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/use-grpc-create-page
 * 
 * React hook for creating a new manga page using gRPC
 */
'use client';

import { useState } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import type { CreatePageRequest } from '@/lib/grpc/generated/types';

export interface UseGrpcCreatePageResult {
  createPage: (request: CreatePageRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useGrpcCreatePage(): UseGrpcCreatePageResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPage = async (request: CreatePageRequest) => {
    setLoading(true);
    setError(null);

    try {
      await mangaEditorServiceClient.CreatePage(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ページの作成に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPage,
    loading,
    error,
  };
}

