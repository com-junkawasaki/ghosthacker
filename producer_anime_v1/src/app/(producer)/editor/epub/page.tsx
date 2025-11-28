'use client';

import EditorContainer from '@/components/epub-editor/EditorContainer';

/**
 * ePub3エディタページ
 * 
 * Scroll + Page View ハイブリッド
 * OWL/SHACL統合
 * LLM統合
 */
export default function EpubEditorPage() {
  return (
    <div className="h-screen w-full">
      <EditorContainer />
    </div>
  );
}

