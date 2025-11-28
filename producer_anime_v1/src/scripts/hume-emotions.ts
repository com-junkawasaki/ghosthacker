/*
  Emotion Analysis Script (Hume-based)
  - Reads episode sources from episode_bible.jsonld
  - Loads episode text (ja/en markdown preferred; falls back to jsonld where needed)
  - Segments text, calls Hume Language API (if configured), or deterministic fallback
  - Emits JSON-LD at 250806/episodes/emotions.jsonld with EmotionProfile nodes
*/

import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";

type JsonLd = { [k: string]: any };

const rootDir = path.resolve(process.cwd(), "..");
const episodeBiblePath = path.join(rootDir, "251022/episode_bible.jsonld");
const ghostHackerCorePath = path.join(rootDir, "251022/ghost-hacker.jsonld");
const episodesDir = path.join(rootDir, "250806/episodes");
const outputPath = path.join(rootDir, "250806/episodes/emotions.jsonld");
const contextPath = path.join(rootDir, "250806/emotion.context.jsonld");

const HUME_API_KEY = process.env.HUME_API_KEY || process.env.HUME_API;
const HUME_LANGUAGE_URL = process.env.HUME_LANGUAGE_URL; // required to actually call Hume
const DRY_RUN = process.env.DRY_RUN === "1" || !HUME_API_KEY || !HUME_LANGUAGE_URL;

type EmotionScore = { emotion: string; score: number };

async function readJson(file: string): Promise<JsonLd> {
  const txt = await fs.promises.readFile(file, "utf8");
  try {
    return JSON.parse(txt);
  } catch {
    return JSON5.parse(txt);
  }
}

async function readTextIfExists(file: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(file, "utf8");
  } catch {
    return null;
  }
}

function segmentText(text: string, maxLen = 1200, maxChunks = 8): string[] {
  const chunks: string[] = [];
  let buf = "";
  for (const line of text.split(/\n+/)) {
    if ((buf + "\n" + line).length > maxLen) {
      chunks.push(buf);
      buf = line;
      if (chunks.length >= maxChunks) break;
    } else {
      buf = buf ? buf + "\n" + line : line;
    }
  }
  if (buf && chunks.length < maxChunks) chunks.push(buf);
  return chunks.length > 0 ? chunks : [text.slice(0, Math.min(text.length, maxLen))];
}

