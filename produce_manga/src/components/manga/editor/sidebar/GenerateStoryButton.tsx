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
  disabled?: boolean;
}

export function GenerateStoryButton({ credits, onClick, disabled }: GenerateStoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 bg-primary-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-primary-700'
      }`}
    >
      <span>{disabled ? '生成中...' : 'ストーリーを生成'}</span>
      <span className="flex items-center gap-1">
        <span>{credits}</span>
        <span>💎</span>
      </span>
    </button>
  );
}

