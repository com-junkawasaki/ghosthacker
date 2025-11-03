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
 */
export function parseMarkdown(md: string): ParsedContent {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);
  let i = 0;
  // Skip initial blank lines
  while (i < lines.length && lines[i].trim() === "") i++;

  // Optional leading fenced JSON block
  if (i < lines.length && /^```json/i.test(lines[i]?.trim())) {
    i++; // move past opening fence
    while (i < lines.length && !/^```\s*$/.test(lines[i])) i++;
    if (i < lines.length && /^```\s*$/.test(lines[i])) i++;
    // Skip blank line after code fence if any
    while (i < lines.length && lines[i].trim() === "") i++;
  }

  // Title: first H1 after the optional JSON-LD block
  let title = "";
  let bodyStart = i;
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    title = lines[i].replace(/^#\s+/, "").trim();
    bodyStart = i + 1;
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

