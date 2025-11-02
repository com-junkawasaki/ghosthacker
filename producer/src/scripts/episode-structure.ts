/*
  JSON-LD generator for episode structure metrics.
  - Per episode part: wordCount, beatsCount, antagonistBlock, position
  - Outputs: 251022/wattpad/episode-structure.jsonld
*/
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../../");
const episodesDir = path.join(root, "251022/wattpad/episodes");
const outPath = path.join(root, "251022/wattpad/episode-structure.jsonld");

type PartInfo = {
  episodeId: string;
  partPath: string;
  position: number;
  wordCount: number;
  beatsCount: number;
  antagonistBlock: boolean;
};

function listEpisodeParts(): Array<{ episodeId: string; parts: string[] }> {
  const entries = fs.readdirSync(episodesDir, { withFileTypes: true });
  const eps: Array<{ episodeId: string; parts: string[] }> = [];
  for (const dir of entries) {
    if (!dir.isDirectory()) continue;
    if (!/^ep\d{2}$/.test(dir.name)) continue;
    const partsDir = path.join(episodesDir, dir.name);
    const parts = fs
      .readdirSync(partsDir, { withFileTypes: true })
      .filter((f) => f.isFile() && /^part\d+\.md$/.test(f.name))
      .map((f) => path.join(partsDir, f.name))
      .sort((a, b) => a.localeCompare(b));
    eps.push({ episodeId: dir.name.toUpperCase(), parts });
  }
  return eps;
}

function countWords(text: string): number {
  const body = text
    .replace(/```[\s\S]*?```/g, " ") // remove code fences
    .replace(/^#.*$/gm, " ") // remove headings
    .replace(/^-.+$/gm, " ") // remove meta lines
    .replace(/[\t\r\n]/g, " ")
    .trim();
  if (!body) return 0;
  // If contains CJK, approximate "words" via visible CJK characters / 2
  const cjk = body.match(/[\u3040-\u30ff\u4e00-\u9faf\u3400-\u4dbf\uff00-\uffef]/g);
  if (cjk && cjk.length > 0) {
    const approx = Math.floor(cjk.length / 2); // rough reading chunk ~2 chars per word-equivalent
    return approx;
  }
  // Otherwise, whitespace tokenization
  return body.split(/\s+/).filter(Boolean).length;
}

function countBeats(text: string): number {
  const m = text.match(/^\-\s*Beat\s*:/gim);
  return m ? m.length : 0;
}

function hasAntagonistBlock(text: string): boolean {
  // naive detection: fenced json block containing "antagonist": [ ... ]
  return /```json[\s\S]*?"antagonist"\s*:\s*\[/i.test(text);
}

function analyze(): PartInfo[] {
  const results: PartInfo[] = [];
  for (const ep of listEpisodeParts()) {
    let pos = 0;
    for (const p of ep.parts) {
      pos += 1;
      const txt = fs.readFileSync(p, "utf8");
      results.push({
        episodeId: ep.episodeId,
        partPath: path.relative(root, p),
        position: pos,
        wordCount: countWords(txt),
        beatsCount: countBeats(txt),
        antagonistBlock: hasAntagonistBlock(txt),
      });
    }
  }
  return results;
}

function toJsonLd(parts: PartInfo[]) {
  const ctx = {
    "@base": "https://ghosthacker.example.com/",
    gh: "https://ghosthacker.junkawasaki.com/gh#",
    schema: "http://schema.org/",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    EpisodeStructure: "gh:EpisodeStructure",
    EpisodePart: "gh:EpisodePart",
    episode: { "@id": "gh:episode", "@type": "@id" },
    part: { "@id": "gh:part", "@type": "@id" },
    position: { "@id": "gh:position", "@type": "xsd:integer" },
    wordCount: { "@id": "gh:wordCount", "@type": "xsd:integer" },
    beatsCount: { "@id": "gh:beatsCount", "@type": "xsd:integer" },
    antagonistBlock: { "@id": "gh:antagonistBlock", "@type": "xsd:boolean" },
    sourcePath: { "@id": "gh:sourcePath", "@type": "xsd:string" },
  } as const;

  const graph: any[] = [];
  for (const p of parts) {
    graph.push({
      "@type": "EpisodePart",
      episode: { "@id": `gh:Episode/${p.episodeId}` },
      part: { "@id": `gh:Episode/${p.episodeId}/part${p.position}` },
      position: p.position,
      wordCount: p.wordCount,
      beatsCount: p.beatsCount,
      antagonistBlock: p.antagonistBlock,
      sourcePath: p.partPath,
    });
  }
  return { "@context": ctx, "@graph": graph };
}

function main() {
  const parts = analyze();
  const doc = toJsonLd(parts);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  console.log("Episode structure written:", outPath);
}

main();


