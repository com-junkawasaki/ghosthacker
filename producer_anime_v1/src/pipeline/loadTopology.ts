import fs from "node:fs";
import path from "node:path";
import type { StoryTopology } from "./types";

export function loadTopology(): StoryTopology {
  const p = path.join(process.cwd(), "src", "ontology", "pipeline.jsonld");
  const text = fs.readFileSync(p, "utf8");
  // JSON-LD は標準JSONとして解釈
  const obj = JSON.parse(text);
  return obj as StoryTopology;
}


