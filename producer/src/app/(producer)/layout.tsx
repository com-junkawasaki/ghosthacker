import Link from "next/link";

export default function ProducerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-screen w-full grid grid-cols-[260px_1fr]">
      <aside className="h-full border-r border-gray-200 bg-white/95 backdrop-blur px-4 py-6">
        <div className="mb-6">
          <div className="text-sm text-gray-500">Workspace</div>
          <div className="text-lg font-semibold text-gray-900">Ghost Hacker Producer</div>
        </div>

        <nav className="space-y-6 text-sm text-gray-800">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Pipeline</div>
            <ul className="space-y-1">
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100" href="/canvas">Canvas</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Generation</div>
            <ul className="space-y-1">
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100" href="/story">Story</Link>
              </li>
              <li>
                <span className="block rounded px-2 py-1.5 text-gray-400 cursor-not-allowed">Images</span>
              </li>
              <li>
                <span className="block rounded px-2 py-1.5 text-gray-400 cursor-not-allowed">Video</span>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <main className="h-full relative">{children}</main>
    </div>
  );
}


