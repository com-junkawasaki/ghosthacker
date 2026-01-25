/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/model-settings-toggle
 * 
 * Model settings toggle component
 */
'use client';

import { useState } from 'react';
import { Toggle } from '@/components/shared/ui/Toggle';

export function ModelSettingsToggle() {
  const [useModelSettings, setUseModelSettings] = useState(false);

  return (
    <Toggle
      checked={useModelSettings}
      onChange={setUseModelSettings}
      label="モデル設定を使用"
    />
  );
}

