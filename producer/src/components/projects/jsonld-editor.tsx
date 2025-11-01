"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import { AIAssistant } from "./ai-assistant";

interface JSONLDEditorProps {
  projectId: string;
  processName: string;
  initialContent: Record<string, unknown>;
}

/**
 * JSON-LD interactive editor with real-time auto-save
 * @see https://bolt.new - Inspired by bolt.new's real-time editing
 */
export function JSONLDEditor({
  projectId,
  processName,
  initialContent,
}: JSONLDEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [jsonString, setJsonString] = useState(() => JSON.stringify(initialContent, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const utils = api.useUtils();
  const updateMutation = api.projects.updateProcessContent.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      void utils.projects.getProcessContent.invalidate({ projectId, processName });
    },
    onError: (err) => {
      setError(err.message);
      setIsSaving(false);
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    debounce((data: Record<string, unknown>) => {
      setIsSaving(true);
      updateMutation.mutate({
        projectId,
        processName,
        jsonld: data,
      });
    }, 500),
    [projectId, processName, updateMutation]
  );

  useEffect(() => {
    setContent(initialContent);
    setJsonString(JSON.stringify(initialContent, null, 2));
  }, [initialContent]);

  const handleChange = (value: string) => {
    setJsonString(value);
    setError(null);

    try {
      const parsed = JSON.parse(value);
      setContent(parsed);
      debouncedSave(parsed);
    } catch (e) {
      // Invalid JSON - don't save yet
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  };

  const handleAIGenerated = (generatedContent: Record<string, unknown>) => {
    const newJsonString = JSON.stringify(generatedContent, null, 2);
    setJsonString(newJsonString);
    setContent(generatedContent);
    debouncedSave(generatedContent);
  };

  return (
    <div className="space-y-4">
      <AIAssistant
        projectId={projectId}
        processName={processName}
        existingContent={content}
        onGenerated={handleAIGenerated}
      />
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isSaving ? "Saving..." : "Saved"}
        </div>
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
      </div>
      <textarea
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-96 font-mono text-sm p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        spellCheck={false}
      />
    </div>
  );
}

// Simple debounce utility
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

