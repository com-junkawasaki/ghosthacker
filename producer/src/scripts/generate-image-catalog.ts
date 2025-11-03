/*
  JSON-LD image catalog generator
  - Scans character Gen4 pngs and generates portrait webp derivatives
  - Creates episode/part placeholder images
  - Emits images.jsonld with OWL terms defined in 250806/image-owl.jsonld
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

type ImageEntry = {
  "@id": string;
  "@type": string | string[];
  "gh:filePath": string;
  "gh:format": string;
  "gh:checksumSha256": string;
  "exif:width": number;
  "exif:height": number;
  "gh:styleTag"?: string;
  "gh:colorTheme"?: string;
  "gh:derivedFrom"?: { "@id": string };
  "gh:forCharacter"?: { "@id": string };
  "gh:forEpisode"?: { "@id": string };
  "gh:forPart"?: { "@id": string };
};

const repoRoot = path.resolve(__dirname, "../../..");
const charactersDir = path.join(repoRoot, "250806/character");
const episodesDir = path.join(repoRoot, "251022/wattpad/episodes");
const outRoot = path.join(repoRoot, "251022/assets");
const catalogPath = path.join(outRoot, "images.jsonld");

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function sha256(file: string): string {
  const buf = fs.readFileSync(file);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function idToColor(id: string): string {
  // deterministic soft color from id
  const h = parseInt(crypto.createHash("md5").update(id).digest("hex").slice(0, 6), 16) % 360;
  const s = 60; // moderate saturation
  const l = 55; // mid lightness
  // hsl to hex (approx)
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

async function createSolidImage(fp: string, width: number, height: number, color: string) {
  const { r, g, b } = hexToRgb(color);
  ensureDir(path.dirname(fp));
  await sharp({ create: { width, height, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer()
    .then((buf) => sharp(buf).webp({ quality: 95 }).toFile(fp));
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const r = parseInt(m![1], 16);
  const g = parseInt(m![2], 16);
  const b = parseInt(m![3], 16);
  return { r, g, b };
}

async function convertPortrait(srcPng: string, outWebp: string, width = 1024, height = 1280) {
  ensureDir(path.dirname(outWebp));
  await sharp(srcPng)
    .resize(width, height, { fit: "cover", position: "centre" })
    .webp({ quality: 90 })
    .toFile(outWebp);
}

async function main() {
  ensureDir(outRoot);
  const entries: ImageEntry[] = [];

  // 1) Character portraits from Gen4 pngs
  if (fs.existsSync(charactersDir)) {
    for (const id of fs.readdirSync(charactersDir)) {
      const cDir = path.join(charactersDir, id);
      if (!fs.statSync(cDir).isDirectory()) continue;
      const files = fs.readdirSync(cDir).filter((f) => f.toLowerCase().includes("gen4") && f.toLowerCase().endsWith(".png"));
      if (files.length === 0) continue;
      const src = path.join(cDir, files[0]);
      const out = path.join(outRoot, "characters", id, "portrait_gen4.webp");
      await convertPortrait(src, out);
      const meta = await sharp(out).metadata();
      entries.push({
        "@id": `gh:Image/Character/${id}/portrait_gen4`,
        "@type": ["gh:ImageAsset", "gh:CharacterPortrait"],
        "gh:filePath": path.relative(repoRoot, out).replace(/\\/g, "/"),
        "gh:format": "image/webp",
        "gh:checksumSha256": sha256(out),
        "exif:width": meta.width || 0,
        "exif:height": meta.height || 0,
        "gh:styleTag": "Gen4,Tokyo-healing,ghost-hacking",
        "gh:colorTheme": idToColor(id),
        "gh:derivedFrom": { "@id": path.relative(repoRoot, src).replace(/\\/g, "/") },
        "gh:forCharacter": { "@id": `character:${id}` }
      });
    }
  }

  // 2) Episode & part placeholders (solid color) 16:9
  if (fs.existsSync(episodesDir)) {
    for (const ep of fs.readdirSync(episodesDir)) {
      const epDir = path.join(episodesDir, ep);
      if (!fs.statSync(epDir).isDirectory()) continue;
      const epId = toEpisodeId(ep); // ep03 -> gh:Episode/EP03 etc. We'll fall back to folder name.
      const color = idToColor(ep);
      const heroOut = path.join(outRoot, "episodes", ep, "hero.webp");
      await createSolidImage(heroOut, 1920, 1080, color);
      const heroMeta = await sharp(heroOut).metadata();
      entries.push({
        "@id": `gh:Image/Episode/${ep}/hero`,
        "@type": ["gh:ImageAsset", "gh:EpisodeIllustration"],
        "gh:filePath": path.relative(repoRoot, heroOut).replace(/\\/g, "/"),
        "gh:format": "image/webp",
        "gh:checksumSha256": sha256(heroOut),
        "exif:width": heroMeta.width || 0,
        "exif:height": heroMeta.height || 0,
        "gh:colorTheme": color,
        "gh:styleTag": "placeholder,solid-color",
        "gh:forEpisode": { "@id": epId }
      });

      const parts = fs.readdirSync(epDir).filter((f) => /^part\d+\.md$/i.test(f));
      for (const p of parts) {
        const n = p.match(/part(\d+)/i)?.[1] ?? "1";
        const partOut = path.join(outRoot, "episodes", ep, `part${n}.webp`);
        await createSolidImage(partOut, 1600, 900, color);
        const m = await sharp(partOut).metadata();
        entries.push({
          "@id": `gh:Image/Episode/${ep}/part${n}`,
          "@type": ["gh:ImageAsset", "gh:PartIllustration"],
          "gh:filePath": path.relative(repoRoot, partOut).replace(/\\/g, "/"),
          "gh:format": "image/webp",
          "gh:checksumSha256": sha256(partOut),
          "exif:width": m.width || 0,
          "exif:height": m.height || 0,
          "gh:colorTheme": color,
          "gh:styleTag": "placeholder,solid-color",
          "gh:forPart": { "@id": `${epId}:Part:${n}` }
        });
      }
    }
  }

  // 3) Write JSON-LD catalog
  const catalog = {
    "@context": {
      "@base": "https://ghosthacker.example.com/",
      "@vocab": "https://schema.org/",
      "gh": "https://ghosthacker.example.com/vocab#",
      "exif": "http://www.w3.org/2003/12/exif/ns#"
    },
    "@id": "gh:ImageCatalog",
    "@type": "gh:Catalog",
    "@graph": entries
  } as const;

  ensureDir(path.dirname(catalogPath));
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log("Image catalog written:", catalogPath);
}

function toEpisodeId(dir: string): string {
  // ep03 -> gh:Episode/EP03, ep12 -> gh:Episode/EP12, ep_new_dualist -> gh:Episode/S2E1 or leave folder name
  const m = dir.match(/^ep(\d{2})$/i);
  if (m) return `gh:Episode/EP${m[1]}`;
  return `gh:Episode/${dir}`; // best-effort
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


