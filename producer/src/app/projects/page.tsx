"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Project list page
 * @see https://bolt.new - Inspired by bolt.new's project card layout
 */
export default function ProjectsPage() {
  const router = useRouter();
  const { data: projects, isLoading } = api.projects.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading projects...</div>
      </div>
    );
  }

  const createMutation = api.projects.create.useMutation({
    onSuccess: (project) => {
      router.push(`/projects/${project.projectId}`);
    },
  });

  const handleCreateProject = () => {
    const name = prompt("Project name:");
    if (name) {
      createMutation.mutate({ name });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <button
          onClick={handleCreateProject}
          disabled={createMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating..." : "New Project"}
        </button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No projects yet</p>
          <button
            onClick={handleCreateProject}
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create your first project"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.projectId}
              href={`/projects/${project.projectId}`}
              className="block p-6 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-900"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {project.name}
              </h2>
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                <span>{project.processes.length} processes</span>
                <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

