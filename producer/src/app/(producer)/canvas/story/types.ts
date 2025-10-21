export type Backstory = {
	origin: string;
	motivation?: string;
	conflict?: string;
	characterName?: string;
};
export type Character = {
	name: string;
	role: "protagonist" | "antagonist" | "support";
	motivation?: string;
	conflict?: string;
	voice?: string;
};
export type MediaObject = {
  "@type": | "schema:TextDigitalDocument" | "schema:ImageObject" | "schema:VideoObject" | "schema:AudioObject";
  "schema:contentUrl": string;
  "schema:name"?: string;
  "schema:description"?: string;
};

export type Episode = {
  "@id": string;
  "schema:name": string;
  "schema:episodeNumber": string;
  "gh:hasPart"?: MediaObject[];
};

export const STRUCTURES = [
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

export type Beat = {
	id: string;
	label: string;
	purpose: "setup" | "conflict" | "climax";
	targetLength: number;
};

export type Narrative = {
	synopsis: string;
	structure: (typeof STRUCTURES)[number];
	beats: Beat[];
};

export type Platforms = {
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

export const GENRES = [
	"horror",
	"mystery",
	"thriller",
	"romance",
	"sci-fi",
	"fantasy",
] as const;
export const TONES = ["atmospheric", "comedic", "dark", "hopeful"] as const;

export type Project = {
	title: string;
	logline: string;
	genres: string[];
	tone: (typeof TONES)[number];
	keywords: string[];
};

export type Overview = {
	title: string;
	logline: string;
	genres: Readonly<(typeof GENRES)[number]>[] | string[];
	tone: (typeof TONES)[number];
	audienceRating: "PG-13";
	language: "en";
	keywords: string[];
};

export const ART_STYLES = [
	"anime",
	"semi-realistic",
	"painterly",
	"minimal",
] as const;
export const PALETTES = ["cool", "warm", "monochrome", "high-contrast"] as const;
export const VOICES = ["alloy", "verse", "aria"] as const;
export const TEMPOS = ["calm", "neutral", "fast"] as const;
export const MUSIC = ["eerie", "tense", "melancholic", "uplifting"] as const;

export type Styles = {
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
