/** Server-side singleton for active project state. */
import { join } from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || join(process.cwd(), '..', '..');

let activeProjectId = process.env.PROJECT_DIR || '260208-spirit-in-physics';

export function getWorkspaceRoot(): string { return WORKSPACE_ROOT; }
export function getActiveProject(): string { return activeProjectId; }
export function setActiveProject(id: string) { activeProjectId = id; }
export function projectRoot(): string { return join(WORKSPACE_ROOT, activeProjectId); }
export function storyboardPath(): string { return join(projectRoot(), 'resources', 'storyboard.jsonld'); }
export function imagesDir(): string { return join(projectRoot(), 'resources', 'images'); }
