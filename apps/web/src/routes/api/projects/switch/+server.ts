import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { setActiveProject, getWorkspaceRoot } from '$lib/server/state';
import { existsSync } from 'fs';
import { join } from 'path';

export const POST: RequestHandler = async ({ request }) => {
	const { projectId } = await request.json();
	if (!projectId) throw error(400, 'Missing projectId');
	const dir = join(getWorkspaceRoot(), projectId);
	if (!existsSync(dir)) throw error(404, 'Project not found');
	setActiveProject(projectId);
	return json({ success: true });
};
