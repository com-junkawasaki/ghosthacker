# Emotion Analysis System - RDF/JSON-LD Documentation

## 概要

Ghost Hackerプロジェクトの感情分析システムは、エピソードの感情プロセスを定量的に評価し、RDF/JSON-LD形式で統合管理します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Emotion Analysis System                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Emotion    │    │   Episode    │    │   Process    │  │
│  │   Profile    │───▶│  Structure   │───▶│    Score     │  │
│  │  (Hume AI)   │    │  (Metrics)   │    │ (Evaluation) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                              │                                │
│                              ▼                                │
│                   ┌──────────────────┐                       │
│                   │   Integrated     │                       │
│                   │  Emotion Analysis│                       │
│                   │    (JSON-LD)     │                       │
│                   └──────────────────┘                       │
│                              │                                │
│                              ▼                                │
│                   ┌──────────────────┐                       │
│                   │  SHACL Validation│                       │
│                   │   & Constraints  │                       │
│                   └──────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## データモデル

### 1. EmotionAnalysis（統合感情分析）

エピソード全体の感情分析結果を統合したエンティティ。

```turtle
gh:EmotionAnalysis
  a owl:Class ;
  rdfs:label "Emotion Analysis" ;
  rdfs:comment "統合された感情分析結果。エピソードの感情プロファイル、構造、スコアを関連付ける。" .
```

**プロパティ**:
- `gh:episode`: 対象エピソード（必須、1つ）
- `gh:hasEmotionProfile`: 感情プロファイル（必須、1つ以上）
- `gh:hasStructure`: 構造メトリクス（任意）
- `gh:hasProcessScore`: プロセススコア（任意、1つ）
- `gh:conformsTo`: 準拠する感情計画（任意、1つ）

### 2. EmotionProfile（感情プロファイル）

テキストセグメント（文、段落、パート、エピソード）の感情分布。

```turtle
gh:EmotionProfile
  a owl:Class ;
  rdfs:label "Emotion Profile" ;
  rdfs:comment "テキストセグメントの感情プロファイル。" .
```

**プロパティ**:
- `gh:episode`: 所属エピソード（必須、1つ）
- `gh:emotionVector`: 感情ベクトル（必須、1つ以上）
- `gh:trajectory`: 感情の時系列変化（任意）
- `gh:sourcePath`: ソースファイルパス（任意）
- `gh:language`: 言語（任意）
- `gh:createdAt`: 作成日時（任意）

### 3. EmotionScore（感情スコア）

特定の感情の強度スコア（0.0-1.0）。

```turtle
gh:EmotionScore
  a owl:Class ;
  rdfs:label "Emotion Score" ;
  rdfs:comment "特定の感情の強度スコア（0.0-1.0）。" .
```

**プロパティ**:
- `gh:emotion`: 感情名（必須、1つ）
  - 有効な値: "joy", "sadness", "fear", "anger", "surprise", "trust", "anticipation", "disgust", "relief", "hope"
- `gh:score`: スコア（必須、1つ、0.0-1.0）

### 4. ProcessScore（プロセススコア）

感情プロセス全体の評価スコア。

```turtle
gh:ProcessScore
  a owl:Class ;
  rdfs:label "Process Score" ;
  rdfs:comment "感情プロセス全体の評価スコア。" .
```

**プロパティ**:
- `gh:finalSimilarity`: 最終状態のベンチマーク類似度（0.0-1.0）
- `gh:finalPenalties`: 最終セグメントの負の感情ペナルティ（0.0以上）
- `gh:posGrowth`: positive emotionsの成長量（0.0以上）
- `gh:negDecline`: negative emotionsの減少量（0.0以上）
- `gh:smoothness`: 遷移の滑らかさ（0.0-1.0）
- `gh:processScore`: 総合スコア（0.0-1.0）
- `gh:benchmarkedAgainst`: 比較対象ベンチマーク（必須、1つ）

**スコア計算式**:
```
processScore = (finalSimilarity × 0.4) + (posGrowth × 0.3) + (smoothness × 0.2) + (negDecline × 0.1) - (finalPenalties × 0.1)
```

## ファイル構成

### スキーマ・オントロジー

- `250806/emotion-analysis-schema.jsonld`: 感情分析システムのOWLスキーマ
- `250806/emotion-analysis.shacl.ttl`: SHACL検証ルール
- `250806/emotion.context.jsonld`: 感情語彙のJSON-LDコンテキスト

