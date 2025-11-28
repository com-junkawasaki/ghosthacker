/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/export-dialog
 * 
 * Export dialog component
 */
'use client';

import { useState } from 'react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'jpeg' | 'pdf', resolution?: number) => void;
}

export function ExportDialog({ isOpen, onClose, onExport }: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [resolution, setResolution] = useState(300);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">エクスポート</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">形式</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg' | 'pdf')}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          {format === 'pdf' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">解像度 (DPI)</label>
              <input
                type="number"
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                min={72}
                max={600}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                onExport(format, format === 'pdf' ? resolution : undefined);
                onClose();
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              エクスポート
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

