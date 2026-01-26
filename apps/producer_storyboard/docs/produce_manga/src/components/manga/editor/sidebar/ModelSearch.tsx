/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/model-search
 * 
 * Model search component
 */
'use client';

interface ModelSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ModelSearch({ value, onChange }: ModelSearchProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="モデルを検索..."
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    />
  );
}

