import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
	'bolt://localhost:7687',
	neo4j.auth.basic('neo4j', 'password')
);

export async function getBoard() {
	const session = driver.session();
	try {
		const result = await session.run(`
			MATCH (n:Node)
			OPTIONAL MATCH (n)-[r]->(m:Node)
			RETURN n, collect({type: type(r), properties: properties(r), target: m.id}) as links
		`);

		const nodes = result.records.map(record => {
			const node = record.get('n').properties;
			return {
				...node,
				x: node.x?.toNumber ? node.x.toNumber() : (node.x || 0),
				y: node.y?.toNumber ? node.y.toNumber() : (node.y || 0),
				scale: node.scale?.toNumber ? node.scale.toNumber() : (node.scale || 1),
				fixed: !!node.fixed
			};
		});

		const links: any[] = [];
		result.records.forEach(record => {
			const sourceId = record.get('n').properties.id;
			const rels = record.get('links');
			rels.forEach((rel: any) => {
				if (rel.target) {
					const props = rel.properties;
					links.push({
						source: sourceId,
						target: rel.target,
						label: props.label || '',
						color: props.color || '#999',
						x: props.x?.toNumber ? props.x.toNumber() : (props.x || 0),
						y: props.y?.toNumber ? props.y.toNumber() : (props.y || 0),
						fixed: !!props.fixed
					});
				}
			});
		});

		return { nodes, links, transform: { x: 640, y: 420, k: 0.75 } };
	} finally {
		await session.close();
	}
}

export async function saveNode(id: string, x: number, y: number, fixed: boolean, scale: number) {
	const session = driver.session();
	try {
		await session.run(`
			MERGE (n:Node {id: $id})
			SET n.x = $x, n.y = $y, n.fixed = $fixed, n.scale = $scale
		`, { id, x, y, fixed, scale });
	} finally {
		await session.close();
	}
}

export async function syncLinks(links: {source: string, target: string, label?: string, color?: string, x?: number, y?: number, fixed?: boolean}[]) {
	const session = driver.session();
	try {
		await session.run('MATCH ()-[r:RELATES_TO]->() DELETE r');
		for (const link of links) {
			await session.run(`
				MATCH (a:Node {id: $source}), (b:Node {id: $target})
				MERGE (a)-[r:RELATES_TO]->(b)
				SET r.label = $label, r.color = $color, r.x = $x, r.y = $y, r.fixed = $fixed
			`, {
				source: link.source,
				target: link.target,
				label: link.label || '',
				color: link.color || '#999',
				x: link.x || 0,
				y: link.y || 0,
				fixed: !!link.fixed
			});
		}
	} finally {
		await session.close();
	}
}

export async function initializeFromJSONLD(data: any) {
	const session = driver.session();
	try {
		await session.run('MATCH (n) DETACH DELETE n');
		for (const node of data.nodes) {
			await session.run(`
				CREATE (n:Node {
					id: $id,
					nodeType: $nodeType,
					name: $name,
					description: $description,
					image: $image,
					role: $role,
					credentials: $credentials,
					color: $color,
					x: $x,
					y: $y,
					scale: $scale,
					fixed: $fixed
				})
			`, {
				id: node.id.replace('gh:node/', ''),
				nodeType: node.nodeType,
				name: node.name || '',
				description: node.description || '',
				image: node.image || '',
				role: node.role || '',
				credentials: node.credentials || [],
				color: node.color || '#999',
				x: node.x || 0,
				y: node.y || 0,
				scale: node.scale || 1,
				fixed: !!node.fixed
			});
		}
		for (const link of data.links) {
			await session.run(`
				MATCH (a:Node {id: $source}), (b:Node {id: $target})
				MERGE (a)-[r:RELATES_TO]->(b)
				SET r.label = $label, r.color = $color, r.x = $x, r.y = $y, r.fixed = $fixed
			`, {
				source: link.source.replace('gh:node/', ''),
				target: link.target.replace('gh:node/', ''),
				label: link.label || '',
				color: link.color || '#999',
				x: link.x || 0,
				y: link.y || 0,
				fixed: !!link.fixed
			});
		}
	} finally {
		await session.close();
	}
}