### データファイル

- `251022/wattpad/emotions.jsonld`: Hume AIによる感情分析結果
- `251022/wattpad/episode-structure.jsonld`: エピソード構造メトリクス
- `251022/wattpad/emotion-scores.json`: プロセススコア
- `251022/wattpad/integrated-emotion-analysis.jsonld`: **統合感情分析結果**

### 参照データ

- `250806/episodes/emotional-outline.jsonld`: 各エピソードの感情計画
- `250806/emotion-benchmark.jsonld`: ベンチマーク（「君の名は。」など）

## 使用方法

### 1. 感情分析の実行

```bash
cd producer

# エピソード構造の分析
pnpm analyze:structure

# 感情分析（Hume AI / fallback）
pnpm analyze:emotions:wattpad

# プロセススコアの算出
pnpm score:emotions:wattpad

# 統合JSON-LDの生成
pnpm integrate:emotion-analysis
```

### 2. 統合データの参照

```typescript
import fs from "node:fs";

const integrated = JSON.parse(
  fs.readFileSync("251022/wattpad/integrated-emotion-analysis.jsonld", "utf8")
);

// EP04の感情分析を取得
const ep04 = integrated["@graph"].find(
  (node: any) => node.episode["@id"] === "gh:Episode/EP04"
);

console.log("Process Score:", ep04.processScore["gh:processScore"]);
console.log("Positive Growth:", ep04.processScore["gh:posGrowth"]);
console.log("Smoothness:", ep04.processScore["gh:smoothness"]);
```

### 3. SHACL検証

```bash
# Apache Jena Shaclを使用
shacl validate \
  --shapes 250806/emotion-analysis.shacl.ttl \
  --data 251022/wattpad/integrated-emotion-analysis.jsonld
```

## 品質基準

### プロセススコア

| レベル | スコア範囲 | 説明 |
|--------|-----------|------|
| Excellent | 0.8-1.0 | 優れた感情プロセス設計 |
| Good | 0.6-0.8 | 良好な感情プロセス |
| Acceptable | 0.4-0.6 | 許容範囲の感情プロセス |
| Needs Improvement | 0.0-0.4 | 改善が必要 |

### 感情成長（posGrowth）

- **推奨**: 0.5以上
- **説明**: positive emotions（relief, joy, hope, trust）が開始から終了まで増加している

### 遷移の滑らかさ（smoothness）

- **推奨**: 0.5以上
- **説明**: 段落間の感情変化が急激でなく、自然な流れを持つ

## 改善例：EP04

### 改善前
- processScore: 0.1826
- posGrowth: 0.0001
- smoothness: 0.64

### 改善後
- **processScore: 0.6448** ✓
- **posGrowth: 0.7228** ✓
- **smoothness: 0.5** ✓

### 実施した改善
1. Part3のsadness部分を短縮
2. relief/hope表現を拡大
3. fallbackEmotions関数のキーワード強化

## SPARQL クエリ例

### 高スコアエピソードの取得

```sparql
PREFIX gh: <https://ghosthacker.junkawasaki.com/gh#>

SELECT ?episode ?score ?growth ?smoothness
WHERE {
  ?analysis a gh:EmotionAnalysis ;
            gh:episode ?episode ;
            gh:hasProcessScore ?ps .
  ?ps gh:processScore ?score ;
      gh:posGrowth ?growth ;
      gh:smoothness ?smoothness .
  FILTER (?score >= 0.6)
}
ORDER BY DESC(?score)
```

### 感情成長が高いエピソード

```sparql
PREFIX gh: <https://ghosthacker.junkawasaki.com/gh#>

SELECT ?episode ?growth ?finalSim
WHERE {
  ?analysis a gh:EmotionAnalysis ;
            gh:episode ?episode ;
            gh:hasProcessScore ?ps .
  ?ps gh:posGrowth ?growth ;
      gh:finalSimilarity ?finalSim .
  FILTER (?growth >= 0.7)
}
ORDER BY DESC(?growth)
```

## 参考文献

- [Hume AI Language API](https://hume.ai/)
- [W3C SHACL](https://www.w3.org/TR/shacl/)
- [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)
- [OWL 2 Web Ontology Language](https://www.w3.org/TR/owl2-overview/)

## ライセンス

このドキュメントとスキーマは、Ghost Hackerプロジェクトの一部です。

