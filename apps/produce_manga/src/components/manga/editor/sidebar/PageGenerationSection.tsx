/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/page-generation-section
 * 
 * Page generation section component
 */
'use client';

import { PresetSelector } from './PresetSelector';
import { ModelSettingsToggle } from './ModelSettingsToggle';

export function PageGenerationSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Page Generation</h3>
        <PresetSelector />
      </div>
      <div>
        <ModelSettingsToggle />
      </div>
    </div>
  );
}

