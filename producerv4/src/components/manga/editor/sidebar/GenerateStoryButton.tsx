/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/generate-story-button
 * 
 * Generate story button component
 */
'use client';

interface GenerateStoryButtonProps {
  credits: number;
  onClick?: () => void;
}

export function GenerateStoryButton({ credits, onClick }: GenerateStoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2"
    >
      <span>ストーリーを生成</span>
      <span className="flex items-center gap-1">
        <span>{credits}</span>
        <span>💎</span>
      </span>
    </button>
  );
}

