/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/help-button
 * 
 * Help button component
 */
'use client';

export function HelpButton() {
  return (
    <button
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700"
      title="ヘルプ"
    >
      ?
    </button>
  );
}

