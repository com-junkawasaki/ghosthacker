"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

interface AIAssistantProps {
  projectId: string;
  processName: string;
  existingContent?: Record<string, unknown>;
  onGenerated: (content: Record<string, unknown>) => void;
}

/**
 * AI Assistant component for generating/enhancing JSON-LD content
 */
export function AIAssistant({
  projectId,
  processName,
  existingContent,
  onGenerated,
}: AIAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = api.projects.generateJSONLD.useMutation({
    onSuccess: (result) => {
      if (result.ok) {
        onGenerated(result.content);
        setPrompt("");
        setError(null);
      } else {
        setError(result.error);
      }
      setIsGenerating(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsGenerating(false);
    },
  });

  const enhanceMutation = api.projects.enhanceJSONLD.useMutation({
    onSuccess: (result) => {
      if (result.ok) {
        onGenerated(result.content);
        setPrompt("");
        setError(null);
      } else {
        setError(result.error);
      }
      setIsGenerating(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    generateMutation.mutate({
      prompt,
      context: existingContent,
    });
  };

  const handleEnhance = () => {
    if (!prompt.trim() || !existingContent) return;
    setIsGenerating(true);
    setError(null);
    enhanceMutation.mutate({
      existingContent,
      enhancementPrompt: prompt,
    });
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        AI Assistant
      </h3>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want to generate or enhance..."
        className="w-full h-24 p-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
        {existingContent && Object.keys(existingContent).length > 0 && (
          <button
            onClick={handleEnhance}
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50"
          >
            {isGenerating ? "Enhancing..." : "Enhance"}
          </button>
        )}
      </div>
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
}

