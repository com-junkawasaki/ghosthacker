/**
 * Phase 3.4 — Semantic panel decomposition via LLM.
 *
 * Problem: panels were grouped by speaker switches (Phase 3.2), losing scene context.
 * E.g., p1n7 contains only Mei+Saki dialogues but their reactions are TO Akira's sneakers
 * which is in adjacent panels — the panel jsonld doesn't carry that context, so the
 * image gen prompt doesn't know about sneakers.
 *
 * This script uses gpt-4o (or gpt-4o-mini) to re-decompose each page's v2 outline
 * gh:script entries into semantically coherent panels with rich schema:
 *   - gh:sceneSubject       — one-line topic of the panel
 *   - gh:focusCharacter     — who's the visual subject
 *   - gh:allCharacters      — everyone in frame (silent included)
 *   - gh:props              — key objects in scene
 *   - gh:visualDescription  — detailed description of the moment
 *   - gh:dialogues          — speech beats
 *   - gh:precedingBeat      — what just happened (context)
 *   - gh:followingBeat      — what's next (continuity)
 *   - gh:shot               — camera framing recommendation
 *   - gh:scriptEntryIndices — which v2 outline entries this panel covers
 *
 * After regeneration:
 *   - episode.jsonld panels are replaced with rich versions
 *   - existing gh:generatedImages entries are migrated where script-entry overlap is high
 *   - manifest is regenerated to reflect new panel structure
 *
 * Usage:
 *   OPENAI_API_KEY=... npx tsx src/phase3-4-semantic-panels.ts --page 1
 *   OPENAI_API_KEY=... npx tsx src/phase3-4-semantic-panels.ts --all
 */
import * as fs from "node:fs";

const REPO = "/Users/junkawasaki/github/ghosthacker/260123-jump";
const EPISODE_PATH = `${REPO}/resources/episodes/arc0-1-origin/episode.jsonld`;
const OUTLINE_PATH = `${REPO}/resources/episodes/arc0-1-origin/story-outline.jsonld`;
const MANIFEST_PATH = `${REPO}/resources/episodes/arc0-1-origin/image-gen-manifest.json`;

const LLM_MODEL = process.env.LG_DECOMPOSE_MODEL ?? "gpt-4o";

interface CliArgs { pages: number[]; all: boolean }
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const out: CliArgs = { pages: [], all: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--all") out.all = true;
    else if (args[i] === "--page" && args[i + 1]) out.pages.push(Number(args[++i]));
  }
  return out;
}

interface RichPanel {
  panelIndex: number;
  sceneSubject: string;
  focusCharacter: string;
  allCharacters: string[];
  props: string[];
  visualDescription: string;
  dialogues: { speaker: string; text: string; emotion?: string }[];
  precedingBeat: string;
  followingBeat: string;
  shot: string;
  scriptEntryIndices: number[];
}

