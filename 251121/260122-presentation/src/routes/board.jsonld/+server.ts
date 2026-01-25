import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RequestHandler } from './$types';

const BOARD_PATH = resolve(process.cwd(), 'data/presentation.jsonld');

export const GET: RequestHandler = async () => {
	const jsonld = await readFile(BOARD_PATH, 'utf8');
	return new Response(jsonld, {
		headers: {
			'content-type': 'application/ld+json; charset=utf-8',
			'content-disposition': 'attachment; filename=\"ghosthacker-board.jsonld\"'
		}
	});
};

