import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Manga Editor</h1>
        <Link
          href="/manga"
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
        >
          プロジェクト一覧へ
        </Link>
      </div>
    </main>
  );
}

