import Link from 'next/link';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  return (
    <div>
      <nav className="bg-gray-100 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 py-4 items-center">
            <Link
              href="/projects"
              className="text-gray-600 hover:text-gray-900 font-semibold mr-4"
            >
              ← Projects
            </Link>
            <Link
              href={`/projects/${params.projectId}/story`}
              className="text-blue-600 hover:underline"
            >
              Story
            </Link>
            <Link
              href={`/projects/${params.projectId}/pipeline`}
              className="text-blue-600 hover:underline"
            >
              Pipeline
            </Link>
            <Link
              href={`/projects/${params.projectId}/assets`}
              className="text-blue-600 hover:underline"
            >
              Assets
            </Link>
            <Link
              href={`/projects/${params.projectId}/epub-editor`}
              className="text-blue-600 hover:underline"
            >
              EPUB Editor
            </Link>
            <Link
              href={`/projects/${params.projectId}/kindle-editor`}
              className="text-blue-600 hover:underline"
            >
              Kindle Editor
            </Link>
            <Link
              href={`/projects/${params.projectId}/settings`}
              className="text-blue-600 hover:underline"
            >
              Settings
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}

