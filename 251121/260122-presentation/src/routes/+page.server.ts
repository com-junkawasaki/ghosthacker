import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BOARD_PATH = fileURLToPath(new URL('../../data/ghosthacker-board.jsonld', import.meta.url));

type BoardNode = {
	id: string;
	nodeType: 'char' | 'concept' | 'ep' | string;
	name?: string;
	description?: string;
	image?: string;
	role?: string;
	credentials?: string[];
	color?: string;
	x?: number;
	y?: number;
	fixed?: boolean;
};

type BoardLink = {
	source: string;
	target: string;
	label?: string;
	color?: string;
};

type BoardFile = {
	'@context'?: unknown;
	id?: string;
	type?: string;
	name?: string;
	transform?: { x: number; y: number; k: number };
	nodes?: BoardNode[];
	links?: BoardLink[];
};

function stripNodeId(id: string): string {
	return id.startsWith('gh:node/') ? id.slice('gh:node/'.length) : id;
}

function prefixNodeId(id: string): string {
	return id.startsWith('gh:node/') ? id : `gh:node/${id}`;
}

function toClientBoard(board: BoardFile) {
	const transform = board.transform ?? { x: 0, y: 0, k: 1 };
	const nodes = (board.nodes ?? []).map((n) => ({ ...n, id: stripNodeId(n.id) }));
	const links = (board.links ?? []).map((l) => ({
		...l,
		source: stripNodeId(l.source),
		target: stripNodeId(l.target)
	}));
	return { transform, nodes, links };
}

function toDiskBoard(client: { transform: { x: number; y: number; k: number }; nodes: BoardNode[]; links: BoardLink[] }, base: BoardFile): BoardFile {
	return {
		...base,
		transform: client.transform,
		nodes: client.nodes.map((n) => ({ ...n, id: prefixNodeId(n.id) })),
		links: client.links.map((l) => ({ ...l, source: prefixNodeId(l.source), target: prefixNodeId(l.target) }))
	};
}

async function readBoardFile(): Promise<BoardFile> {
	const text = await readFile(BOARD_PATH, 'utf8');
	return JSON.parse(text) as BoardFile;
}

async function writeBoardFile(board: BoardFile) {
	const pretty = JSON.stringify(board, null, 2) + '\n';
	await writeFile(BOARD_PATH, pretty, 'utf8');
}

export const load: PageServerLoad = async () => {
	try {
		const board = await readBoardFile();
		return { board: toClientBoard(board) };
	} catch (e) {
		throw error(500, `Failed to read board JSON-LD: ${String(e)}`);
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const form = await request.formData();
		const layout = form.get('layout');
		if (typeof layout !== 'string' || layout.trim().length === 0) {
			return fail(400, { message: 'Missing layout' });
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(layout);
		} catch {
			return fail(400, { message: 'Invalid JSON' });
		}

		// Minimal structural validation
		const candidate = parsed as any;
		if (!candidate || typeof candidate !== 'object') return fail(400, { message: 'Invalid payload' });
		if (!candidate.transform || typeof candidate.transform !== 'object') return fail(400, { message: 'Missing transform' });
		if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.links)) return fail(400, { message: 'Missing nodes/links' });

		try {
			const base = await readBoardFile();
			const disk = toDiskBoard(candidate, base);
			await writeBoardFile(disk);
			return { ok: true };
		} catch (e) {
			throw error(500, `Failed to write board JSON-LD: ${String(e)}`);
		}
	}
};

