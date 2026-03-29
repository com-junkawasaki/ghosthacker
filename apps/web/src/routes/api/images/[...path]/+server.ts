import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { imagesDir } from '$lib/server/state';

const MIME: Record<string, string> = {
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
	'.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params }) => {
	const filePath = join(imagesDir(), params.path ?? '');
	if (!existsSync(filePath)) throw error(404, 'Image not found');
	const buf = await readFile(filePath);
	const ext = extname(filePath).toLowerCase();
	return new Response(buf, {
		headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' }
	});
};