// Deterministic fallback to ensure the pipeline runs without network
function fallbackEmotions(text: string): EmotionScore[] {
  const lower = text.toLowerCase();
  const dims = [
    "joy",
    "sadness",
    "fear",
    "anger",
    "surprise",
    "trust",
    "anticipation",
    "disgust",
    "relief",
    "hope",
  ];
  const weights = dims.map((d) => {
    let w = 0;
    if (d === "joy" || d === "hope" || d === "relief") {
      w += (lower.match(/自由|解放|light|水|forgive|赦し|再生|hope|love/g) || []).length * 1.5;
    }
    if (d === "sadness") w += (lower.match(/孤独|涙|失う|loss|孤立/g) || []).length * 1.2;
    if (d === "fear") w += (lower.match(/恐れ|不安|fear|threat/g) || []).length * 1.2;
    if (d === "anger") w += (lower.match(/怒り|憤り|injustice|betrayal/g) || []).length * 1.1;
    if (d === "disgust") w += (lower.match(/嫌悪|汚染|toxic/g) || []).length * 1.0;
    if (d === "surprise") w += (lower.match(/兆候|sudden|unexpected/g) || []).length * 1.0;
    if (d === "trust") w += (lower.match(/信頼|絆|together|connect/g) || []).length * 1.1;
    if (d === "anticipation") w += (lower.match(/予感|兆し|anticipation/g) || []).length * 1.0;
    if (d === "relief") w += (lower.match(/救済|癒し|解放|relief/g) || []).length * 1.4;
    if (d === "hope") w += (lower.match(/希望|hope|promise|約束/g) || []).length * 1.4;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return dims
    .map((emotion, i) => ({ emotion, score: Number((weights[i] / total).toFixed(4)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

async function callHume(text: string): Promise<EmotionScore[]> {
  if (DRY_RUN) return fallbackEmotions(text);
  const endpoint = String(HUME_LANGUAGE_URL);

  // Batch Jobs flow
  if (endpoint.includes("/v0/batch/jobs")) {
    const createRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUME_API_KEY}`,
        "X-API-Key": `${HUME_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        models: { language: {} },
        input: [{ text }],
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`Hume batch create error ${createRes.status}: ${body}`);
    }
    const job = await createRes.json();
    const jobId = job?.job_id || job?.id || job?.jobId;
    if (!jobId) throw new Error(`Hume batch: missing job id in response: ${JSON.stringify(job).slice(0, 300)}`);

    // Poll status
    const jobUrl = endpoint.endsWith("/jobs") ? `${endpoint}/${jobId}` : `${endpoint}/${jobId}`;
    const started = Date.now();
    while (Date.now() - started < 30000) { // 30s max
      await new Promise(r => setTimeout(r, 1000));
      const st = await fetch(jobUrl, {
        headers: {
          "Authorization": `Bearer ${HUME_API_KEY}`,
          "X-API-Key": `${HUME_API_KEY}`,
        },
      });
      if (!st.ok) {
        const body = await st.text();
        throw new Error(`Hume batch status error ${st.status}: ${body}`);
      }
      const status = await st.json();
      const state = status?.state || status?.status || status?.job_state;
      if (["succeeded", "completed", "done", "finished"].includes(String(state).toLowerCase())) {
        // Try get predictions/emotions
        const outputs = status?.predictions || status?.result || status?.outputs || status?.language || [];
        const scores: EmotionScore[] = [];
        const first = Array.isArray(outputs) ? outputs[0] : outputs;
        const entries = first?.emotions || first?.scores || first?.language || {};
        for (const [emotion, score] of Object.entries(entries)) {
          if (typeof score === "number") scores.push({ emotion, score });
          else if (score && typeof (score as any).score === "number") scores.push({ emotion, score: (score as any).score });
        }
        if (scores.length === 0) return fallbackEmotions(text);
        const total = scores.reduce((a, b) => a + b.score, 0) || 1;
        return scores
          .map((s) => ({ emotion: s.emotion, score: Number((s.score / total).toFixed(4)) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 12);
      }
      if (["failed", "error"].includes(String(state).toLowerCase())) {
        throw new Error(`Hume batch job failed: ${JSON.stringify(status).slice(0, 300)}`);
      }
    }
    // Timeout
    return fallbackEmotions(text);
  }

  // Simple sync flow (if a direct language endpoint exists)
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HUME_API_KEY}`,
      "X-API-Key": `${HUME_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texts: [text] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hume API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  const scores: EmotionScore[] = [];
  const first = Array.isArray(data) ? data[0] : data;
  const entries = first?.emotions || first?.scores || {};
  for (const [emotion, score] of Object.entries(entries)) {
    if (typeof score === "number") scores.push({ emotion, score });
    else if (score && typeof (score as any).score === "number") scores.push({ emotion, score: (score as any).score });
  }
  if (scores.length === 0) return fallbackEmotions(text);
  const total = scores.reduce((a, b) => a + b.score, 0) || 1;
  return scores
    .map((s) => ({ emotion: s.emotion, score: Number((s.score / total).toFixed(4)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

async function loadEpisodeText(sourcePath: string): Promise<{ text: string; language: string } | null> {
  // Prefer markdown if available; otherwise JSON-LD
  const mdPath = sourcePath.replace(/\.jsonld$/i, ".md");
  const absMd = path.join(rootDir, mdPath);
  const absJson = path.join(rootDir, sourcePath);
  const md = await readTextIfExists(absMd);
  if (md) return { text: md, language: mdPath.includes("/en_") ? "en" : "ja" };
  const jsonText = await readTextIfExists(absJson);
  if (jsonText) return { text: jsonText, language: absJson.includes("/en_") ? "en" : "ja" };
  return null;
}

async function main() {
  const episodeBible = await readJson(episodeBiblePath);
  let ghost: any = { "@graph": [] };
  try {
    ghost = await readJson(ghostHackerCorePath);
  } catch {
    ghost = { "@graph": [] };
  }

  const ctx = await readJson(contextPath);

  const graph: any[] = [];
  const byId = new Map<string, any>((ghost["@graph"] || []).map((n: any) => [n["@id"], n]));

  const sourceById = new Map<string, any>((episodeBible["@graph"] || [])
    .filter((n: any) => (n["@type"] === "gh:SourceRef" || n["@type"] === "SourceRef"))
    .map((n: any) => [n["@id"], n]));

  const episodes = (episodeBible["@graph"] || [])
    .filter((n: any) => typeof n["@id"] === "string" && n["@id"].startsWith("gh:Episode/"));

  for (const ep of episodes) {
    const epId = ep["@id"]; 
    const sourceRefId = ep.source?.["@id"]; 
    let sourcePath = "";
    if (sourceRefId && sourceById.has(sourceRefId)) {
      sourcePath = sourceById.get(sourceRefId)?.path || "";
    }
    if (!sourcePath) {
      // Try heuristics from folder
      const guess = epId.replace("gh:Episode/", "").toLowerCase();
      const ep1 = path.join(episodesDir, "episode1/ja_Episode_01_Masterpiece.md");
      if (fs.existsSync(ep1)) sourcePath = path.relative(rootDir, ep1);
    }
    if (!sourcePath) continue;

    const content = await loadEpisodeText(sourcePath);
    if (!content) continue;

    const segments = segmentText(content.text, 1200, 8);
    const segmentProfiles: any[] = [];
    // Sequential to avoid rate limits
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const scores = await callHume(seg);
      const emotionVector = scores.map((s) => ({ "@type": "EmotionScore", emotion: s.emotion, score: s.score }));
      segmentProfiles.push({
        "@type": "EmotionProfile",
        position: i + 1,
        segmentText: seg.slice(0, 2000),
        emotionVector,
      });
    }

    // Aggregate overall profile by averaging
    const agg = new Map<string, number>();
    for (const sp of segmentProfiles) {
      for (const v of sp.emotionVector as EmotionScore[]) {
        agg.set(v.emotion, (agg.get(v.emotion) || 0) + (v.score || 0));
      }
    }
    const aggArray: EmotionScore[] = Array.from(agg.entries()).map(([emotion, score]) => ({ emotion, score: score / segmentProfiles.length }));
    const total = aggArray.reduce((a, b) => a + b.score, 0) || 1;
    const normalized = aggArray.map((s) => ({ emotion: s.emotion, score: Number((s.score / total).toFixed(4)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const overallProfile = {
      "@id": `${epId}:EmotionProfile`,
      "@type": "EmotionProfile",
      subject: { "@id": epId },
      episode: { "@id": epId },
      sourcePath,
      language: content.language,
      createdAt: new Date().toISOString(),
      emotionVector: normalized.map((s) => ({ "@type": "EmotionScore", emotion: s.emotion, score: s.score })),
      trajectory: segmentProfiles.map((sp) => ({
        "@type": "EmotionProfile",
        position: sp.position,
        emotionVector: sp.emotionVector,
      })),
    };

    graph.push(overallProfile);

    // Optional per-character baseline using character descriptions (if available)
    const characters = Array.isArray(ep.hasCharacter) ? ep.hasCharacter : [];
    for (const c of characters) {
      const cid = c["@id"]; if (!cid) continue;
      const charNode = byId.get(cid);
      const desc = charNode?.description || "";
      if (!desc) continue;
      const scores = await callHume(String(desc));
      const charProfile = {
        "@id": `${cid}:BaselineEmotion`,
        "@type": "EmotionProfile",
        subject: { "@id": cid },
        episode: { "@id": epId },
        language: "ja",
        createdAt: new Date().toISOString(),
        emotionVector: scores.map((s) => ({ "@type": "EmotionScore", emotion: s.emotion, score: s.score })),
      };
      graph.push(charProfile);
    }
  }

  const jsonld = {
    "@context": [
      ctx["@context"],
    ],
    "@graph": graph,
  };

  await fs.promises.writeFile(outputPath, JSON.stringify(jsonld, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`Emotion JSON-LD written: ${outputPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Emotion analysis failed:", err);
  process.exitCode = 1;
});


