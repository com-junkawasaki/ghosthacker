import Link from "next/link";
import StoryOverviewForm from "./StoryOverviewForm.client";
import NarrativeForm from "./NarrativeForm.client";
import CharactersForm from "./CharactersForm.client";
import StyleForm from "./StyleForm.client";
import PlatformsForm from "./PlatformsForm.client";
import PreviewPanel from "./PreviewPanel.client";

export default function StoryPipelinePage() {
  return (
    <div className="h-full w-full p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Story Pipeline</h1>
      <p className="text-gray-700">物語の構成・生成フローをここに実装します。</p>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 p-4 bg-white">
          <div className="text-sm font-medium text-gray-900 mb-3">Overview</div>
          <StoryOverviewForm />
        </div>
        <div className="rounded-lg border border-gray-200 p-4 bg-white">
          <div className="text-sm font-medium text-gray-900 mb-3">Quick Actions</div>
          <p className="text-sm text-gray-700 mb-3">まずはキャンバスで全体フローを確認できます。</p>
          <Link className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" href="/canvas">Open Canvas →</Link>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 p-4 bg-white">
        <div className="text-sm font-medium text-gray-900 mb-3">Narrative</div>
        <NarrativeForm />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 p-4 bg-white">
        <div className="text-sm font-medium text-gray-900 mb-3">Characters</div>
        <CharactersForm />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 p-4 bg-white">
        <div className="text-sm font-medium text-gray-900 mb-3">Style</div>
        <StyleForm />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 p-4 bg-white">
        <div className="text-sm font-medium text-gray-900 mb-3">Platforms</div>
        <PlatformsForm />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 p-4 bg-white">
        <div className="text-sm font-medium text-gray-900 mb-3">Preview</div>
        <PreviewPanel />
      </div>
    </div>
  );
}


