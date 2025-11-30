/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/list-manga-projects
 * 
 * Manga project list page
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreateProjectDialog } from '@/components/manga/dialogs/CreateProjectDialog';
import { useGrpcProjects } from '@/hooks/useGrpcProjects';

export default function MangaProjectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { projects, loading, error, refetch } = useGrpcProjects();
  const router = useRouter();

  const handleProjectCreated = (projectId: string) => {
    setIsCreateDialogOpen(false);
    refetch();
    router.push(`/manga/${projectId}/editor`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-red-600">エラー: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">マンガプロジェクト一覧</h1>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700"
          >
            新規プロジェクト作成
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/manga/${project.id}/editor`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{project.title || 'Untitled'}</h2>
              {project.description && (
                <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
              )}
              <div className="text-sm text-gray-500">
                作成日: {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ja-JP') : 'N/A'}
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              プロジェクトがありません。新規プロジェクトを作成してください。
            </div>
          )}
        </div>
      </div>
      {isCreateDialogOpen && (
        <CreateProjectDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}

