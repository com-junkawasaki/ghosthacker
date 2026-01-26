/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/story-prompt-input
 * 
 * Story prompt input component
 */
'use client';

interface StoryPromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function StoryPromptInput({ value, onChange }: StoryPromptInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Once upon a time, in the magical land of Equestria..."
      className="w-full h-32 p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
    />
  );
}

