/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/use-grpc-scripts
 * 
 * React hook for fetching scripts using gRPC
 */
'use client';

import { useState, useEffect } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import type { Script } from '@/lib/grpc/generated/types';

export function useGrpcScripts(projectId: string | undefined) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchScripts() {
      try {
        setLoading(true);
        setError(null);
        const response = await mangaEditorServiceClient.ListScripts({ projectId });
        if (!cancelled) {
          setScripts(response.scripts || []);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to fetch scripts');
          console.error('Failed to fetch scripts:', error);
          setError(error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchScripts();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { scripts, loading, error };
}

