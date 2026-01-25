/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/use-grpc-create-panel
 * 
 * React hook for creating a new manga panel using gRPC
 */
'use client';

import { useState } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import type { CreatePanelRequest } from '@/lib/grpc/generated/types';

export interface UseGrpcCreatePanelResult {
  createPanel: (request: CreatePanelRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useGrpcCreatePanel(): UseGrpcCreatePanelResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPanel = async (request: CreatePanelRequest) => {
    setLoading(true);
    setError(null);

    try {
      await mangaEditorServiceClient.CreatePanel(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'コマの作成に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPanel,
    loading,
    error,
  };
}

