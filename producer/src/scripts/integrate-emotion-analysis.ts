import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), "..");
const emotionsPath = path.join(rootDir, "251022/wattpad/emotions.jsonld");
const structurePath = path.join(rootDir, "251022/wattpad/episode-structure.jsonld");
const scoresPath = path.join(rootDir, "251022/wattpad/emotion-scores.json");
const planPath = path.join(rootDir, "250806/episodes/emotional-outline.jsonld");
const benchmarkPath = path.join(rootDir, "250806/emotion-benchmark.jsonld");
const outputPath = path.join(rootDir, "251022/wattpad/integrated-emotion-analysis.jsonld");

async function readJson(file: string) {
  return JSON.parse(await fs.promises.readFile(file, "utf8"));
}

async function main() {
  const emotions = await readJson(emotionsPath);
  const structure = await readJson(structurePath);
  const scores = await readJson(scoresPath);
  const plan = await readJson(planPath);
  const benchmark = await readJson(benchmarkPath);

  // エピソードごとにデータを統合
  const episodeMap = new Map<string, any>();

  // 感情プロファイルを収集
  for (const node of emotions["@graph"] || []) {
    const epId = node?.episode?.["@id"];
    if (!epId) continue;
    
    if (!episodeMap.has(epId)) {
      episodeMap.set(epId, {
        "@id": epId,
        "@type": "gh:EmotionAnalysis",
        episode: { "@id": epId },
        emotionProfiles: [],
        structure: null,
        processScore: null,
        emotionalPlan: null
      });
    }
    
    episodeMap.get(epId)!.emotionProfiles.push(node);
  }

  // 構造メトリクスを追加
  for (const node of structure["@graph"] || []) {
    const epId = node?.episode?.["@id"];
    if (!epId || !episodeMap.has(epId)) continue;
    
    const ep = episodeMap.get(epId)!;
    if (!ep.structure) ep.structure = [];
    ep.structure.push(node);
  }

  // プロセススコアを追加（最高スコアのみ）
  const scoresByEpisode = new Map<string, any>();
  for (const scoreNode of scores) {
    const epId = scoreNode.episode;
    if (!epId) continue;
    
    const existing = scoresByEpisode.get(epId);
    if (!existing || scoreNode.score > existing.score) {
      scoresByEpisode.set(epId, scoreNode);
    }
  }
  
  for (const [epId, scoreNode] of scoresByEpisode.entries()) {
    if (!episodeMap.has(epId)) continue;
    
    episodeMap.get(epId)!.processScore = {
      "@type": "gh:ProcessScore",
      "gh:finalSimilarity": scoreNode.finalSimilarity,
      "gh:finalPenalties": scoreNode.finalPenalties,
      "gh:posGrowth": scoreNode.posGrowth,
      "gh:negDecline": scoreNode.negDecline,
      "gh:smoothness": scoreNode.smoothness,
      "gh:processScore": scoreNode.score,
      "gh:benchmarkedAgainst": { "@id": "gh:EmotionalBenchmark/KimiNoNaWa" }
    };
  }

  // 感情計画を追加
  for (const node of plan["@graph"] || []) {
    if (node["@type"] !== "EmotionalPlan") continue;
    const epId = node?.episode?.["@id"];
    if (!epId || !episodeMap.has(epId)) continue;
    
    episodeMap.get(epId)!.emotionalPlan = {
      "@id": node["@id"],
      "@type": "gh:EmotionalPlan",
      name: node.name,
      description: node.description,
      beats: node.beats
    };
  }

  const output = {
    "@context": {
      "@base": "https://ghosthacker.junkawasaki.com/",
      "gh": "https://ghosthacker.junkawasaki.com/gh#",
      "schema": "https://schema.org/",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "owl": "http://www.w3.org/2002/07/owl#",
      
      "EmotionAnalysis": "gh:EmotionAnalysis",
      "EmotionProfile": "gh:EmotionProfile",
      "EmotionScore": "gh:EmotionScore",
      "EmotionalPlan": "gh:EmotionalPlan",
      "EmotionalBeat": "gh:EmotionalBeat",
      "ProcessScore": "gh:ProcessScore",
      "EpisodePart": "gh:EpisodePart",
      
      "episode": { "@id": "gh:episode", "@type": "@id" },
      "emotionProfiles": { "@id": "gh:hasEmotionProfile", "@type": "@id" },
      "structure": { "@id": "gh:hasStructure", "@type": "@id" },
      "processScore": { "@id": "gh:hasProcessScore", "@type": "@id" },
      "emotionalPlan": { "@id": "gh:conformsTo", "@type": "@id" },
      "benchmarkedAgainst": { "@id": "gh:benchmarkedAgainst", "@type": "@id" }
    },
    "@graph": Array.from(episodeMap.values())
  };

  await fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Integrated emotion analysis written: ${outputPath}`);
  
  // 統計情報を出力
  console.log(`\nIntegration Summary:`);
  console.log(`- Total episodes: ${episodeMap.size}`);
  console.log(`- Episodes with emotion profiles: ${Array.from(episodeMap.values()).filter(e => e.emotionProfiles.length > 0).length}`);
  console.log(`- Episodes with structure: ${Array.from(episodeMap.values()).filter(e => e.structure).length}`);
  console.log(`- Episodes with process scores: ${Array.from(episodeMap.values()).filter(e => e.processScore).length}`);
  console.log(`- Episodes with emotional plans: ${Array.from(episodeMap.values()).filter(e => e.emotionalPlan).length}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

