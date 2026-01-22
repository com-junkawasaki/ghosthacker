import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { RequestHandler } from './$types';

const BOARD_PATH = fileURLToPath(new URL('../../../data/ghosthacker-board.jsonld', import.meta.url));

export const GET: RequestHandler = async () => {
	const jsonld = await readFile(BOARD_PATH, 'utf8');
	return new Response(jsonld, {
		headers: {
			'content-type': 'application/ld+json; charset=utf-8',
			'content-disposition': 'attachment; filename=\"ghosthacker-board.jsonld\"'
		}
	});
};

