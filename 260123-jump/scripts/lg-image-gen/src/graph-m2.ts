/**
 * Method 2: 1枚絵 + edit/mask 修正
 * Pattern: Agent Loop (vision-critic-driven retry)
 *
 * Stages (loop, max 3 iterations):
 *   1. buildPrompt (initial or refined based on critique)
 *   2. generate
 *   3. critique (gpt-4o-mini-vision)
 *   4. if score >= 7 → done; else if iter < max → refine prompt → retry; else → ship best
 */
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import * as fs from "node:fs";
import * as path from "node:path";
import { generate, edit, critique, MODEL } from "./lib/openai.js";
import { extractSetting, pickVariant, refPath, type Variant } from "./lib/refs.js";

export interface PanelManifestEntry {
  pageNum: number;
  panelId: string;
  panelIndex: number;
  pageTitle: string;
  shot: string;
  visual: string;
  characters: string[];
  dialogues: { speaker: string; text: string; emotion?: string }[];
  prompt: string;
  outputPath: string;
  outputDir: string;
  referenceCharacters: string[];
  referenceSelections: { character: string; variant: string; note: string }[];
}

const MAX_ITERS = Number(process.env.LG_M2_MAX_ITERS ?? 3);
const ACCEPT_SCORE = Number(process.env.LG_M2_ACCEPT_SCORE ?? 7);

export const StateAnnotation = Annotation.Root({
  manifest: Annotation<PanelManifestEntry>(),
  setting: Annotation<string>(),
  visualNote: Annotation<string>(),
  resolvedRefs: Annotation<{ character: string; variant: Variant; refPath: string }[]>({ default: () => [], reducer: (_, x) => x }),
  iter: Annotation<number>({ default: () => 0, reducer: (_, x) => x }),
  currentPrompt: Annotation<string>(),
  candidatePath: Annotation<string | null>({ default: () => null, reducer: (_, x) => x }),
  bestPath: Annotation<string | null>({ default: () => null, reducer: (_, x) => x }),
  bestScore: Annotation<number>({ default: () => 0, reducer: (_, x) => x }),
  lastCritique: Annotation<{ score: number; settingMatch: boolean; charactersMatch: boolean; hasUnwantedText: boolean; notes: string } | null>({ default: () => null, reducer: (_, x) => x }),
  outputRelUrl: Annotation<string | null>({ default: () => null, reducer: (_, x) => x }),
  errors: Annotation<string[]>({ default: () => [], reducer: (a, b) => [...a, ...b] }),
  durationMs: Annotation<Record<string, number>>({ default: () => ({}), reducer: (a, b) => ({ ...a, ...b }) }),
  iterLog: Annotation<{ iter: number; score: number; notes: string }[]>({ default: () => [], reducer: (a, b) => [...a, ...b] }),
});
export type State = typeof StateAnnotation.State;

function basePrompt(state: State): string {
  const m = state.manifest;
  const refsHint = state.resolvedRefs.length > 0
    ? `Character face-identity references will be supplied as input images (one per character: ${state.resolvedRefs.map((r) => r.character).join(", ")}). Use them ONLY for face identity (face shape, eye design, hairstyle, age impression). Do NOT copy reference clothing, pose, or background. Apply Japanese middle-school uniform (gakuran for boys, sailor uniform for girls) and the pose described in the scene.`
    : "";
  return [
    "Cinematic manga panel illustration, monochrome with screen tones, single full-bleed image.",
    state.setting ? `LOCATION (do not change): ${state.setting}.` : "",
    state.visualNote ? `Set dressing: ${state.visualNote}.` : "",
    `Specific moment: ${m.visual}.`,
    `Shot framing: ${m.shot}.`,
    m.characters.length > 0 ? `Characters present: ${m.characters.join(", ")}.` : "Empty scene.",
    refsHint,
    "ABSOLUTE: NO text, NO speech bubbles, NO captions, NO labels, NO storyboard frames or scene numbers in the rendered image.",
  ].filter(Boolean).join(" ");
}

async function planNode(state: State): Promise<Partial<State>> {
  const t0 = Date.now();
  const { setting, visualNote } = extractSetting(state.manifest.prompt);
  // Resolve character references
  const resolvedRefs = state.manifest.characters
    .map((c) => {
      const v = pickVariant(c, state.manifest.dialogues, state.manifest.shot);
      const rp = refPath(c, v);
      return rp ? { character: c, variant: v, refPath: rp } : null;
    })
    .filter((x): x is { character: string; variant: Variant; refPath: string } => x !== null);
  const initial = basePrompt({ ...state, setting, visualNote, resolvedRefs } as State);
  return { setting, visualNote, resolvedRefs, currentPrompt: initial, iter: 0, durationMs: { plan: Date.now() - t0 } };
}

