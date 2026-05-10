/**
 * Orchestrator: read manifest → invoke LangGraph per panel → merge results into episode.jsonld.
 *
 * Usage:
 *   OPENROUTER_API_KEY=... npx tsx src/run.ts                    # generate all panels
 *   OPENROUTER_API_KEY=... npx tsx src/run.ts --panel-id panel:p21n1-v2  # single panel
 *   OPENROUTER_API_KEY=... npx tsx src/run.ts --page 1           # all panels on page 1
 *   OPENROUTER_API_KEY=... npx tsx src/run.ts --limit 3          # only first 3 panels
 *   OPENROUTER_API_KEY=... npx tsx src/run.ts --dry-run          # build prompts, skip API
 *
 * After successful generation, episode.jsonld panel entries are updated:
 *   - gh:generatedImageUrl: <relative URL>
 *   - gh:currentImageIndex: <new index>
 *   - gh:generatedImages: <array gets new entry with prompt + model + duration>
 *   - gh:needsImageGeneration: removed
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { buildGraph, type PanelManifestEntry, type PanelState } from "./graph.js";

const REPO = "/Users/junkawasaki/github/ghosthacker/260123-jump";
const MANIFEST_PATH = `${REPO}/resources/episodes/arc0-1-origin/image-gen-manifest.json`;
const EPISODE_PATH = `${REPO}/resources/episodes/arc0-1-origin/episode.jsonld`;
const PROVIDER = (process.env.IMAGE_PROVIDER ?? "openai").toLowerCase();
const MODEL = process.env.LG_IMAGE_MODEL ?? (PROVIDER === "openrouter" ? "google/gemini-3-pro-image-preview" : "gpt-image-2");
const QUALITY = process.env.LG_IMAGE_QUALITY ?? "low";

interface CliArgs {
  panelId?: string;
  page?: number;
  limit?: number;
  dryRun: boolean;
  delayMs: number;
  onlyPending: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const out: CliArgs = { dryRun: false, delayMs: 1500, onlyPending: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--panel-id" && args[i + 1]) out.panelId = args[++i];
    else if (args[i] === "--page" && args[i + 1]) out.page = Number(args[++i]);
    else if (args[i] === "--limit" && args[i + 1]) out.limit = Number(args[++i]);
    else if (args[i] === "--dry-run") out.dryRun = true;
    else if (args[i] === "--only-pending") out.onlyPending = true;
    else if (args[i] === "--delay-ms" && args[i + 1]) out.delayMs = Number(args[++i]);
  }
  return out;
}

function loadManifest(): { panels: PanelManifestEntry[] } {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
}

function loadEpisode(): any {
  return JSON.parse(fs.readFileSync(EPISODE_PATH, "utf-8"));
}

function saveEpisode(ep: any) {
  fs.writeFileSync(EPISODE_PATH, JSON.stringify(ep, null, 2) + "\n");
}

function updateEpisodePanel(ep: any, manifest: PanelManifestEntry, finalState: PanelState) {
  const page = ep["gh:pages"].find((p: any) => p["gh:pageNumber"] === manifest.pageNum);
  if (!page) return false;
  const panel = (page["gh:panels"] ?? []).find((pn: any) => pn["@id"] === manifest.panelId);
  if (!panel) return false;

  const totalDur = finalState.durationMs.build + finalState.durationMs.generate + finalState.durationMs.persist;
  const newImage = {
    "gh:imageUrl": finalState.outputRelUrl,
    "gh:imagePrompt": finalState.refinedPrompt,
    "gh:generatedAt": Math.floor(Date.now() / 1000),
    "gh:model": MODEL,
    "gh:durationMs": totalDur,
    "gh:generationPipeline": "langgraph-ts-buildPrompt-generate-persist",
    "gh:generationStages": [
      { name: "buildPrompt", durationMs: finalState.durationMs.build },
      { name: "generateImage", durationMs: finalState.durationMs.generate },
      { name: "persistImage", durationMs: finalState.durationMs.persist },
    ],
    "gh:referenceCharacters": manifest.referenceCharacters,
    "gh:referenceSelections": manifest.referenceSelections,
  };

  if (!panel["gh:generatedImages"]) panel["gh:generatedImages"] = [];
  panel["gh:generatedImages"].push(newImage);
  panel["gh:currentImageIndex"] = panel["gh:generatedImages"].length - 1;
  panel["gh:generatedImageUrl"] = finalState.outputRelUrl;
  panel["gh:imagePrompt"] = finalState.refinedPrompt;
  delete panel["gh:needsImageGeneration"];
  return true;
}

async function main() {
  const cli = parseArgs();
  const manifest = loadManifest();
  let panels = manifest.panels;
  if (cli.onlyPending) {
    const ep = loadEpisode();
    const pending = new Set<string>();
    for (const pg of ep["gh:pages"] ?? []) {
      for (const pn of pg["gh:panels"] ?? []) {
        if (pn["gh:needsImageGeneration"]) pending.add(pn["@id"]);
      }
    }
    panels = panels.filter((p) => pending.has(p.panelId));
    console.log(`--only-pending: ${panels.length} panel(s) still need image generation.`);
  }
  if (cli.panelId) panels = panels.filter((p) => p.panelId === cli.panelId);
  if (cli.page !== undefined) panels = panels.filter((p) => p.pageNum === cli.page);
  if (cli.limit !== undefined) panels = panels.slice(0, cli.limit);

  if (panels.length === 0) {
    console.log("No panels match filter. Exiting.");
    return;
  }

  const provider = (process.env.IMAGE_PROVIDER ?? "openai").toLowerCase();
  const requiredKey = provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY";
  if (!cli.dryRun && !process.env[requiredKey]) {
    console.error(`ERROR: ${requiredKey} env var is not set. Set it or pass --dry-run.`);
    process.exit(1);
  }

  console.log(`LangGraph image gen — ${panels.length} panel(s) to process${cli.dryRun ? " [DRY RUN]" : ""}`);
  console.log(`Provider: ${provider} / Model: ${MODEL} / Quality: ${QUALITY}`);

  const graph = buildGraph();
  const results: Array<{ panelId: string; pageNum: number; ok: boolean; error?: string; durationMs?: number; outputUrl?: string }> = [];
  const ep = loadEpisode();

  for (let i = 0; i < panels.length; i++) {
    const m = panels[i];
    const tag = `[${i + 1}/${panels.length}] p${m.pageNum} ${m.panelId}`;
    process.stdout.write(`${tag} → `);

    if (cli.dryRun) {
      // Just exercise buildPrompt by invoking with a noop generateImage — emulate a partial run
      const mockState: PanelState = {
        manifest: m,
        refinedPrompt: m.prompt,
        generatedDataUrl: null,
        outputAbsPath: null,
        outputRelUrl: null,
        errors: [],
        durationMs: { build: 0, generate: 0, persist: 0 },
      };
      console.log(`prompt-len=${m.prompt.length} → would write to ${m.outputPath.replace(REPO, ".")}`);
      results.push({ panelId: m.panelId, pageNum: m.pageNum, ok: true, durationMs: 0 });
      continue;
    }

    try {
      const final = (await graph.invoke({ manifest: m })) as PanelState;
      if (final.errors.length > 0) {
        console.log(`FAIL: ${final.errors.join(" | ")}`);
        results.push({ panelId: m.panelId, pageNum: m.pageNum, ok: false, error: final.errors.join(" | ") });
      } else {
        const merged = updateEpisodePanel(ep, m, final);
        const total = final.durationMs.build + final.durationMs.generate + final.durationMs.persist;
        console.log(`OK ${total}ms → ${final.outputRelUrl} ${merged ? "[merged]" : "[merge-skipped]"}`);
        results.push({ panelId: m.panelId, pageNum: m.pageNum, ok: true, durationMs: total, outputUrl: final.outputRelUrl ?? undefined });
        // Save episode incrementally so partial progress is preserved
        saveEpisode(ep);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`THROW: ${msg}`);
      results.push({ panelId: m.panelId, pageNum: m.pageNum, ok: false, error: msg });
    }

    // Rate-limit between calls
    if (i < panels.length - 1 && cli.delayMs > 0) await new Promise((r) => setTimeout(r, cli.delayMs));
  }

  // Final summary
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  const totalMs = results.reduce((s, r) => s + (r.durationMs ?? 0), 0);
  console.log(`\n=== Summary ===`);
  console.log(`OK:    ${ok}/${results.length}`);
  console.log(`FAIL:  ${fail}/${results.length}`);
  console.log(`Total time: ${(totalMs / 1000).toFixed(1)}s`);
  if (fail > 0) {
    console.log(`\nFailures:`);
    for (const r of results.filter((x) => !x.ok)) console.log(`  - p${r.pageNum} ${r.panelId}: ${r.error}`);
  }

  // Write run report
  const reportPath = `${REPO}/resources/episodes/arc0-1-origin/lg-image-gen-runs/run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ model: MODEL, dryRun: cli.dryRun, panelsProcessed: results.length, ok, fail, totalMs, results }, null, 2));
  console.log(`Report: ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
