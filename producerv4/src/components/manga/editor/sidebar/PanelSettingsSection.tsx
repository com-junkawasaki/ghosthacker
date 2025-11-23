/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-settings-section
 * 
 * Panel settings section component for PageTab
 */
'use client';

import { useState } from 'react';

interface PanelSettingsSectionProps {
  selectedPanel?: {
    id: string;
    order?: number;
    hideBorder?: boolean;
    ignoreNeighborPanels?: boolean;
  };
  onSettingsChange?: (settings: {
    order?: number;
    hideBorder?: boolean;
    ignoreNeighborPanels?: boolean;
  }) => void;
}

export function PanelSettingsSection({ 
  selectedPanel, 
  onSettingsChange 
}: PanelSettingsSectionProps) {
  const [order, setOrder] = useState(selectedPanel?.order ?? 1);
  const [hideBorder, setHideBorder] = useState(selectedPanel?.hideBorder ?? false);
  const [ignoreNeighborPanels, setIgnoreNeighborPanels] = useState(
    selectedPanel?.ignoreNeighborPanels ?? false
  );

  const handleOrderChange = (value: number) => {
    setOrder(value);
    onSettingsChange?.({ order: value, hideBorder, ignoreNeighborPanels });
  };

  const handleHideBorderToggle = () => {
    const newValue = !hideBorder;
    setHideBorder(newValue);
    onSettingsChange?.({ order, hideBorder: newValue, ignoreNeighborPanels });
  };

  const handleIgnoreNeighborPanelsToggle = () => {
    const newValue = !ignoreNeighborPanels;
    setIgnoreNeighborPanels(newValue);
    onSettingsChange?.({ order, hideBorder, ignoreNeighborPanels: newValue });
  };

  if (!selectedPanel) {
    return (
      <div className="border-b border-gray-200 pb-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">パネル設定</h3>
        <p className="text-sm text-gray-500">パネルを選択して設定を編集</p>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 pb-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-2">パネル設定</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Order</label>
          <input
            type="number"
            value={order}
            onChange={(e) => handleOrderChange(parseInt(e.target.value) || 1)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            min="1"
          />
        </div>
        <button
          onClick={handleHideBorderToggle}
          className={`w-full px-3 py-2 text-sm rounded border ${
            hideBorder
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Hide Border
        </button>
        <button
          onClick={handleIgnoreNeighborPanelsToggle}
          className={`w-full px-3 py-2 text-sm rounded border ${
            ignoreNeighborPanels
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Ignore Neighbor Panels
        </button>
      </div>
    </div>
  );
}

