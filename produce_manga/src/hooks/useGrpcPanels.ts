/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/use-grpc-panels
 * 
 * React hook for fetching panels using gRPC
 */
'use client';

import { useState, useEffect } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import type { Panel } from '@/lib/grpc/generated/types';

export function useGrpcPanels(pageId: string | undefined) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pageId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPanels() {
      try {
        setLoading(true);
        setError(null);
        const response = await mangaEditorServiceClient.ListPanels({ pageId });
        if (!cancelled) {
          setPanels(response.panels || []);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to fetch panels');
          console.error('Failed to fetch panels:', error);
          setError(error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPanels();

    return () => {
      cancelled = true;
    };
  }, [pageId]);

  return { panels, loading, error };
}

