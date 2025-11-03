import { promises as fs } from "fs";
import * as path from "path";

export type EpisodePart = {
  episode: number;
  part: number;
  index: number; // 0-based global ordering
  filePath: string;
};

export type ParsedContent = {
  title: string;
  body: string;
};

/**
 * Discover English parts in 251022/wattpad/episodes/epXX/partY.en.md
 * Ordered by episode then part ascending. Returns a flattened list with global indices.
 */
export async function findEpisodeParts(rootDir: string): Promise<EpisodePart[]> {
  const episodesDir = path.resolve(rootDir, "251022/wattpad/episodes");
  const epEntries = await fs.readdir(episodesDir, { withFileTypes: true });
  const eps = epEntries
    .filter((e) => e.isDirectory() && /^ep\d+$/i.test(e.name))
    .map((e) => ({ name: e.name, num: Number(e.name.replace(/\D/g, "")) }))
    .sort((a, b) => a.num - b.num);

  const results: EpisodePart[] = [];
  for (const ep of eps) {
    const epPath = path.join(episodesDir, ep.name);
    const partEntries = await fs.readdir(epPath, { withFileTypes: true });
    const parts = partEntries
      .filter((f) => f.isFile() && /^part\d+\.en\.md$/i.test(f.name))
      .map((f) => ({ name: f.name, num: Number(f.name.replace(/\D/g, "")) }))
      .sort((a, b) => a.num - b.num);
    for (const p of parts) {
      results.push({
        episode: ep.num,
        part: p.num,
        index: results.length,
        filePath: path.join(epPath, p.name),
      });
    }
  }
  return results;
}

/**
 * Parse markdown content: strip leading fenced JSON/JSON-LD block if present, extract H1 as title and the remainder as body.
 * JSON-LD blocks can appear before or after the H1 title.
 */
export function parseMarkdown(md: string): ParsedContent {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);
  let i = 0;
  // Skip initial blank lines
  while (i < lines.length && lines[i].trim() === "") i++;

  // Optional leading fenced JSON block (before H1)
  if (i < lines.length && /^```json/i.test(lines[i]?.trim())) {
    i++; // move past opening fence
    while (i < lines.length && !/^```\s*$/.test(lines[i])) i++;
    if (i < lines.length && /^```\s*$/.test(lines[i])) i++;
    // Skip blank line after code fence if any
    while (i < lines.length && lines[i].trim() === "") i++;
  }

  // Title: first H1
  let title = "";
  let bodyStart = i;
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    title = lines[i].replace(/^#\s+/, "").trim();
    bodyStart = i + 1;
    
    // Skip metadata lines (lines starting with "-" or other metadata patterns)
    while (bodyStart < lines.length && (
      lines[bodyStart].trim().startsWith("-") ||
      lines[bodyStart].trim() === "" ||
      /^[-*]\s/.test(lines[bodyStart].trim())
    )) {
      bodyStart++;
    }
    
    // Check for JSON-LD block after H1 and metadata
    if (bodyStart < lines.length && /^```json/i.test(lines[bodyStart]?.trim())) {
      const jsonStart = bodyStart;
      bodyStart++; // move past opening fence
      while (bodyStart < lines.length && !/^```\s*$/.test(lines[bodyStart])) bodyStart++;
      if (bodyStart < lines.length && /^```\s*$/.test(lines[bodyStart])) bodyStart++;
      // Skip blank line after code fence if any
      while (bodyStart < lines.length && lines[bodyStart].trim() === "") bodyStart++;
    }
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  if (!title) {
    // Fallback to first non-empty line or a default
    const firstNonEmpty = lines.slice(i).find((l) => l.trim().length > 0) ?? "";
    title = firstNonEmpty.replace(/^#\s+/, "").trim() || "Untitled";
  }
  return { title, body };
}

/**
 * Compute SHA-256 using Web Crypto (avoids node:crypto for shared code policies).
 */
export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  // @ts-expect-error Node 18+/22+ has globalThis.crypto.subtle
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loadPart(filePath: string): Promise<ParsedContent> {
  const src = await fs.readFile(filePath, "utf8");
  return parseMarkdown(src);
}

/**
 * Episode name mapping: EP number (1-12) -> Episode title
 */
export type EpisodeNameMap = Map<number, string>;

/**
 * Load episode names from manifest.json and story_owl.jsonld
 * Returns a map of episode number (1-12) to episode title
 */
export async function loadEpisodeNames(rootDir: string): Promise<EpisodeNameMap> {
  const map = new Map<number, string>();
  
  // Try to load from manifest.json first (has EP01-EP08)
  const manifestPath = path.resolve(rootDir, "251022/wattpad/manifest.json");
  try {
    const manifestContent = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent) as {
      episodes?: Array<{ id: string; title: string; files?: string[] }>;
    };
    
    if (manifest.episodes) {
      for (const ep of manifest.episodes) {
        // Extract EP number from files path (e.g., "episodes/ep01/part1.md" -> 1)
        const epMatch = ep.files?.[0]?.match(/ep(\d+)/i);
        if (epMatch) {
          const epNum = Number(epMatch[1]);
          map.set(epNum, ep.title);
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to load manifest.json: ${err}`);
  }
  
  // Fallback to story_owl.jsonld for any missing episodes
  const storyOwlPath = path.resolve(rootDir, "251022/story_owl.jsonld");
  try {
    const storyOwlContent = await fs.readFile(storyOwlPath, "utf8");
    const storyOwl = JSON.parse(storyOwlContent) as {
      "@graph"?: Array<{ "@id"?: string; "@type"?: string; name?: string }>;
    };
    
    if (storyOwl["@graph"]) {
      // Mapping from episode ID to EP number based on manifest.json patterns
      // S1E1 -> EP01, S2E1 -> EP02, S3E1 -> EP03, S3E2 -> EP04, etc.
      const episodeIdToEpNum: Record<string, number> = {
        "gh:Episode/S1E1": 1,
        "gh:Episode/S2E1": 2,
        "gh:Episode/S3E1": 3,
        "gh:Episode/S3E2": 4,
        "gh:Episode/S4E1": 5,
        "gh:Episode/S4E2": 6,
        "gh:Episode/S5E1": 7,
        "gh:Episode/S6E1": 8,
      };
      
      for (const item of storyOwl["@graph"]) {
        if (item["@type"] === "Episode" && item["@id"] && item.name) {
          const epNum = episodeIdToEpNum[item["@id"]];
          if (epNum && !map.has(epNum)) {
            map.set(epNum, item.name);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to load story_owl.jsonld: ${err}`);
  }
  
  return map;
}

/**
 * Get episode title for a given episode number
 */
export async function getEpisodeTitle(rootDir: string, episode: number): Promise<string | null> {
  const episodeNames = await loadEpisodeNames(rootDir);
  return episodeNames.get(episode) || null;
}

