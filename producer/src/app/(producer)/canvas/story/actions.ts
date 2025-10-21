"use server";

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers';
import type {
	Backstory,
	Character,
	Episode,
	Narrative,
	Platforms,
	Project,
	Overview,
	Styles,
} from './types';

type Fault = {
    path?: (string | number)[];
    message: string;
}

const getClient = () => createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: superjson,
    }),
  ],
});

export async function submitBackstories(
	payload: Backstory[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	const client = getClient();
	return client.story.submitBackstories.mutate(payload);
}

export async function loadBackstories(): Promise<Backstory[]> {
	const client = getClient();
	return client.story.loadBackstories.query();
}

export async function submitCharacters(
	payload: Character[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	const client = getClient();
	return client.story.submitCharacters.mutate(payload);
}

export async function loadCharacters(): Promise<Character[]> {
	const client = getClient();
	return client.story.loadCharacters.query();
}

export async function submitEpisodes(
	payload: Episode[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	const client = getClient();
	return client.story.submitEpisodes.mutate(payload);
}

export async function loadEpisodes(): Promise<Episode[]> {
	const client = getClient();
	return client.story.loadEpisodes.query();
}

export async function submitNarrative(
	payload: Narrative,
): Promise<{ ok: boolean; faults: Fault[] }> {
	const client = getClient();
	return client.story.submitNarrative.mutate(payload);
}

export async function loadNarrative(): Promise<Narrative | null> {
	const client = getClient();
	return client.story.loadNarrative.query();
}

export async function submitPlatforms(
	payload: Platforms,
): Promise<{ ok: boolean; faults: Fault[] }> {
	const client = getClient();
	return client.story.submitPlatforms.mutate(payload);
}

export async function loadPlatforms(): Promise<Platforms | null> {
	const client = getClient();
	return client.story.loadPlatforms.query();
}

export async function submitOverview(
	payload: Overview,
): Promise<{ ok: boolean; faults: Fault[] }> {
	const client = getClient();
	return client.story.submitOverview.mutate(payload);
}

export async function loadProject(): Promise<Project | null> {
	const client = getClient();
	return client.story.loadProject.query();
}


export async function submitStyles(
	payload: Styles,
): Promise<{ ok: boolean; faults: Fault[] }> {
	const client = getClient();
	return client.story.submitStyles.mutate(payload);
}

export async function loadStyles(): Promise<Styles | null> {
	const client = getClient();
	return client.story.loadStyles.query();
}
