'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isGraphPage = pathname?.includes('/graph');
  const [graphExpanded, setGraphExpanded] = useState(isGraphPage || false);

  useEffect(() => {
    if (isGraphPage) {
      setGraphExpanded(true);
    }
  }, [isGraphPage]);

  const projectNavItems = [
    { href: `/projects/${params.projectId}`, label: 'Overview', icon: '📋' },
    { href: `/projects/${params.projectId}/story`, label: 'Story', icon: '📖' },
    { href: `/projects/${params.projectId}/pipeline`, label: 'Pipeline', icon: '⚙️' },
    { href: `/projects/${params.projectId}/assets`, label: 'Assets', icon: '📦' },
    { href: `/projects/${params.projectId}/epub-editor`, label: 'EPUB Editor', icon: '📚' },
    { href: `/projects/${params.projectId}/kindle-editor`, label: 'Kindle Editor', icon: '📱' },
    { href: `/projects/${params.projectId}/settings`, label: 'Settings', icon: '⚙️' },
  ];

  const graphNavItems = [
    { id: 'visualization', label: 'Visualization', icon: '📊' },
    { id: 'search', label: 'Semantic Search', icon: '🔍' },
    { id: 'rag', label: 'Graph RAG', icon: '💬' },
    { id: 'editor', label: 'JSON-LD Editor', icon: '✏️' },
    { id: 'query', label: 'Query', icon: '🔎' },
    { id: 'vector', label: 'Vector Search', icon: '🎯' },
    { id: 'import', label: 'Import/Export', icon: '📥' },
  ];

  type TabType = 'visualization' | 'search' | 'rag' | 'editor' | 'query' | 'vector' | 'import';

  const currentGraphTab = isGraphPage 
    ? (searchParams?.get('tab') as TabType) || 'visualization'
    : null;

  const isActive = (href: string) => {
    if (href === `/projects/${params.projectId}`) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link
            href="/projects"
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-semibold mb-2"
          >
            ← Projects
          </Link>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Project Navigation
          </h2>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          {projectNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors
                ${
                  isActive(item.href)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}

          {/* Graph Section */}
          <div className="mt-2">
            <div className="flex items-center">
              <Link
                href={`/projects/${params.projectId}/graph`}
                className={`
                  flex-1 flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors
                  ${
                    isGraphPage
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span>🕸️</span>
                <span className="text-sm font-medium">Graph</span>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setGraphExpanded(!graphExpanded);
                }}
                className={`
                  px-2 py-2 rounded-lg mb-1 transition-colors
                  text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700
                `}
                aria-label={graphExpanded ? 'Collapse Graph menu' : 'Expand Graph menu'}
              >
                <span className={`text-xs transition-transform inline-block ${graphExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </button>
            </div>

            {/* Graph Sub-items */}
            {graphExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {graphNavItems.map((item) => {
                  const graphHref = `/projects/${params.projectId}/graph?tab=${item.id}`;
                  const isActiveTab = 
                    (isGraphPage && currentGraphTab === item.id) || 
                    (isGraphPage && !currentGraphTab && item.id === 'visualization');
                  
                  return (
                    <Link
                      key={item.id}
                      href={graphHref}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                        ${
                          isActiveTab
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <span className="text-xs">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
