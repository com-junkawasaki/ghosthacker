/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/use-grpc-pages
 * 
 * React hook for fetching pages using gRPC
 */
'use client';

import { useState, useEffect } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import type { Page } from '@/lib/grpc/generated/types';

export function useGrpcPages(scriptId: string | undefined) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!scriptId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPages() {
      try {
        setLoading(true);
        setError(null);
        const response = await mangaEditorServiceClient.ListPages({ scriptId });
        if (!cancelled) {
          setPages(response.pages || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch pages'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPages();

    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  return { pages, loading, error };
}

