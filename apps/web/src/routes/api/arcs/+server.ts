import { json } from '@sveltejs/kit';
import { getArcs } from '$lib/server/jsonld';
export const GET = async () => json({ arcs: await getArcs() });
