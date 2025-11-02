import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";

type Json = { [k: string]: any };
type EmotionScore = { emotion: string; score: number };

const rootDir = path.resolve(process.cwd(), "..");
const wattpadDir = path.join(rootDir, "251022/wattpad");
const episodesDir = path.join(wattpadDir, "episodes");
const manifestPath = path.join(wattpadDir, "manifest.json");
const planPath = path.join(rootDir, "250806/episodes/emotional-outline.jsonld");
const contextPath = path.join(rootDir, "250806/emotion.context.jsonld");
const outputJsonLd = path.join(wattpadDir, "emotions.jsonld");
const outputImprovement = path.join(wattpadDir, "emotion-improvement.md");

const HUME_API_KEY = process.env.HUME_API_KEY || process.env.HUME_API;
const HUME_LANGUAGE_URL = process.env.HUME_LANGUAGE_URL;
const DRY_RUN = process.env.DRY_RUN === "1" || !HUME_API_KEY || !HUME_LANGUAGE_URL;

async function readText(file: string) { return fs.promises.readFile(file, "utf8"); }
async function readJson(file: string) { const t = await readText(file); try { return JSON.parse(t); } catch { return JSON5.parse(t); } }

function splitSentences(text: string, maxSentences = Number(process.env.MAX_SENTENCE_CALLS || 200)): string[] {
  const raw = text.replace(/\r\n/g, "\n").split(/(?<=[。！？!?\.])\s+/);
  const sentences = raw.map(s => s.trim()).filter(s => s.length > 0);
  return sentences.slice(0, maxSentences);
}

function fallbackEmotions(text: string): EmotionScore[] {
  const l = text.toLowerCase();
  const dims = ["joy","sadness","fear","anger","surprise","trust","anticipation","disgust","relief","hope"];
  const w = dims.map((d) => {
    let s = 0; if (["joy","hope","relief"].includes(d)) s += (l.match(/解放|還る|水|朝|hope|relief|joy|赦し|静けさ/g)||[]).length*1.4;
    if (d==="sadness") s += (l.match(/孤独|loss|涙|疲れ|沈む/g)||[]).length*1.2;
    if (d==="fear") s += (l.match(/恐れ|不安|怖い|前兆|脅威/g)||[]).length*1.2;
    if (d==="anger") s += (l.match(/怒り|rage|偽神|詰まる/g)||[]).length*1.1;
    if (d==="disgust") s += (l.match(/汚染|嫌悪|過激/g)||[]).length*1.0;
    if (d==="trust") s += (l.match(/信頼|契約|整える|待つ/g)||[]).length*1.1;
    if (d==="anticipation") s += (l.match(/兆し|準備|名を問う/g)||[]).length*1.0; return s; });
  const tot = w.reduce((a,b)=>a+b,0)||1; return dims.map((e,i)=>({emotion:e,score: +(w[i]/tot).toFixed(4)})).sort((a,b)=>b.score-a.score).slice(0,10);
}

