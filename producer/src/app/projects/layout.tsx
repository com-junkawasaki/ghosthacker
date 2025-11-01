import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Producer process layout
 * @see https://bolt.new - Inspired by bolt.new's project-based structure
 */
export default function ProjectsLayout({
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
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Projects</div>
            <ul className="space-y-1">
              <li>
                <Link className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70" href="/projects">All Projects</Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <main className="h-full relative overflow-auto">{children}</main>
    </div>
  );
}

