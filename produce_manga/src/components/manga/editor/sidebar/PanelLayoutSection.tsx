/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-layout-section
 * 
 * Panel layout section component
 */
'use client';

export function PanelLayoutSection() {
  return (
    <div>
      <h3 className="font-semibold text-sm text-gray-700 mb-2">パネルの配置</h3>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="rounded" />
        <span className="text-sm text-gray-700">パネルをリセットする</span>
      </label>
    </div>
  );
}

