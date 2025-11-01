"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

interface AssetUploaderProps {
  projectId: string;
  processName: string;
}

/**
 * Asset uploader component for images and documents
 * Uploads to MongoDB GridFS via tRPC
 */
export function AssetUploader({ projectId, processName }: AssetUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const uploadMutation = api.projects.uploadAsset.useMutation({
    onSuccess: () => {
      setIsUploading(false);
      setError(null);
      void utils.projects.listAssets.invalidate({ projectId, processName });
    },
    onError: (err) => {
      setError(err.message);
      setIsUploading(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          // Remove data URL prefix if present
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          await uploadMutation.mutateAsync({
            projectId,
            filename: file.name,
            contentType: file.type,
            data: base64,
            processName,
          });
        }
      };
      reader.onerror = () => {
        setError("Failed to read file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Upload Asset
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          accept="image/*,.pdf,.doc,.docx"
        />
        {error && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {isUploading && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Uploading...
          </div>
        )}
      </div>
    </div>
  );
}

