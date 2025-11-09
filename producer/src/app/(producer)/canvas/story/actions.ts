"use server";

import { graphqlClient, queries, mutations } from '@/lib/graphql-client';
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

const PROJECT_ID = 'ghost-hacker-project'; // FIXME: Should not be hardcoded

type Fault = {
    path?: (string | number)[];
    message: string;
}

export async function submitBackstories(
	payload: Backstory[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	try {
		const input = payload.map(b => ({
			origin: b.origin,
			motivation: b.motivation,
			conflict: b.conflict,
			characterName: b.characterName,
		}));
		
		await graphqlClient.request(mutations.saveBackstories, {
			projectId: PROJECT_ID,
			input,
		});
		
		return { ok: true, faults: [] };
	} catch (error) {
		return { ok: false, faults: [{ message: (error as Error).message }] };
	}
}

export async function loadBackstories(): Promise<Backstory[]> {
	try {
		const data = await graphqlClient.request(queries.backstories, {
			projectId: PROJECT_ID,
		});
		
		return (data.backstories || []).map((b: any) => ({
			origin: b.origin,
			motivation: b.motivation || undefined,
			conflict: b.conflict || undefined,
			characterName: undefined, // TODO: Resolve character name from characterId
		}));
	} catch (error) {
		console.error('Failed to load backstories', error);
		return [];
	}
}

export async function submitCharacters(
	payload: Character[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	try {
		const input = payload.map(c => ({
			name: c.name,
			role: c.role,
			motivation: c.motivation,
			conflict: c.conflict,
			voice: c.voice,
		}));
		
		await graphqlClient.request(mutations.saveCharacters, {
			projectId: PROJECT_ID,
			input,
		});
		
		return { ok: true, faults: [] };
	} catch (error) {
		return { ok: false, faults: [{ message: (error as Error).message }] };
	}
}

export async function loadCharacters(): Promise<Character[]> {
	try {
		const data = await graphqlClient.request(queries.characters, {
			projectId: PROJECT_ID,
		});
		
		return (data.characters || []).map((c: any) => ({
			name: c.name,
			role: c.role,
			motivation: c.motivation || undefined,
			conflict: c.conflict || undefined,
			voice: c.voice || undefined,
		}));
	} catch (error) {
		console.error('Failed to load characters', error);
		return [];
	}
}

export async function submitEpisodes(
	payload: Episode[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	try {
		const input = payload.map(e => ({
			id: e['@id'],
			name: e['schema:name'],
			episodeNumber: e['schema:episodeNumber'],
			hasPart: e['gh:hasPart']?.map((p: any) => ({
				type_: p['@type'],
				contentUrl: p['schema:contentUrl'],
				name: p['schema:name'],
				description: p['schema:description'],
			})),
		}));
		
		await graphqlClient.request(mutations.saveEpisodes, {
			projectId: PROJECT_ID,
			input,
		});
		
		return { ok: true, faults: [] };
	} catch (error) {
		return { ok: false, faults: [{ message: (error as Error).message }] };
	}
}

export async function loadEpisodes(): Promise<Episode[]> {
	try {
		const data = await graphqlClient.request(queries.episodes, {
			projectId: PROJECT_ID,
		});
		
		return (data.episodes || []).map((e: any) => ({
			"@id": e.id,
			"@type": "gh:Episode",
			"schema:name": e.name,
			"schema:episodeNumber": e.episodeNumber,
			"gh:hasPart": e.hasPart?.map((p: any) => ({
				"@type": p.type,
				"schema:contentUrl": p.contentUrl,
				"schema:name": p.name,
				"schema:description": p.description,
			})) || [],
		}));
	} catch (error) {
		console.error('Failed to load episodes', error);
		return [];
	}
}

export async function submitNarrative(
	payload: Narrative,
): Promise<{ ok: boolean; faults: Fault[] }> {
	try {
		const input = {
			synopsis: payload.synopsis,
			structure: payload.structure,
			beats: payload.beats?.map(b => ({
				id: b.id,
				label: b.label,
				purpose: b.purpose,
				targetLength: b.targetLength,
			})) || [],
		};
		
		await graphqlClient.request(mutations.saveNarrative, {
			projectId: PROJECT_ID,
			input,
		});
		
		return { ok: true, faults: [] };
	} catch (error) {
		return { ok: false, faults: [{ message: (error as Error).message }] };
	}
}

export async function loadNarrative(): Promise<Narrative | null> {
	try {
		const data = await graphqlClient.request(queries.narrative, {
			projectId: PROJECT_ID,
		});
		
		if (!data.narrative) return null;
		
		return {
			synopsis: data.narrative.synopsis,
			structure: data.narrative.structure,
			beats: data.narrative.beats || [],
		};
	} catch (error) {
		console.error('Failed to load narrative', error);
		return null;
	}
}

export async function submitPlatforms(
	payload: Platforms,
): Promise<{ ok: boolean; faults: Fault[] }> {
	try {
		const input = {
			wattpad: {
				chapterCount: payload.wattpad.chapterCount,
				includeImages: payload.wattpad.includeImages,
				chapterLengthWords: payload.wattpad.chapterLengthWords,
				imageFrequency: payload.wattpad.imageFrequency,
			},
			webtoon: {
				episodePanels: payload.webtoon.episodePanels,
				bubbleDensity: payload.webtoon.bubbleDensity,
				readingPace: payload.webtoon.readingPace,
				soundEffects: payload.webtoon.soundEffects,
			},
			youtube: {
				targetDurationSec: payload.youtube.targetDurationSec,
				aspectRatio: payload.youtube.aspectRatio,
				captions: payload.youtube.captions,
				brollRatio: payload.youtube.brollRatio,
			},
		};
		
		await graphqlClient.request(mutations.savePlatforms, {
			projectId: PROJECT_ID,
			input,
		});
		
		return { ok: true, faults: [] };
	} catch (error) {
		return { ok: false, faults: [{ message: (error as Error).message }] };
	}
}

export async function loadPlatforms(): Promise<Platforms | null> {
	try {
		const data = await graphqlClient.request(queries.platforms, {
			projectId: PROJECT_ID,
		});
		
		if (!data.platforms) return null;
		
		return {
			wattpad: data.platforms.wattpad,
			webtoon: data.platforms.webtoon,
			youtube: data.platforms.youtube,
		};
	} catch (error) {
		console.error('Failed to load platforms', error);
		return null;
	}
}

export async function submitOverview(
	payload: Overview,
): Promise<{ ok: boolean; faults: Fault[] }> {
	try {
		const input = {
			title: payload.title,
			logline: payload.logline,
			genres: payload.genres,
			tone: payload.tone,
			audienceRating: payload.audienceRating,
			language: payload.language,
			keywords: payload.keywords,
		};
		
		// Try to update first, if fails create new
		try {
			await graphqlClient.request(mutations.updateProject, {
				id: PROJECT_ID,
				input,
			});
		} catch {
			await graphqlClient.request(mutations.createProject, {
				input: { ...input, id: PROJECT_ID },
			});
		}
		
		return { ok: true, faults: [] };
	} catch (error) {
		return { ok: false, faults: [{ message: (error as Error).message }] };
	}
}

export async function loadProject(): Promise<Project | null> {
	try {
		const data = await graphqlClient.request(queries.project, {
			id: PROJECT_ID,
		});
		
		if (!data.project) return null;
		
		return {
			id: data.project.id,
			title: data.project.title,
			logline: data.project.logline,
			genres: data.project.genres,
			tone: data.project.tone,
			audienceRating: data.project.audienceRating,
			language: data.project.language,
			keywords: data.project.keywords,
			createdAt: data.project.createdAt,
			updatedAt: data.project.updatedAt,
		};
	} catch (error) {
		console.error('Failed to load project', error);
		return null;
	}
}

export async function submitStyles(
	payload: Styles,
): Promise<{ ok: boolean; faults: Fault[] }> {
	try {
		const input = {
			visual: {
				artStyle: payload.visual.artStyle,
				palette: payload.visual.palette,
				nsfwAllowed: payload.visual.nsfwAllowed,
			},
			audio: {
				voice: payload.audio.voice,
				tempo: payload.audio.tempo,
				musicMood: payload.audio.musicMood,
			},
		};
		
		await graphqlClient.request(mutations.saveStyles, {
			projectId: PROJECT_ID,
			input,
		});
		
		return { ok: true, faults: [] };
	} catch (error) {
		return { ok: false, faults: [{ message: (error as Error).message }] };
	}
}

export async function loadStyles(): Promise<Styles | null> {
	try {
		const data = await graphqlClient.request(queries.styles, {
			projectId: PROJECT_ID,
		});
		
		if (!data.styles) return null;
		
		return {
			visual: data.styles.visual,
			audio: data.styles.audio,
		};
	} catch (error) {
		console.error('Failed to load styles', error);
		return null;
	}
}
