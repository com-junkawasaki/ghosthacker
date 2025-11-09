import { promises as fs } from "fs";
import * as path from "path";

export type PartMapping = {
  episode: number;
  part: number;
  wattpadPartId: string;
};

export type PartIdsData = {
  "@context": {
    "@vocab": "https://schema.org/";
    wattpad: "https://www.wattpad.com/";
  };
  "@type": "WattpadPartMappings";
  parts: PartMapping[];
};

const PART_IDS_PATH = path.resolve(process.cwd(), "251022/wattpad/part-ids.jsonld");

/**
 * Load existing part ID mappings from JSON-LD file
 */
export async function loadPartIds(): Promise<PartMapping[]> {
  try {
    const content = await fs.readFile(PART_IDS_PATH, "utf8");
    const data: PartIdsData = JSON.parse(content);
    return data.parts || [];
  } catch (err) {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

/**
 * Save part ID mappings to JSON-LD file
 */
export async function savePartIds(mappings: PartMapping[]): Promise<void> {
  const data: PartIdsData = {
    "@context": {
      "@vocab": "https://schema.org/",
      wattpad: "https://www.wattpad.com/",
    },
    "@type": "WattpadPartMappings",
    parts: mappings,
  };

  const dir = path.dirname(PART_IDS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(PART_IDS_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/**
 * Add or update a part mapping
 */
export async function upsertPartMapping(episode: number, part: number, wattpadPartId: string): Promise<void> {
  const mappings = await loadPartIds();
  const index = mappings.findIndex((m) => m.episode === episode && m.part === part);
  
  if (index >= 0) {
    mappings[index].wattpadPartId = wattpadPartId;
  } else {
    mappings.push({ episode, part, wattpadPartId });
  }
  
  // Sort by episode then part
  mappings.sort((a, b) => {
    if (a.episode !== b.episode) return a.episode - b.episode;
    return a.part - b.part;
  });
  
  await savePartIds(mappings);
}

/**
 * Find part mapping by episode and part number
 */
export async function findPartMapping(episode: number, part: number): Promise<PartMapping | null> {
  const mappings = await loadPartIds();
  return mappings.find((m) => m.episode === episode && m.part === part) || null;
}

