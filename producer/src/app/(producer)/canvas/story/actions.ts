"use server";

type Backstory = {
	origin: string;
	motivation?: string;
	conflict?: string;
	characterName?: string;
};
type Character = {
	name: string;
	role: "protagonist" | "antagonist" | "support";
	motivation?: string;
	conflict?: string;
	voice?: string;
};
type Episode = { episodeId: string; sourcePath: string };

const STRUCTURES = [
	"3-act",
	"4-act",
	"8-sequence",
	"webtoon-episodic",
	"Episodic Arc Structure",
	"Linear Static Episodic",
	"Complete Episodic Independence",
	"Hybrid Gag/Serious",
	"Growth Arc Chain",
	"Archipelago Arc Chain + Meta-Mystery",
	"Hybrid: Linear Episodic + Archipelago Arc",
] as const;

type Beat = {
	id: string;
	label: string;
	purpose: "setup" | "conflict" | "climax";
	targetLength: number;
};

type Narrative = {
	synopsis: string;
	structure: (typeof STRUCTURES)[number];
	beats: Beat[];
};

type Platforms = {
	wattpad: {
		chapterCount: number;
		includeImages: boolean;
		chapterLengthWords: [number, number];
		imageFrequency: "none" | "cover" | "inline-1" | "inline-3";
	};
	webtoon: {
		episodePanels: number;
		bubbleDensity: "low" | "medium" | "high";
		readingPace: "slow" | "standard" | "fast";
		soundEffects: boolean;
	};
	youtube: {
		targetDurationSec: number;
		aspectRatio: "9:16" | "16:9";
		captions: boolean;
		brollRatio: number;
	};
};

const GENRES = [
	"horror",
	"mystery",
	"thriller",
	"romance",
	"sci-fi",
	"fantasy",
] as const;
const TONES = ["atmospheric", "comedic", "dark", "hopeful"] as const;

type Project = {
	title: string;
	logline: string;
	genres: string[];
	tone: (typeof TONES)[number];
	keywords: string[];
};

type Overview = {
	title: string;
	logline: string;
	genres: Readonly<(typeof GENRES)[number]>[] | string[];
	tone: (typeof TONES)[number];
	audienceRating: "PG-13";
	language: "en";
	keywords: string[];
};

const ART_STYLES = [
	"anime",
	"semi-realistic",
	"painterly",
	"minimal",
] as const;
const PALETTES = ["cool", "warm", "monochrome", "high-contrast"] as const;
const VOICES = ["alloy", "verse", "aria"] as const;
const TEMPOS = ["calm", "neutral", "fast"] as const;
const MUSIC = ["eerie", "tense", "melancholic", "uplifting"] as const;

type Styles = {
	visual: {
		artStyle: (typeof ART_STYLES)[number];
		palette: (typeof PALETTES)[number];
		nsfwAllowed: boolean;
	};
	audio: {
		voice: (typeof VOICES)[number];
		tempo: (typeof TEMPOS)[number];
		musicMood: (typeof MUSIC)[number];
	};
};

type Fault = {
    path?: (string | number)[];
    message: string;
}

export async function submitBackstories(
	payload: Backstory[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	console.log("Submitting backstories:", payload);
	// Dummy implementation
	if (payload.length === 0) {
		return { ok: false, faults: [{ message: "No backstories provided" }] };
	}
	return { ok: true, faults: [] };
}

export async function loadBackstories(): Promise<Backstory[]> {
	console.log("Loading backstories");
	// Dummy implementation
	return Promise.resolve([]);
}

export async function submitCharacters(
	payload: Character[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	console.log("Submitting characters:", payload);
	return { ok: true, faults: [] };
}

export async function loadCharacters(): Promise<Character[]> {
	console.log("Loading characters");
	return Promise.resolve([]);
}

export async function submitEpisodes(
	payload: Episode[],
): Promise<{ ok: boolean; faults: Fault[] }> {
	console.log("Submitting episodes:", payload);
	return { ok: true, faults: [] };
}

export async function loadEpisodes(): Promise<Episode[]> {
	console.log("Loading episodes");
	return Promise.resolve([]);
}

export async function submitNarrative(
	payload: Narrative,
): Promise<{ ok: boolean; faults: Fault[] }> {
	console.log("Submitting narrative:", payload);
	return { ok: true, faults: [] };
}

export async function loadNarrative(): Promise<Narrative | null> {
	console.log("Loading narrative");
	return Promise.resolve(null);
}

export async function submitPlatforms(
	payload: Platforms,
): Promise<{ ok: boolean; faults: Fault[] }> {
	console.log("Submitting platforms:", payload);
	return { ok: true, faults: [] };
}

export async function loadProject(): Promise<Project | null> {
	console.log("Loading project");
	return Promise.resolve(null);
}

export async function loadStyles(): Promise<Styles | null> {
	console.log("Loading styles");
	return Promise.resolve(null);
}

export async function loadPlatforms(): Promise<Platforms | null> {
	console.log("Loading platforms");
	return Promise.resolve(null);
}

export async function submitOverview(
	payload: Overview,
): Promise<{ ok: boolean; faults: Fault[] }> {
	console.log("Submitting overview:", payload);
	return { ok: true, faults: [] };
}

export async function submitStyles(
	payload: Styles,
): Promise<{ ok: boolean; faults: Fault[] }> {
	console.log("Submitting styles:", payload);
	return { ok: true, faults: [] };
}
