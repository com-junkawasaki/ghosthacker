'use client';

import { useState } from 'react';
import type { EpubEditorSettings } from '@/lib/epub-settings';

interface SettingsPanelProps {
  settings: EpubEditorSettings;
  onSettingsChange: (settings: EpubEditorSettings) => void;
  onClose?: () => void;
}

/**
 * ePub設定パネルコンポーネント
 */
export default function SettingsPanel({
  settings,
  onSettingsChange,
  onClose,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<EpubEditorSettings>(settings);

  const updateSetting = <K extends keyof EpubEditorSettings>(
    key: K,
    value: EpubEditorSettings[K]
  ) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">ePub Settings</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Font Family
          </label>
          <select
            value={localSettings['gh:fontFamily']}
            onChange={(e) => updateSetting('gh:fontFamily', e.target.value as 'serif' | 'sans-serif' | 'monospace')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="monospace">Monospace</option>
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Font Size
          </label>
          <input
            type="text"
            value={localSettings['gh:fontSize']}
            onChange={(e) => updateSetting('gh:fontSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="16px"
          />
        </div>

        {/* Line Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Line Height
          </label>
          <input
            type="number"
            step="0.1"
            min="1.0"
            max="3.0"
            value={localSettings['gh:lineHeight'] || 1.6}
            onChange={(e) => updateSetting('gh:lineHeight', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* Letter Spacing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Letter Spacing
          </label>
          <input
            type="text"
            value={localSettings['gh:letterSpacing'] || '0.05em'}
            onChange={(e) => updateSetting('gh:letterSpacing', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="0.05em"
          />
        </div>

        {/* Text Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Color
          </label>
          <input
            type="color"
            value={localSettings['gh:textColor'] || '#333333'}
            onChange={(e) => updateSetting('gh:textColor', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md"
          />
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Background Color
          </label>
          <input
            type="color"
            value={localSettings['gh:backgroundColor'] || '#FFFFFF'}
            onChange={(e) => updateSetting('gh:backgroundColor', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md"
          />
        </div>

        {/* Link Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link Color
          </label>
          <input
            type="color"
            value={localSettings['gh:linkColor'] || '#0066cc'}
            onChange={(e) => updateSetting('gh:linkColor', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md"
          />
        </div>

        {/* Page Width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Width
          </label>
          <input
            type="text"
            value={localSettings['gh:pageWidth'] || '800px'}
            onChange={(e) => updateSetting('gh:pageWidth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="800px"
          />
        </div>

        {/* Page Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Height
          </label>
          <input
            type="text"
            value={localSettings['gh:pageHeight'] || '1200px'}
            onChange={(e) => updateSetting('gh:pageHeight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="1200px"
          />
        </div>

        {/* Margins */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Margins
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Top</label>
              <input
                type="text"
                value={localSettings['gh:margin']?.top || '40px'}
                onChange={(e) => updateSetting('gh:margin', {
                  ...localSettings['gh:margin'],
                  top: e.target.value,
                } as EpubEditorSettings['gh:margin'])}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Right</label>
              <input
                type="text"
                value={localSettings['gh:margin']?.right || '40px'}
                onChange={(e) => updateSetting('gh:margin', {
                  ...localSettings['gh:margin'],
                  right: e.target.value,
                } as EpubEditorSettings['gh:margin'])}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Bottom</label>
              <input
                type="text"
                value={localSettings['gh:margin']?.bottom || '40px'}
                onChange={(e) => updateSetting('gh:margin', {
                  ...localSettings['gh:margin'],
                  bottom: e.target.value,
                } as EpubEditorSettings['gh:margin'])}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Left</label>
              <input
                type="text"
                value={localSettings['gh:margin']?.left || '40px'}
                onChange={(e) => updateSetting('gh:margin', {
                  ...localSettings['gh:margin'],
                  left: e.target.value,
                } as EpubEditorSettings['gh:margin'])}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