async function callHume(text: string): Promise<EmotionScore[]> {
  if (DRY_RUN) return fallbackEmotions(text);
  const endpoint = String(HUME_LANGUAGE_URL);
  const create = await fetch(endpoint, {
    method: "POST",
    headers: { "Authorization": `Bearer ${HUME_API_KEY}`, "X-API-Key": `${HUME_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ models: { language: {} }, input: [{ text }] }),
  });
  if (!create.ok) throw new Error(`Hume create ${create.status}: ${await create.text()}`);
  const job = await create.json(); const jobId = job?.job_id || job?.id || job?.jobId; if (!jobId) return fallbackEmotions(text);
  const jobUrl = endpoint.endsWith("/jobs") ? `${endpoint}/${jobId}` : `${endpoint}/${jobId}`;
  const start = Date.now();
  while (Date.now()-start < 30000) {
    await new Promise(r=>setTimeout(r,1000));
    const st = await fetch(jobUrl, { headers: { "Authorization": `Bearer ${HUME_API_KEY}`, "X-API-Key": `${HUME_API_KEY}` } });
    if (!st.ok) break; const js = await st.json(); const state = String(js?.state||js?.status||"").toLowerCase();
    if (["succeeded","completed","done","finished"].includes(state)) {
      const outputs = js?.predictions || js?.result || js?.outputs || js?.language || [];
      const scores: EmotionScore[] = []; const first = Array.isArray(outputs)?outputs[0]:outputs; const entries = first?.emotions || first?.scores || {};
      for (const [emotion, val] of Object.entries(entries)) {
        if (typeof val === "number") scores.push({ emotion, score: val });
        else if (val && typeof (val as any).score === "number") scores.push({ emotion, score: (val as any).score });
      }
      if (!scores.length) return fallbackEmotions(text);
      const tot = scores.reduce((a,b)=>a+b.score,0)||1; return scores.map(s=>({emotion:s.emotion,score:+(s.score/tot).toFixed(4)})).sort((a,b)=>b.score-a.score).slice(0,12);
    }
    if (["failed","error"].includes(state)) break;
  }
  return fallbackEmotions(text);
}

async function listWattpadEpisodes(): Promise<Array<{ id: string; title?: string; files: string[] }>> {
  const eps: Array<{ id: string; title?: string; files: string[] }> = [];
  try {
    const manifest = await readJson(manifestPath);
    const list = manifest?.episodes || [];
    for (const e of list) eps.push({ id: e.id, title: e.title, files: (e.files||[]).map((f:string)=>path.join(wattpadDir, f)) });
  } catch {}
  // part-basedのみ運用（トップレベル単一版は削除済み）
  const dirs = await fs.promises.readdir(episodesDir, { withFileTypes: true });
  for (const d of dirs) {
    if (d.isDirectory() && /^ep\d+$/i.test(d.name)) {
      const dirPath = path.join(episodesDir, d.name);
      const parts = (await fs.promises.readdir(dirPath))
        .filter(fn => /^part\d+\.md$/i.test(fn))
        .map(fn => path.join(dirPath, fn))
        .sort();
      if (parts.length) eps.push({ id: d.name.toUpperCase(), files: parts });
    }
  }
  // dedupe by id
  const map = new Map<string, { id: string; title?: string; files: string[] }>();
  for (const e of eps) {
    if (!map.has(e.id)) map.set(e.id, { id: e.id, title: e.title, files: [...e.files] });
    else map.get(e.id)!.files.push(...e.files);
  }
  return Array.from(map.values());
}

function mapToGhEpisodeId(id: string): string {
  if (/^S\d+E\d+$/i.test(id)) return `gh:Episode/${id}`;
  if (/^EP\d+$/i.test(id)) return `gh:Episode/${id.toUpperCase()}`;
  if (/^EP\d+/.test(id.toUpperCase())) return `gh:Episode/${id.toUpperCase()}`;
  return `gh:Episode/${id}`;
}

async function main() {
  const ctx = await readJson(contextPath);
  const plan = await readJson(planPath);
  const planByEpisode = new Map<string, any>();
  for (const n of plan["@graph"] || []) {
    if (n["@type"] === "EmotionalPlan" && n.episode?.["@id"]) planByEpisode.set(n.episode["@id"], n);
  }

  const episodes = await listWattpadEpisodes();
  const graph: any[] = [];

  for (const ep of episodes) {
    const ghId = mapToGhEpisodeId(ep.id);
    if (!ep.files.length) continue;

    const partProfiles: any[] = [];
    const episodeAgg = new Map<string, number>();
    let episodeSentenceCount = 0;

    for (let pfIdx = 0; pfIdx < ep.files.length; pfIdx++) {
      const file = ep.files[pfIdx];
      let text = "";
      try { text = await readText(file); } catch {}
      if (!text) continue;

      const sentences = splitSentences(text);
      const sentenceProfiles: any[] = [];
      for (let si = 0; si < sentences.length; si++) {
        const sent = sentences[si];
        const scores = await callHume(sent);
        sentenceProfiles.push({
          "@type": "EmotionProfile",
          position: si + 1,
          segmentText: sent.slice(0, 400),
          emotionVector: scores.map(s => ({ "@type": "EmotionScore", emotion: s.emotion, score: s.score }))
        });
        for (const sc of scores) {
          episodeAgg.set(sc.emotion, (episodeAgg.get(sc.emotion) || 0) + sc.score);
        }
        episodeSentenceCount += 1;
      }

      const partAgg = new Map<string, number>();
      for (const sp of sentenceProfiles) for (const ev of sp.emotionVector) partAgg.set(ev.emotion, (partAgg.get(ev.emotion)||0) + ev.score);
      const partTot = Array.from(partAgg.values()).reduce((a,b)=>a+b,0) || 1;
      const partVec = Array.from(partAgg.entries()).map(([emotion,score])=>({ emotion, score: +(score/partTot).toFixed(4) }))
        .sort((a,b)=>b.score-a.score).slice(0,12);

      partProfiles.push({
        "@id": `${ghId}:Part:${pfIdx+1}:EmotionProfile`,
        "@type": "EmotionProfile",
        subject: { "@id": ghId },
        episode: { "@id": ghId },
        sourcePath: path.relative(rootDir, file),
        language: "ja",
        createdAt: new Date().toISOString(),
        emotionVector: partVec.map(s=>({ "@type": "EmotionScore", emotion: s.emotion, score: s.score })),
        trajectory: sentenceProfiles
      });
    }

    const epTot = Array.from(episodeAgg.values()).reduce((a,b)=>a+b,0) || 1;
    const epVec = Array.from(episodeAgg.entries()).map(([emotion,score])=>({ emotion, score: +(score/epTot).toFixed(4) }))
      .sort((a,b)=>b.score-a.score).slice(0,12);

    graph.push(...partProfiles);
    graph.push({
      "@id": `${ghId}:EmotionProfile`,
      "@type": "EmotionProfile",
      subject: { "@id": ghId },
      episode: { "@id": ghId },
      sourcePath: ep.files.map(f=>path.relative(rootDir,f)),
      language: "ja",
      createdAt: new Date().toISOString(),
      emotionVector: epVec.map(s=>({ "@type": "EmotionScore", emotion: s.emotion, score: s.score })),
      trajectory: partProfiles.map((pp, idx) => ({ "@type": "EmotionProfile", position: idx+1, emotionVector: pp.emotionVector }))
    });
  }

  const out = { "@context": [ (await readJson(contextPath))["@context"] ], "@graph": graph };
  await fs.promises.writeFile(outputJsonLd, JSON.stringify(out, null, 2), "utf8");

  const lines: string[] = [];
  lines.push(`# Wattpad Emotional Improvement Report`);
  for (const node of graph) {
    const eid = node.episode?.["@id"]; const planNode = planByEpisode.get(eid);
    lines.push(`\n## ${eid}`);
    const last = (node.trajectory as any[]).at(-1);
    const measured = new Map<string, number>();
    for (const v of last?.emotionVector || []) measured.set(v.emotion, v.score);
    if (planNode) {
      const finalBeat = (planNode.beats||[]).sort((a:any,b:any)=>a.position-b.position).at(-1);
      const target = new Map<string, number>(); for (const v of finalBeat?.targetVector||[]) target.set(v.emotion, v.score);
      const keys = new Set([...measured.keys(), ...target.keys()]);
      const diffs: Array<{emotion:string, delta:number, target?:number, actual?:number}> = [];
      for (const k of keys) diffs.push({ emotion: k, delta: (measured.get(k)||0) - (target.get(k)||0), target: target.get(k)||0, actual: measured.get(k)||0 });
      diffs.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
      lines.push(`- target vs actual (last segment):`);
      for (const d of diffs.slice(0,6)) lines.push(`  - ${d.emotion}: target=${d.target?.toFixed(2)} actual=${d.actual?.toFixed(2)} delta=${d.delta.toFixed(2)}`);
      const needMoreRelease = ((measured.get("relief")||0) + (measured.get("joy")||0) + (measured.get("hope")||0)) < ((target.get("relief")||0)+(target.get("joy")||0)+(target.get("hope")||0));
      if (needMoreRelease) lines.push(`- 提案: 終盤に『赦し』『水』『静けさ』のモチーフを追加。短いQuiet Winの会話と呼吸描写で余韻を延ばす。`);
      const fearTooHigh = (measured.get("fear")||0) > (target.get("fear")||0) + 0.1;
      if (fearTooHigh) lines.push(`- 提案: 不安描写は名づけ→整えで早めに解く。"待つ契約"や"I AM"の台詞で恐れを関係に変換。`);
      const angerTooHigh = (measured.get("anger")||0) > (target.get("anger")||0) + 0.1;
      if (angerTooHigh) lines.push(`- 提案: 応報の言い換え→回復語彙へ。触媒としてチーム連携（Kaede/Hibiki/Nei-chan）を挿入。`);
    } else {
      lines.push(`- 計画未定義: EmotionalPlanが無いので既定の終盤( relief/joy/hope )増強を推奨。`);
    }
  }
  await fs.promises.writeFile(outputImprovement, lines.join("\n"), "utf8");
  console.log(`Wattpad emotions written: ${outputJsonLd}`);
  console.log(`Improvement report written: ${outputImprovement}`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
