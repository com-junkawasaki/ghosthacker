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

// 感情遷移の滑らかさを評価（急激な変化にペナルティ）
function transitionSmoothness(trajectory: any[]): number {
  if (trajectory.length < 2) return 1;
  let totalDiff = 0;
  const dims = ["relief","joy","hope","trust","sadness","fear","anger"];
  for (let i = 1; i < trajectory.length; i++) {
    const prev = vectorFrom((trajectory[i-1].emotionVector||[]) as EmotionScore[], dims);
    const curr = vectorFrom((trajectory[i].emotionVector||[]) as EmotionScore[], dims);
    let segDiff = 0;
    for (let j = 0; j < dims.length; j++) {
      segDiff += Math.abs(curr[j] - prev[j]);
    }
    totalDiff += segDiff;
  }
  const avgDiff = totalDiff / (trajectory.length - 1);
  // 平均変化が0.3以下なら滑らか（スコア1.0）、0.5以上なら急激（スコア0.5）
  return Math.max(0.5, 1.0 - Math.max(0, avgDiff - 0.3) * 2);
}

// 感情の上昇トレンドを評価（positive emotionsが増加しているか）
function positiveGrowth(trajectory: any[]): number {
  if (trajectory.length < 2) return 0;
  const positiveDims = ["relief","joy","hope","trust"];
  const first = vectorFrom((trajectory[0].emotionVector||[]) as EmotionScore[], positiveDims).reduce((a,b)=>a+b,0);
  const last = vectorFrom((trajectory[trajectory.length-1].emotionVector||[]) as EmotionScore[], positiveDims).reduce((a,b)=>a+b,0);
  return Math.max(0, last - first); // 増加量（0以上）
}

// 負の感情の減少トレンドを評価
function negativeDecline(trajectory: any[]): number {
  if (trajectory.length < 2) return 0;
  const negativeDims = ["fear","anger","sadness"];
  const first = vectorFrom((trajectory[0].emotionVector||[]) as EmotionScore[], negativeDims).reduce((a,b)=>a+b,0);
  const last = vectorFrom((trajectory[trajectory.length-1].emotionVector||[]) as EmotionScore[], negativeDims).reduce((a,b)=>a+b,0);
  return Math.max(0, first - last); // 減少量（0以上）
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
    const trajectory = node.trajectory || [];
    if (trajectory.length === 0) continue;
    
    // 最終セグメントの目標との類似度
    const last = trajectory[trajectory.length - 1];
    const lastVec = vectorFrom((last.emotionVector||[]) as EmotionScore[], dims);
    const finalSimilarity = cosine(lastVec, goldVec);
    
    // 最終セグメントの負の感情ペナルティ
    const finalPenalties = vectorFrom((last.emotionVector||[]) as EmotionScore[], penaltyDims).reduce((a,b)=>a+b,0);
    
    // 感情遷移プロセスの評価
    const smoothness = transitionSmoothness(trajectory);
    const posGrowth = positiveGrowth(trajectory);
    const negDecline = negativeDecline(trajectory);
    
    // 総合スコア：最終状態(40%) + 感情成長(30%) + 遷移の滑らかさ(20%) + 負の感情減少(10%)
    const processScore = (posGrowth * 0.3) + (smoothness * 0.2) + (negDecline * 0.1);
    const finalScore = (finalSimilarity * 0.4) - (finalPenalties * 0.1);
    const totalScore = Math.max(0, finalScore + processScore);
    
    scores.push({ 
      episode: id, 
      finalSimilarity: +finalSimilarity.toFixed(4), 
      finalPenalties: +finalPenalties.toFixed(4),
      posGrowth: +posGrowth.toFixed(4),
      negDecline: +negDecline.toFixed(4),
      smoothness: +smoothness.toFixed(4),
      score: +totalScore.toFixed(4)
    });
  }
  scores.sort((a,b)=>b.score-a.score);
  await fs.promises.writeFile(outJson, JSON.stringify(scores, null, 2), "utf8");

  const lines = ["# Emotional Scores (Process-based)", "", 
    "Score = finalSimilarity(40%) + posGrowth(30%) + smoothness(20%) + negDecline(10%) - finalPenalties(10%)", ""]; 
  for (const s of scores) {
    lines.push(`- ${s.episode}: score=${s.score} (final=${s.finalSimilarity}, growth=${s.posGrowth}, smooth=${s.smoothness}, decline=${s.negDecline}, penalties=${s.finalPenalties})`);
  }
  await fs.promises.writeFile(outMd, lines.join("\n"), "utf8");
  // eslint-disable-next-line no-console
  console.log(`Scores written: ${outJson}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