async function generateNode(state: State): Promise<Partial<State>> {
  const t0 = Date.now();
  try {
    let b64: string;
    if (state.resolvedRefs.length > 0) {
      // Use /v1/images/edits with ref images injected
      const refPaths = state.resolvedRefs.map((r) => r.refPath);
      b64 = await edit(state.currentPrompt, refPaths);
    } else {
      // No characters → plain generation
      b64 = await generate(state.currentPrompt);
    }
    const candidatePath = state.manifest.outputPath.replace(/\.png$/, `_m2ref_iter${state.iter + 1}.png`);
    fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
    fs.writeFileSync(candidatePath, Buffer.from(b64, "base64"));
    const dur = state.durationMs.generate ?? 0;
    return { candidatePath, iter: state.iter + 1, durationMs: { generate: dur + (Date.now() - t0) } };
  } catch (e) {
    return { errors: [`generate: ${e instanceof Error ? e.message : String(e)}`], durationMs: { generate: Date.now() - t0 } };
  }
}

async function critiqueNode(state: State): Promise<Partial<State>> {
  const t0 = Date.now();
  if (!state.candidatePath) return { errors: ["no candidate"] };
  try {
    const c = await critique(state.candidatePath, state.setting || state.manifest.visual, state.manifest.characters, state.manifest.shot);
    const better = c.score > state.bestScore;
    const dur = state.durationMs.critique ?? 0;
    return {
      lastCritique: c,
      bestScore: better ? c.score : state.bestScore,
      bestPath: better ? state.candidatePath : state.bestPath,
      iterLog: [{ iter: state.iter, score: c.score, notes: c.notes }],
      durationMs: { critique: dur + (Date.now() - t0) },
    };
  } catch (e) {
    return { errors: [`critique: ${e instanceof Error ? e.message : String(e)}`], durationMs: { critique: Date.now() - t0 } };
  }
}

async function refineNode(state: State): Promise<Partial<State>> {
  const t0 = Date.now();
  // Build refined prompt addressing critic notes
  const c = state.lastCritique;
  const fixes: string[] = [];
  if (c) {
    if (!c.settingMatch) fixes.push(`The previous attempt did NOT show the correct location. Strictly render: ${state.setting}. Do not drift to any other setting.`);
    if (!c.charactersMatch) fixes.push(`The previous attempt did NOT show the expected characters: ${state.manifest.characters.join(", ")}. Render exactly these characters.`);
    if (c.hasUnwantedText) fixes.push("The previous attempt had unwanted text/speech bubbles. Remove ALL text, captions, labels, scene numbers, dialogue overlays.");
    if (c.notes) fixes.push(`Critic notes: ${c.notes}. Address these.`);
  }
  const refined = [basePrompt(state), ...fixes].join(" ");
  return { currentPrompt: refined, durationMs: { refine: (state.durationMs.refine ?? 0) + (Date.now() - t0) } };
}

function shouldStop(state: State): "stop" | "retry" {
  const c = state.lastCritique;
  if (!c) return "stop";
  if (c.score >= ACCEPT_SCORE) return "stop";
  if (state.iter >= MAX_ITERS) return "stop";
  return "retry";
}

async function persistNode(state: State): Promise<Partial<State>> {
  const t0 = Date.now();
  const src = state.bestPath ?? state.candidatePath;
  if (!src) return { errors: ["nothing to persist"] };
  fs.copyFileSync(src, state.manifest.outputPath);
  const idx = state.manifest.outputPath.indexOf("/resources/");
  const url = idx >= 0 ? state.manifest.outputPath.slice(idx + "/resources".length) : state.manifest.outputPath;
  return { outputRelUrl: url, durationMs: { persist: Date.now() - t0 } };
}

export function buildGraphM2() {
  const g = new StateGraph(StateAnnotation)
    .addNode("plan", planNode)
    .addNode("generate", generateNode)
    .addNode("critique", critiqueNode)
    .addNode("refine", refineNode)
    .addNode("persist", persistNode)
    .addEdge(START, "plan")
    .addEdge("plan", "generate")
    .addEdge("generate", "critique")
    .addConditionalEdges("critique", shouldStop, { stop: "persist", retry: "refine" })
    .addEdge("refine", "generate")
    .addEdge("persist", END);
  return g.compile();
}
