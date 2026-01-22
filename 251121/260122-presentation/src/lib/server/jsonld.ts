import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const JSONLD_PATH = resolve(process.cwd(), 'data/presentation.jsonld');

async function readData() {
	const text = await readFile(JSONLD_PATH, 'utf8');
	return JSON.parse(text);
}

async function writeData(data: any) {
	await writeFile(JSONLD_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function getBoard() {
	const data = await readData();
	
	const nodes = data.nodes.map((node: any) => ({
		...node,
		id: node.id.replace('gh:node/', ''),
		fixed: !!node.fixed
	}));

	const links = data.links.map((link: any) => ({
		...link,
		source: link.source.replace('gh:node/', ''),
		target: link.target.replace('gh:node/', '')
	}));

	return { 
		nodes, 
		links, 
		transform: data.transform || { x: 640, y: 420, k: 0.75 } 
	};
}

export async function saveNode(id: string, x: number, y: number, fixed: boolean, scale: number, name?: string, nodeType?: string) {
	const data = await readData();
	const fullId = id.startsWith('gh:node/') ? id : `gh:node/${id}`;
	
	const nodeIndex = data.nodes.findIndex((n: any) => n.id === fullId);
	if (nodeIndex !== -1) {
		data.nodes[nodeIndex] = {
			...data.nodes[nodeIndex],
			x,
			y,
			fixed,
			scale,
			...(name !== undefined ? { name } : {})
		};
	} else {
		data.nodes.push({
			id: fullId,
			x,
			y,
			fixed,
			scale,
			name: name || '',
			nodeType: nodeType || 'text'
		});
	}
	await writeData(data);
}

export async function syncLinks(links: {source: string, target: string, label?: string, color?: string, x?: number, y?: number, fixed?: boolean}[]) {
	const data = await readData();
	
	data.links = links.map(link => ({
		source: link.source.startsWith('gh:node/') ? link.source : `gh:node/${link.source}`,
		target: link.target.startsWith('gh:node/') ? link.target : `gh:node/${link.target}`,
		label: link.label || '',
		color: link.color || '#999',
		x: link.x || 0,
		y: link.y || 0,
		fixed: !!link.fixed
	}));

	await writeData(data);
}

export async function initializeFromJSONLD(newData: any) {
	await writeData(newData);
}
