import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const repoRoot = path.resolve(__dirname, "../../..");
const catalogPath = path.join(repoRoot, "251022/assets/images.jsonld");

type Catalog = { "@graph": any[] };

function fail(msg: string) {
  console.error("[INVALID]", msg);
}

async function validate() {
  if (!fs.existsSync(catalogPath)) throw new Error("images.jsonld not found");
  const json = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as Catalog;
  let ok = true;
  for (const e of json["@graph"]) {
    const p = path.join(repoRoot, e["gh:filePath"]);
    if (!fs.existsSync(p)) {
      ok = false; fail(`${e["@id"]}: file missing ${p}`); continue;
    }
    if (e["gh:format"] !== "image/webp" || !e["gh:filePath"].endsWith(".webp")) {
      ok = false; fail(`${e["@id"]}: format/path must be image/webp/.webp`);
    }
    const meta = await sharp(p).metadata();
    if (!meta.width || !meta.height) {
      ok = false; fail(`${e["@id"]}: width/height unreadable`);
    }
    if (!(e["exif:width"] > 0 && e["exif:height"] > 0)) {
      ok = false; fail(`${e["@id"]}: exif:width/height missing`);
    }
    if (!e["gh:checksumSha256"] || typeof e["gh:checksumSha256"] !== "string") {
      ok = false; fail(`${e["@id"]}: checksum missing`);
    }
    if (!e["gh:forCharacter"] && !e["gh:forEpisode"] && !e["gh:forPart"]) {
      ok = false; fail(`${e["@id"]}: must link to forCharacter or forEpisode or forPart`);
    }
  }
  if (!ok) {
    process.exitCode = 1;
    console.error("Validation failed");
  } else {
    console.log("Validation OK (ruleset equivalent to SHACL)");
  }
}

validate().catch((e) => { console.error(e); process.exit(1); });