async function decomposePage(pageNum: number, pageData: any): Promise<RichPanel[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const script = pageData["gh:script"] ?? [];
  const setting = pageData["gh:setting"] ?? "";
  const visualNote = pageData["gh:visualNote"] ?? "";
  const pov = pageData["gh:pov"] ?? "";
  const title = pageData["gh:pageTitle"] ?? "";

  const sys = `You are a professional manga storyboarder. Decompose a manga page's full script into a SUFFICIENT number of panels (typically 6-10 for a dense page) following manga storyboarding conventions.

CRITICAL: cover ALL script entries. Every entry index must appear in some panel's scriptEntryIndices. Do not truncate.

Rules:
- Group consecutive script entries by SCENE UNIT (same focus, same action), not by speaker change
- Each panel has ONE focus character (or "shared" for ensemble shots) but lists ALL characters in frame (even silent observers)
- Capture key PROPS (objects that drive the scene, e.g., shoes, donut, shoe box, smartphone)
- Compose a vivid visualDescription (2-3 sentences) that includes: focus character's pose/expression, key objects, atmosphere, OTHER characters' positions if multiple — what the artist would actually draw
- Identify precedingBeat (1 sentence: what just happened before this panel) and followingBeat (1 sentence: what comes next)
- Choose a shot framing: "Wide Shot", "Medium Shot", "Close Up", "Extreme Close Up", "Insert", "Over the Shoulder", "POV"
- Reference script entries by their numeric index in the input
- Telop (キャラクター紹介テロップ) entries can be merged with the introduction panel they apply to

Respond with VALID JSON: { "panels": [<panel objects>] }`;

  const user = `Page ${pageNum} — "${title}"
Setting: ${setting}
Visual note: ${visualNote}
POV: ${pov}

Script entries:
${script.map((e: any, i: number) => `[${i}] ${e["gh:type"]}${e["gh:speaker"] ? ` (${e["gh:speaker"]})` : ""}: ${(e["gh:text"] ?? e["gh:items"]?.join("; ") ?? "").slice(0, 200)}`).join("\n")}

Decompose into a JSON array of panels. Schema per panel:
{
  "panelIndex": <1-based int>,
  "sceneSubject": "<one-line topic>",
  "focusCharacter": "<character name or 'shared'>",
  "allCharacters": ["<names>"],
  "props": ["<objects>"],
  "visualDescription": "<vivid 1-2 sentence description of what to draw>",
  "dialogues": [{"speaker": "<name>", "text": "<jp text>", "emotion": "<optional>"}],
  "precedingBeat": "<1 sentence>",
  "followingBeat": "<1 sentence>",
  "shot": "<framing>",
  "scriptEntryIndices": [<int>, ...]
}

Return ONLY the JSON array, no prose.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 16000,
    }),
  });
  if (!r.ok) throw new Error(`decompose HTTP ${r.status}: ${(await r.text()).slice(0, 400)}`);
  const j: any = await r.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  // The model returns either {panels:[...]} or [...] depending on format quirks
  let parsed: any;
  try { parsed = JSON.parse(txt); }
  catch { throw new Error(`decompose parse fail: ${txt.slice(0, 200)}`); }
  const arr = Array.isArray(parsed) ? parsed : (parsed.panels ?? parsed.result ?? Object.values(parsed)[0]);
  if (!Array.isArray(arr)) throw new Error(`decompose did not return an array: ${JSON.stringify(parsed).slice(0, 200)}`);
  return arr as RichPanel[];
}

function buildPanelJsonld(rich: RichPanel, pageNum: number): any {
  const cleanChar = (c: string) => c.startsWith("character:") ? c : `character:${c}`;
  return {
    "@id": `panel:p${pageNum}n${rich.panelIndex}-v3`,
    "characters": rich.allCharacters.map(cleanChar),
    "dialogue": rich.dialogues,
    "panel": rich.panelIndex,
    "shot": rich.shot,
    "visual": rich.visualDescription,
    "gh:panelIndex": rich.panelIndex,
    "gh:sceneSubject": rich.sceneSubject,
    "gh:focusCharacter": rich.focusCharacter,
    "gh:allCharacters": rich.allCharacters,
    "gh:focusedCharacters": [rich.focusCharacter].filter((c) => c !== "shared"),
    "gh:props": rich.props,
    "gh:visualDescription": rich.visualDescription,
    "gh:precedingBeat": rich.precedingBeat,
    "gh:followingBeat": rich.followingBeat,
    "gh:scriptEntryIndices": rich.scriptEntryIndices,
    "gh:inserted": true,
    "gh:insertedRevision": "phase3.4-semantic-decompose-v3",
    "gh:insertedSource": "story-outline.jsonld + LLM decomposition",
    "gh:needsImageGeneration": true,
  };
}

async function main() {
  const cli = parseArgs();
  const ep = JSON.parse(fs.readFileSync(EPISODE_PATH, "utf-8"));
  const outline = JSON.parse(fs.readFileSync(OUTLINE_PATH, "utf-8"));
  const targetPages = cli.all ? outline["gh:pages"].map((p: any) => p["gh:pageNumber"]) : cli.pages;
  if (targetPages.length === 0) {
    console.error("No pages specified. Use --page N or --all");
    process.exit(1);
  }

  console.log(`Decomposing ${targetPages.length} page(s) with ${LLM_MODEL}`);

  for (const pn of targetPages) {
    const v2Page = outline["gh:pages"].find((p: any) => p["gh:pageNumber"] === pn);
    if (!v2Page) { console.warn(`v2 page ${pn} missing`); continue; }
    const epPage = ep["gh:pages"].find((p: any) => p["gh:pageNumber"] === pn);
    if (!epPage) { console.warn(`episode page ${pn} missing`); continue; }
    console.log(`\n=== Page ${pn} (${v2Page["gh:pageTitle"]}) ===`);
    try {
      const richPanels = await decomposePage(pn, v2Page);
      console.log(`  decomposed → ${richPanels.length} panel(s)`);
      for (const rp of richPanels) {
        console.log(`    n${rp.panelIndex} (${rp.shot}, focus=${rp.focusCharacter}, props=${rp.props.join(", ")}): ${rp.visualDescription.slice(0, 80)}`);
      }

      // Migrate existing image generation history
      const oldPanels = epPage["gh:panels"] ?? [];
      const newPanels = richPanels.map((rp) => {
        const newPanel = buildPanelJsonld(rp, pn);
        // Match to old panel by script-entry overlap
        const best = oldPanels.find((op: any) => {
          const oldEntries = op["gh:scriptEntries"]?.map((e: any) => e["gh:type"] + ":" + (e["gh:text"] ?? "").slice(0, 30)) ?? [];
          // overlap = any old script-entry text appears within rp's covered indices
          const rpTexts = rp.scriptEntryIndices.map((i) => v2Page["gh:script"][i]).filter(Boolean).map((e: any) => e["gh:type"] + ":" + (e["gh:text"] ?? "").slice(0, 30));
          return oldEntries.some((t: string) => rpTexts.includes(t));
        });
        if (best) {
          // Preserve image history
          if (best["gh:generatedImages"]) {
            newPanel["gh:generatedImages"] = best["gh:generatedImages"];
            newPanel["gh:currentImageIndex"] = best["gh:currentImageIndex"];
            newPanel["gh:generatedImageUrl"] = best["gh:generatedImageUrl"];
            // Don't mark as needsImageGeneration if we have a usable image
            // BUT visualDescription is now different, so mark for regen
            newPanel["gh:needsImageGeneration"] = true;
            newPanel["gh:migratedFromPanel"] = best["@id"];
          }
        }
        return newPanel;
      });

      // Stash deprecated panels
      const deprecated = oldPanels.filter((op: any) =>
        !newPanels.some((np: any) => np["gh:migratedFromPanel"] === op["@id"])
      );

      epPage["gh:panels"] = newPanels;
      epPage["gh:panelCount"] = newPanels.length;
      if (deprecated.length > 0) {
        epPage["gh:deprecatedPanelsP34"] = (epPage["gh:deprecatedPanelsP34"] ?? []).concat(deprecated);
      }
      epPage["gh:phase3.4Migration"] = {
        decomposedAt: new Date().toISOString(),
        model: LLM_MODEL,
        oldPanelCount: oldPanels.length,
        newPanelCount: newPanels.length,
      };
    } catch (e) {
      console.error(`  page ${pn} FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  fs.writeFileSync(EPISODE_PATH, JSON.stringify(ep, null, 2) + "\n");

  // Regenerate manifest
  console.log(`\nRegenerating manifest...`);
  const manifestPanels: any[] = [];
  for (const page of ep["gh:pages"]) {
    for (const panel of page["gh:panels"] ?? []) {
      if (!panel["gh:needsImageGeneration"]) continue;
      const safeId = panel["@id"].replace(/[^a-zA-Z0-9._-]/g, "_");
      const outputDir = `${REPO}/resources/images/episodes/episode:arc0-1-origin/pages/${page["gh:pageNumber"]}`;
      const outputFile = `${outputDir}/panel_${safeId}_v1.png`;
      manifestPanels.push({
        pageNum: page["gh:pageNumber"],
        panelId: panel["@id"],
        panelIndex: panel["gh:panelIndex"],
        pageTitle: page["gh:pageTitle"],
        shot: panel["shot"],
        visual: panel["gh:visualDescription"] ?? panel["visual"],
        sceneSubject: panel["gh:sceneSubject"],
        focusCharacter: panel["gh:focusCharacter"],
        allCharacters: panel["gh:allCharacters"] ?? [],
        focusedCharacters: panel["gh:focusedCharacters"] ?? [],
        props: panel["gh:props"] ?? [],
        precedingBeat: panel["gh:precedingBeat"],
        followingBeat: panel["gh:followingBeat"],
        characters: panel["gh:allCharacters"] ?? panel["characters"]?.map((c: string) => c.replace("character:", "")) ?? [],
        dialogues: panel["dialogue"] ?? [],
        prompt: "",  // built fresh by graph from rich fields
        outputPath: outputFile,
        outputDir,
        referenceCharacters: panel["gh:focusedCharacters"] ?? panel["gh:allCharacters"] ?? [],
        referenceSelections: [],
      });
    }
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  manifest.panels = manifestPanels;
  manifest.totalPanels = manifestPanels.length;
  manifest.regeneratedAt = new Date().toISOString();
  manifest.schema = "phase3.4-rich";
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Manifest updated: ${manifestPanels.length} panels need image generation.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
