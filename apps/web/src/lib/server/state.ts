/** Server-side singleton for active project state. */
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || join(process.cwd(), '..', '..');

function detectDefaultProject(): string {
	try {
		for (const entry of readdirSync(WORKSPACE_ROOT)) {
			if (!entry.startsWith('26')) continue;
			const full = join(WORKSPACE_ROOT, entry);
			if (!statSync(full).isDirectory()) continue;
			if (existsSync(join(full, 'resources', 'storyboard.jsonld'))) return entry;
		}
	} catch {}
	return '260208-spirit-in-physics';
}

let activeProjectId = process.env.PROJECT_DIR || detectDefaultProject();

export function getWorkspaceRoot(): string { return WORKSPACE_ROOT; }
export function getActiveProject(): string { return activeProjectId; }
export function setActiveProject(id: string) { activeProjectId = id; }
export function projectRoot(): string { return join(WORKSPACE_ROOT, activeProjectId); }
export function storyboardPath(): string { return join(projectRoot(), 'resources', 'storyboard.jsonld'); }
export function imagesDir(): string { return join(projectRoot(), 'resources', 'images'); }
