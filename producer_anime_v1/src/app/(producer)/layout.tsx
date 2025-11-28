import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ProducerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-screen w-full grid grid-cols-[260px_1fr]">
      <aside className="h-full border-r border-gray-200 bg-white/95 backdrop-blur px-4 py-6 dark:bg-gray-950/80 dark:border-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Workspace
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ghost Hacker Producer
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="space-y-6 text-sm text-gray-800 dark:text-gray-200">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pipeline</div>
            <ul className="space-y-1">
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas">Canvas</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/source-ep1">Source</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/lore/protagonist">Lore: Protagonist</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/lore/backstory">Lore: Backstory</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/lore/world">Lore: World</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/prompt-story">Prompt</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/writer-content">Writer</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/image-gen">Image Gen</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/tts-narration">TTS</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/webtoon-panel-gen">Webtoon: Panels</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/webtoon-layout">Webtoon: Layout</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/webtoon-export">Webtoon: Export</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/video-gen">Video Gen</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/render-video">Render</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/export-wattpad">Export: Wattpad</Link>
              </li>
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/canvas/publish-youtube">Publish: YouTube</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Generation</div>
            <ul className="space-y-1">
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/story">Story</Link>
              </li>
              <li>
                <span className="block rounded px-2 py-1.5 text-gray-400 dark:text-gray-500 cursor-not-allowed">Images</span>
              </li>
              <li>
                <span className="block rounded px-2 py-1.5 text-gray-400 dark:text-gray-500 cursor-not-allowed">Video</span>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <main className="h-full relative">{children}</main>
    </div>
  );
}


