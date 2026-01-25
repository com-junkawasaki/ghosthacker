/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/preset-selector
 * 
 * Preset selector component
 */
'use client';

export function PresetSelector() {
  return (
    <div className="flex items-center gap-2 p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
      <div className="w-8 h-8 bg-gray-200 rounded"></div>
      <span className="text-sm text-gray-700">Comic Style (Schnell)</span>
    </div>
  );
}

