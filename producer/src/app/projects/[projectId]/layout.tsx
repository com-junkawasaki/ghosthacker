"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";

/**
 * Process names from story.jsonnet pipeline topology
 */
const PROCESS_NAMES = [
  { id: "lore-protagonist", label: "Protagonist", group: "Lore" },
  { id: "lore-backstory", label: "Backstory", group: "Lore" },
  { id: "lore-world", label: "World", group: "Lore" },
  { id: "narrative-structure", label: "Narrative Structure", group: "Story" },
  { id: "story-graph-ep1", label: "Story Graph", group: "Story" },
  { id: "prompt-story", label: "Story Prompt", group: "Generation" },
  { id: "writer-content", label: "Content Writer", group: "Generation" },
  { id: "image-gen", label: "Scene Images", group: "Generation" },
  { id: "webtoon-panel-gen", label: "Panel Generator", group: "Webtoon" },
  { id: "webtoon-layout", label: "Layout Designer", group: "Webtoon" },
  { id: "webtoon-export", label: "Webtoon Export", group: "Webtoon" },
  { id: "tts-narration", label: "Narration TTS", group: "Audio" },
  { id: "video-gen", label: "Video Generation", group: "Video" },
  { id: "render-video", label: "Video Render", group: "Video" },
  { id: "export-wattpad", label: "Wattpad Package", group: "Export" },
  { id: "publish-youtube", label: "YouTube Upload", group: "Export" },
];

/**
 * Project process menu layout
 */
export default function ProjectLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: project } = api.projects.getById.useQuery({ projectId });

  const processesByGroup = PROCESS_NAMES.reduce((acc, process) => {
    if (!acc[process.group]) {
      acc[process.group] = [];
    }
    acc[process.group].push(process);
    return acc;
  }, {} as Record<string, typeof PROCESS_NAMES>);

  return (
    <div className="h-screen w-full grid grid-cols-[260px_1fr]">
      <aside className="h-full border-r border-gray-200 bg-white/95 backdrop-blur px-4 py-6 dark:bg-gray-950/80 dark:border-gray-800 overflow-y-auto">
        <div className="mb-6">
          <Link href="/projects" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to Projects
          </Link>
          <div className="mt-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">Project</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {project?.name || projectId}
            </div>
          </div>
        </div>

        <nav className="space-y-6 text-sm text-gray-800 dark:text-gray-200">
          {Object.entries(processesByGroup).map(([group, processes]) => (
            <div key={group}>
              <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {group}
              </div>
              <ul className="space-y-1">
                {processes.map((process) => (
                  <li key={process.id}>
                    <Link
                      className="block rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                      href={`/projects/${projectId}/${process.id}`}
                    >
                      {process.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="h-full relative overflow-auto">{children}</main>
    </div>
  );
}

