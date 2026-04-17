import { json } from '@sveltejs/kit';
import { getEpisodes } from '$lib/server/jsonld';
export const GET = async () => json({ episodes: await getEpisodes() });
