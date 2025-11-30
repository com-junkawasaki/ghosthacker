/**
 * Project Detail Page
 * プロジェクト詳細情報を表示するページ
 * 
 * @context {
 *   "@id": "ex:ProjectDetailPage",
 *   "@type": "ex:Activity",
 *   "ex:provides": "ex:ProjectDetailView"
 * }
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { graphqlRequest } from '@/internal/graphql/client';
import { GetProjectDocument } from '@/generated/graphql';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDetailPageProps {
  params: { projectId: string };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      setLoading(true);
      setError(null);
      try {
        const result = await graphqlRequest(GetProjectDocument, {
          variables: { id: params.projectId },
        });
        if (result?.project) {
          setProject(result.project);
        } else {
          setError('Project not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [params.projectId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-lg text-gray-500 dark:text-gray-400">Loading project...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error || 'Project not found'}</p>
          <Link
            href="/projects"
            className="text-blue-600 hover:underline"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-4">
              {project.status && (
                <span
                  className={`inline-block px-3 py-1 text-sm font-semibold rounded ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {project.status}
                </span>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <div>Created: {new Date(project.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(project.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href={`/projects/${project.id}/story`}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Story
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Create and manage your story content
          </p>
        </Link>

        <Link
          href={`/projects/${project.id}/pipeline`}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Pipeline
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Monitor and execute content generation pipeline
          </p>
        </Link>

        <Link
          href={`/projects/${project.id}/assets`}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Assets
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            View and manage generated assets
          </p>
        </Link>

        <Link
          href={`/projects/${project.id}/epub-editor`}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            EPUB Editor
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Edit and export EPUB documents
          </p>
        </Link>

        <Link
          href={`/projects/${project.id}/kindle-editor`}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Kindle Editor
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Edit and export Kindle documents
          </p>
        </Link>

        <Link
          href={`/projects/${project.id}/settings`}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Settings
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Configure project settings
          </p>
        </Link>

        <Link
          href={`/projects/${project.id}/graph`}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Graph
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Manage RDF graph with Graph RAG and vector search
          </p>
        </Link>
      </div>
    </div>
  );
}

