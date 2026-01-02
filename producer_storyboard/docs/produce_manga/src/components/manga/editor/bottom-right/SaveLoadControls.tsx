/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/save-load-controls
 * 
 * Save/Load controls component
 */
'use client';

export function SaveLoadControls() {
  return (
    <div className="flex items-center gap-2">
      <button
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700"
        title="保存"
      >
        💾
      </button>
    </div>
  );
}

