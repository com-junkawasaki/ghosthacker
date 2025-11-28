/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/prompt-tab
 * 
 * Prompt tab component
 */
'use client';

import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Toggle } from '@/components/shared/ui/Toggle';
import { StoryPromptInput } from './StoryPromptInput';
import { ContinueFromPreviousToggle } from './ContinueFromPreviousToggle';
import { PageGenerationSection } from './PageGenerationSection';
import { PanelLayoutSection } from './PanelLayoutSection';
import { GenerateStoryButton } from './GenerateStoryButton';

const GENERATE_STORY_MUTATION = gql`
  mutation GenerateStory($input: GenerateStoryInput!) {
    generateStory(input: $input) {
      script {
        id
        projectId
        scriptId
        title
        pageCount
      }
      pages {
        id
        projectId
        scriptId
        pageId
        pageNumber
      }
    }
  }
`;

const MANGA_SCRIPTS_QUERY_FOR_REFETCH = gql`
  query MangaScriptsForRefetch($projectId: ID!) {
    mangaScripts(projectId: $projectId) {
      id
      projectId
      scriptId
      title
      pageCount
    }
  }
`;

interface PromptTabProps {
  projectId: string;
  onStoryGenerated?: () => void;
}

export function PromptTab({ projectId, onStoryGenerated }: PromptTabProps) {
  const [storyPrompt, setStoryPrompt] = useState('');
  const [continueFromPrevious, setContinueFromPrevious] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generateStory] = useMutation(GENERATE_STORY_MUTATION, {
    refetchQueries: [
      { query: MANGA_SCRIPTS_QUERY_FOR_REFETCH, variables: { projectId } },
    ],
    awaitRefetchQueries: true,
    onCompleted: () => {
      setIsGenerating(false);
      setError(null);
      if (onStoryGenerated) {
        onStoryGenerated();
      }
    },
    onError: (err) => {
      setIsGenerating(false);
      setError(err.message || 'ストーリー生成に失敗しました');
    },
  });

  const handleGenerateStory = async () => {
    if (!storyPrompt.trim()) {
      setError('ストーリープロンプトを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await generateStory({
        variables: {
          input: {
            projectId,
            storyPrompt: storyPrompt,
            continueFromPrevious: continueFromPrevious,
            preset: 'Comic Style (Schnell)', // TODO: Get from PageGenerationSection
          },
        },
      });
    } catch (err) {
      // Error is handled by onError callback
      console.error('Failed to generate story:', err);
    }
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-2">ストーリープロンプト</h3>
        <StoryPromptInput value={storyPrompt} onChange={setStoryPrompt} />
      </div>

      <div>
        <ContinueFromPreviousToggle
          checked={continueFromPrevious}
          onChange={setContinueFromPrevious}
        />
      </div>

      <PageGenerationSection />

      <PanelLayoutSection />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <GenerateStoryButton 
        credits={8} 
        onClick={handleGenerateStory}
        disabled={isGenerating}
      />
    </div>
  );
}

