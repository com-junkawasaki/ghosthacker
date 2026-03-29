/**
 * Minimal Cypher query parser and executor for the in-memory GraphStore.
 *
 * Supported subset:
 *   MATCH (n:Label)                                  -- node by label
 *   MATCH (n:Label)-[:REL]->(m:Label)                -- single hop
 *   MATCH (a:L1)-[:R1]->(b:L2)-[:R2]->(c:L3)        -- two hops
 *   WHERE n.prop = value                             -- property filter (=, !=, <, >, CONTAINS)
 *   RETURN n                                         -- return bound variables
 *   ORDER BY n.prop ASC|DESC                         -- sort
 *   LIMIT n                                          -- limit results
 */

import type { GraphStore, GraphNode } from './graph-store';

export interface CypherResult {
	columns: string[];
	rows: Record<string, GraphNode>[];
}

// ---- Tokenizer ----

interface MatchSegment {
	varName: string;
	label?: string | undefined;
}

interface MatchHop {
	relType: string;
	target: MatchSegment;
}

interface WhereClause {
	varName: string;
	prop: string;
	op: '=' | '!=' | '<' | '>' | 'CONTAINS';
	value: string | number | boolean;
}

interface ParsedQuery {
	startNode: MatchSegment;
	hops: MatchHop[];
	wheres: WhereClause[];
	returnVars: string[];
	orderBy?: { varName: string; prop: string; dir: 'ASC' | 'DESC' } | undefined;
	limit?: number | undefined;
}

function parseValue(raw: string): string | number | boolean {
	const trimmed = raw.trim();
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
	// Strip quotes
	if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
		(trimmed.startsWith('"') && trimmed.endsWith('"'))) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function parseMatchSegment(raw: string): MatchSegment {
	// (varName:Label) or (varName)
	const m = raw.match(/^\((\w+)(?::(\w+))?\)$/);
	if (!m) throw new Error(`Invalid node pattern: ${raw}`);
	return { varName: m[1]!, label: m[2] };
}

function parseCypher(cypher: string): ParsedQuery {
	const normalized = cypher.trim().replace(/\s+/g, ' ');

	// Extract clauses
	const matchMatch = normalized.match(/MATCH\s+(.+?)(?:\s+WHERE\s|\s+RETURN\s)/i);
	const whereMatch = normalized.match(/WHERE\s+(.+?)(?:\s+RETURN\s)/i);
	const returnMatch = normalized.match(/RETURN\s+(.+?)(?:\s+ORDER\s|\s+LIMIT\s|$)/i);
	const orderMatch = normalized.match(/ORDER\s+BY\s+(\w+)\.(\w+)\s*(ASC|DESC)?/i);
	const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);

	if (!matchMatch || !returnMatch) {
		throw new Error(`Cannot parse Cypher: ${cypher}`);
	}

	const matchExpr = matchMatch[1]!.trim();
	const returnExpr = returnMatch[1]!.trim();

	// Parse MATCH pattern: (a:L1)-[:R1]->(b:L2)-[:R2]->(c:L3)
	// Split on )-[  or ]->( boundaries
	const parts = matchExpr.split(/(?<=\))-\[:(\w+)\]->\s*/);

	const startNode = parseMatchSegment(parts[0]!);
	const hops: MatchHop[] = [];
	for (let i = 1; i < parts.length; i += 2) {
		const relType = parts[i]!;
		const targetRaw = parts[i + 1];
		if (targetRaw) {
			hops.push({ relType, target: parseMatchSegment(targetRaw) });
		}
	}

	// Parse WHERE
	const wheres: WhereClause[] = [];
	if (whereMatch) {
		const conditions = whereMatch[1]!.split(/\s+AND\s+/i);
		for (const cond of conditions) {
			const containsM = cond.match(/(\w+)\.(\w[\w.]*)\s+CONTAINS\s+(.+)/i);
			if (containsM) {
				wheres.push({
					varName: containsM[1]!,
					prop: containsM[2]!,
					op: 'CONTAINS',
					value: parseValue(containsM[3]!),
				});
				continue;
			}
			const compM = cond.match(/(\w+)\.(\w[\w.]*)\s*(=|!=|<|>)\s*(.+)/);
			if (compM) {
				wheres.push({
					varName: compM[1]!,
					prop: compM[2]!,
					op: compM[3] as WhereClause['op'],
					value: parseValue(compM[4]!),
				});
			}
		}
	}

	// Parse RETURN
	const returnVars = returnExpr.split(',').map((v) => v.trim());

	// Parse ORDER BY
	let orderBy: ParsedQuery['orderBy'];
	if (orderMatch) {
		orderBy = {
			varName: orderMatch[1]!,
			prop: orderMatch[2]!,
			dir: (orderMatch[3]?.toUpperCase() ?? 'ASC') as 'ASC' | 'DESC',
		};
	}

	const limit = limitMatch ? Number(limitMatch[1]) : undefined;

	return { startNode, hops, wheres, returnVars, orderBy, limit };
}

