/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/list-manga-projects
 * 
 * Manga project list page
 */
export default function MangaProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">マンガプロジェクト一覧</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Project cards will be rendered here */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">新規プロジェクト</h2>
            <p className="text-gray-600 mb-4">新しいマンガプロジェクトを作成</p>
            <button className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700">
              作成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

