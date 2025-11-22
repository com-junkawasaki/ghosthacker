/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/prompt-tab
 * 
 * Prompt tab component
 */
'use client';

import { useState } from 'react';
import { Toggle } from '@/components/shared/ui/Toggle';
import { StoryPromptInput } from './StoryPromptInput';
import { ContinueFromPreviousToggle } from './ContinueFromPreviousToggle';
import { PageGenerationSection } from './PageGenerationSection';
import { PanelLayoutSection } from './PanelLayoutSection';
import { GenerateStoryButton } from './GenerateStoryButton';

export function PromptTab() {
  const [storyPrompt, setStoryPrompt] = useState('');
  const [continueFromPrevious, setContinueFromPrevious] = useState(true);

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

      <GenerateStoryButton credits={8} />
    </div>
  );
}

