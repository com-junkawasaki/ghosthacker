import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");
const catalogPath = path.join(repoRoot, "251022/assets/images.jsonld");
const charactersDir = path.join(repoRoot, "250806/character");

type Catalog = { "@graph": any[] };

function findCharacterJsonld(dir: string): string | undefined {
  if (!fs.existsSync(dir)) return undefined;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonld"));
  if (files.length === 0) return undefined;
  // prefer file named same as directory
  const base = path.basename(dir);
  const exact = files.find((f) => f.startsWith(base));
  return path.join(dir, exact ?? files[0]);
}

function link() {
  const cat = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as Catalog;
  const entries = cat["@graph"].filter((e) => e["@type"].includes("gh:CharacterPortrait"));
  let updated = 0;
  for (const e of entries) {
    const charId = e["gh:forCharacter"]?.["@id"] as string | undefined; // e.g., character:hibiki
    if (!charId) continue;
    const name = charId.split(":")[1];
    const dir = path.join(charactersDir, name);
    const jsonldPath = findCharacterJsonld(dir);
    if (!jsonldPath) continue;
    const data = JSON.parse(fs.readFileSync(jsonldPath, "utf8"));
    const imageId = e["@id"] as string;
    // attach gh:image as @id to the catalog image node
    if (!data["gh:image"]) data["gh:image"] = [];
    const arr = Array.isArray(data["gh:image"]) ? data["gh:image"] : [data["gh:image"]];
    const already = arr.some((x: any) => (typeof x === "string" ? x : x?.["@id"]) === imageId);
    if (!already) {
      arr.push({ "@id": imageId });
      data["gh:image"] = arr;
      fs.writeFileSync(jsonldPath, JSON.stringify(data, null, 2));
      updated++;
      console.log("Linked image to", jsonldPath);
    }
  }
  console.log(`Updated ${updated} character files.`);
}

link();


