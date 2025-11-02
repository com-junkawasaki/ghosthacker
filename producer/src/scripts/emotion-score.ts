import fs from "node:fs";
import path from "node:path";

type EmotionScore = { emotion: string; score: number };

const rootDir = path.resolve(process.cwd(), "..");
const wattpadEmotions = path.join(rootDir, "251022/wattpad/emotions.jsonld");
const benchmarkPath = path.join(rootDir, "250806/emotion-benchmark.jsonld");
const outJson = path.join(rootDir, "251022/wattpad/emotion-scores.json");
const outMd = path.join(rootDir, "251022/wattpad/emotion-scores.md");

async function readJson(file: string) { return JSON.parse(await fs.promises.readFile(file, "utf8")); }

function vectorFrom(scores: EmotionScore[], keys: string[]): number[] {
  const map = new Map(scores.map(s=>[s.emotion, s.score]));
  return keys.map(k => map.get(k) || 0);
}

function cosine(a: number[], b: number[]): number {
  let dot=0, na=0, nb=0; for (let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  return (Math.sqrt(na)*Math.sqrt(nb)) ? dot/(Math.sqrt(na)*Math.sqrt(nb)) : 0;
}

async function main() {
  const emo = await readJson(wattpadEmotions);
  const bench = await readJson(benchmarkPath);

  const gold = (bench["@graph"] || []).find((n:any)=>n["@id"]==="gh:EmotionalBenchmark/KimiNoNaWa");
  const finalTarget: EmotionScore[] = (gold?.finalTarget || []) as any;
  const dims = ["relief","joy","hope","trust"]; // positive core
  const penaltyDims = ["fear","anger"]; // negative residuals
  const goldVec = vectorFrom(finalTarget, dims);

  const scores: any[] = [];
  for (const node of emo["@graph"] || []) {
    const id = node?.episode?.["@id"] || node?.subject?.["@id"] || node?.["@id"];
    const last = (node.trajectory || []).slice(-1)[0];
    if (!last) continue;
    const lastVec = vectorFrom((last.emotionVector||[]) as EmotionScore[], dims);
    const pos = cosine(lastVec, goldVec);
    const penalties = vectorFrom((last.emotionVector||[]) as EmotionScore[], penaltyDims).reduce((a,b)=>a+b,0);
    const score = Math.max(0, pos - penalties); // simple index
    scores.push({ episode: id, posSimilarity: +pos.toFixed(4), penalties: +penalties.toFixed(4), score: +score.toFixed(4) });
  }
  scores.sort((a,b)=>b.score-a.score);
  await fs.promises.writeFile(outJson, JSON.stringify(scores, null, 2), "utf8");

  const lines = ["# Emotional Scores vs Gold (KimiNoNaWa)", "", "dims = relief, joy, hope, trust / penalties = fear+anger", ""]; 
  for (const s of scores) lines.push(`- ${s.episode}: score=${s.score} (sim=${s.posSimilarity}, penalties=${s.penalties})`);
  await fs.promises.writeFile(outMd, lines.join("\n"), "utf8");
  // eslint-disable-next-line no-console
  console.log(`Scores written: ${outJson}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
