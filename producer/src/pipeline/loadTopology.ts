import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import type { StoryTopology } from "./types";

export function loadTopology(): StoryTopology {
  const p = path.join(process.cwd(), "story.jsonnet");
  const text = fs.readFileSync(p, "utf8");
  // story.jsonnet は実質JSON方言前提のため JSON5 として解釈
  const obj = JSON5.parse(text);
  return obj as StoryTopology;
}