function matchesWhere(
	bindings: Record<string, GraphNode>,
	where: WhereClause,
): boolean {
	const node = bindings[where.varName];
	if (!node) return false;
	const actual = node.props[where.prop];
	if (actual === undefined) return false;

	switch (where.op) {
		case '=':
			return actual == where.value;
		case '!=':
			return actual != where.value;
		case '<':
			return (actual as number) < (where.value as number);
		case '>':
			return (actual as number) > (where.value as number);
		case 'CONTAINS':
			return String(actual).includes(String(where.value));
		default:
			return false;
	}
}

/** Execute a Cypher-subset query against a GraphStore. */
export function query(graph: GraphStore, cypher: string): CypherResult {
	const parsed = parseCypher(cypher);
	const { startNode, hops, wheres, returnVars, orderBy, limit } = parsed;

	// Find starting nodes
	let candidates: GraphNode[];
	if (startNode.label) {
		candidates = graph.nodesByLabel(startNode.label);
	} else {
		candidates = [...graph.nodes.values()];
	}

	// Build binding sets by traversing hops
	let bindingSets: Record<string, GraphNode>[] = candidates.map((n) => ({
		[startNode.varName]: n,
	}));

	for (const hop of hops) {
		const nextSets: Record<string, GraphNode>[] = [];
		for (const bindings of bindingSets) {
			// Find the last bound node in the chain
			const keys = Object.keys(bindings);
			const lastVar = keys[keys.length - 1]!;
			const lastNode = bindings[lastVar]!;

			const neighbors = graph.traverse(lastNode.id, hop.relType);
			for (const neighbor of neighbors) {
				if (hop.target.label && !neighbor.labels.includes(hop.target.label)) continue;
				nextSets.push({ ...bindings, [hop.target.varName]: neighbor });
			}
		}
		bindingSets = nextSets;
	}

	// Apply WHERE filters
	for (const w of wheres) {
		bindingSets = bindingSets.filter((b) => matchesWhere(b, w));
	}

	// ORDER BY
	if (orderBy) {
		const { varName, prop, dir } = orderBy;
		bindingSets.sort((a, b) => {
			const va = a[varName]?.props[prop];
			const vb = b[varName]?.props[prop];
			if (va === vb) return 0;
			if (va === undefined) return 1;
			if (vb === undefined) return -1;
			const cmp = (va as number) < (vb as number) ? -1 : 1;
			return dir === 'DESC' ? -cmp : cmp;
		});
	}

	// LIMIT
	if (limit !== undefined) {
		bindingSets = bindingSets.slice(0, limit);
	}

	// Project RETURN columns
	const rows = bindingSets.map((b) => {
		const row: Record<string, GraphNode> = {};
		for (const v of returnVars) {
			if (b[v]) row[v] = b[v];
		}
		return row;
	});

	return { columns: returnVars, rows };
}
