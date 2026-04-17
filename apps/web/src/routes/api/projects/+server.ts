import { json } from '@sveltejs/kit';
import { listProjects } from '$lib/server/jsonld';
export const GET = async () => json(await listProjects());
