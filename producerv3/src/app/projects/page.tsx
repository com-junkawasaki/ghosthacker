/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/list-projects
 * 
 * Projects list page - displays all EPUB projects
 */
'use client';

import { useQuery } from '@apollo/client';
import { LIST_EPUBS } from '@/lib/graphql/queries';
import { ApolloProvider } from '@/components/editor/ApolloProvider';
import Link from 'next/link';

function ProjectsList() {
  const { data, loading, error } = useQuery(LIST_EPUBS);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading projects: {error.message}</div>
      </div>
    );
  }

  const projects = data?.epubList || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <Link
            href="/projects/default/editor"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No projects found.</p>
            <Link
              href="/projects/default/editor"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: {
              id: string;
              title: string;
              language: string;
              createdAt: string;
              updatedAt: string;
            }) => {
              // Convert UUID back to project ID for URL
              // For default project, use "default" instead of UUID
              const projectId = project.id === '00000000-0000-0000-0000-000000000000' 
                ? 'default' 
                : project.id;
              
              return (
                <Link
                  key={project.id}
                  href={`/projects/${projectId}/editor`}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {project.title || 'Untitled Project'}
                  </h2>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Language: {project.language}</div>
                    <div>Created: {new Date(project.createdAt).toLocaleDateString()}</div>
                    <div>Updated: {new Date(project.updatedAt).toLocaleDateString()}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ApolloProvider>
      <ProjectsList />
    </ApolloProvider>
  );
}

