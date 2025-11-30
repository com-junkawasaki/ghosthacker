/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/use-grpc-projects
 * 
 * React hook for fetching projects using gRPC
 */
'use client';

import { useState, useEffect } from 'react';
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';
import type { Project } from '@/lib/grpc/generated/types';

export function useGrpcProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      try {
        setLoading(true);
        setError(null);
        const response = await mangaEditorServiceClient.ListProjects({});
        if (!cancelled) {
          setProjects(response.projects || []);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to fetch projects');
          console.error('Failed to fetch projects:', error);
          setError(error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mangaEditorServiceClient.ListProjects({});
      setProjects(response.projects || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch projects');
      console.error('Failed to refetch projects:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return { projects, loading, error, refetch };
}

