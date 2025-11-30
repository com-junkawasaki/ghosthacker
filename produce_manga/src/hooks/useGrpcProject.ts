/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/use-grpc-project
 * 
 * React hook for fetching a single project using gRPC
 */
'use client';

import { useState, useEffect } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import type { Project } from '@/lib/grpc/generated/types';

export function useGrpcProject(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProject() {
      try {
        setLoading(true);
        setError(null);
        const response = await mangaEditorServiceClient.GetProject({ id: projectId });
        if (!cancelled) {
          setProject(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch project'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProject();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { project, loading, error };
}

