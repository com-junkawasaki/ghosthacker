/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/top-bar
 * 
 * Top bar component with logo, credits, and export button
 */
'use client';

import { useState } from 'react';
import { CreditDisplay } from './CreditDisplay';
import { ExportDialog } from '../dialogs/ExportDialog';

interface TopBarProps {
  onExport?: (format: 'png' | 'jpeg' | 'pdf', resolution?: number) => void;
}

export function TopBar({ onExport }: TopBarProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <>
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="text-sm text-gray-600">▼</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CreditDisplay credits={7030} />
          <button
            onClick={() => setShowExportDialog(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm font-medium"
          >
            Export
          </button>
        </div>
      </div>
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={(format, resolution) => {
          onExport?.(format, resolution);
          setShowExportDialog(false);
        }}
      />
    </>
  );
}

