"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { JSONLDEditor } from "@/components/projects/jsonld-editor";
import { AssetUploader } from "@/components/projects/asset-uploader";

/**
 * Process-based page for editing JSON-LD content
 * @see https://bolt.new - Inspired by bolt.new's interactive editing
 */
export default function ProcessPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const processName = params.processName as string;

  const { data: processContent, isLoading } = api.projects.getProcessContent.useQuery({
    projectId,
    processName,
  });

  const { data: assets } = api.projects.listAssets.useQuery({
    projectId,
    processName,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading process content...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {processName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Edit JSON-LD content for this process
        </p>
      </div>

      <div className="space-y-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            JSON-LD Content
          </h2>
          <JSONLDEditor
            projectId={projectId}
            processName={processName}
            initialContent={processContent?.jsonld || {}}
          />
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Assets
          </h2>
          <AssetUploader projectId={projectId} processName={processName} />
          {assets && assets.length > 0 && (
            <div className="mt-4 space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset.fileId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {asset.filename}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(asset.size / 1024).toFixed(2)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

