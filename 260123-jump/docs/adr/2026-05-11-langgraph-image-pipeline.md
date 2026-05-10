# ADR — LangGraph TS panel-image generation pipeline

- **Status**: Accepted (2026-05-11)
- **Scope**: Ghost Hacker arc 0-1 origin (45 page + pretitle = 46 entries) panel image generation
- **Reference**: `260419-GH-jump.md` (v2 spec), `story-outline.jsonld`, `episode.jsonld`

## 背景

arc 0-1 の panel 画像 (216 active) を AI 画像生成で量産する必要があった。要件:

1. **キャラ identity の安定** — Ren / Nei / Yuto / Akira / Mei / Saki / nue 等、複数 panel 通して同じキャラに見える
2. **設定 (場所) の安定** — 教室シーンが教室で描かれる、Ren の部屋が捜査壁付き
3. **Jump レベル の表現力** — Naruto / One Piece / Aria / 攻殻機動隊 と同等の cinematic composition
4. **見開き対応** — climax page の double-page-spread
5. **scalable** — 216 panel を 1-2h で生成、再現可能

## 検討した 3 Method × 3 LangGraph パターン

### Method 1: キャラ層 → 背景層 → 機械合成 (sharp.composite)
- Pattern: Graph (deterministic DAG)
- 結果: avg 3.5/10 — char cutout が brittle (white→alpha 漏れ)、合成が depth/lighting blend できず人形貼付け感

### Method 2: 1 枚絵 + agent loop critic
- Pattern: Agent Loop (vision-LLM critique → conditional retry)
- 結果: avg 7.5/10、35s/panel — gpt-image-2 が単一画像で人物+設定を統合的に解釈できる

### Method 3: 3D-proxy (reference 直貼り) + harmonize
- Pattern: PEGEL (plan → parallel execute → assemble → eval)
- 結果: avg 6.0/10 — 設定 2/2 OK だが harmonize 段で identity 0/2 (gpt-image-2 が顔を再描画)

### 採用: Method 2 + ref injection + Phase 3.4 rich schema

## 決定事項

### 1. 画像生成: M2+ref pipeline

**graph-m2.ts** の状態遷移:
```
START
  → plan          (extract setting/visualNote, resolve focused char references)
  → generate      (/v1/images/edits with ref images + Jump-style prompt)
  → critique      (/v1/chat/completions vision: 7-axis rich critique)
  → [conditional] score >= 7 → persist; else iter < 3 → refine → generate
  → persist       (write versioned PNG, append to gh:generatedImages[])
  → END
```

決定根拠:
- gpt-image-2 の `/v1/images/edits` に reference 画像を直接渡せる (face identity 保持)
- vision-LLM critique で setting/character/text-clean drift を機械的に検知
- agent loop で平均 1-2 反復で score 7+ に収束

### 2. Panel decomposition: Phase 3.4 (LLM semantic)

**phase3-4-semantic-panels.ts** が gpt-4o で v2 outline script を panel に分解。

ABSOLUTE 制約:
1. **PARTITION** — script entry 0..N-1 が exactly once カバーされる
2. **COMPRESS** — 連続同 beat はマージ
3. **DIVERSE FOCUS** — 1 character に偏らない
4. **ACTIVE > PASSIVE** — 動いている character が focus
5. **EXPRESSIVE BODY SIGNALS** — concrete physical signals (汗・涙・拳・瞳孔) を必須

Patch loop: coverage incomplete or duplicate を検出したら LLM に CORRECTED full decomposition を要求。

### 3. Rich schema (panel jsonld)

各 panel が以下を持つ:
- `gh:sceneSubject` — 1 行 topic
- `gh:focusCharacter` — 視覚的主役 (1人 or "shared")
- `gh:allCharacters` — 画面内全員
- `gh:focusedCharacters` — reference を inject する対象
- `gh:props` — 物体一覧
- `gh:visualDescription` — 描く内容を 2-3 文で
- `gh:precedingBeat` / `gh:followingBeat` — narrative 連続性
- `gh:visualStyle` — `cinematic-close` / `anime-action` / `film-medium` / `establishing-illustration`
- `gh:tone` — `action` / `emotional` / `quiet` / `triumph` / `tense` / `comedic` / `ominous` / `contemplative`
- `gh:emotionPhysicalSignals` — `[{character, signals[]}]`
- `gh:panelLayout` — `{row, colSpan, rowSpan, size, emphasis, readingOrder}`
- `gh:scriptEntryIndices` — どの v2 entry を覆うか

page にも `gh:pageLayoutV3` (templateName, pageType, spreadWith, emotionalPeak)。

### 4. Visual style + 参照作品 anchoring

各 panel の visualStyle に応じて prompt suffix を変える:

| visualStyle | inspired by | 主な表現 |
|---|---|---|
| `cinematic-close` | 攻殻機動隊・One Piece emotional close | XCU eyes, rim lighting, depth of field |
| `anime-action` | Naruto fight panels, One Piece battle | foreshortening, motion lines, Dutch angle |
| `film-medium` | 押井守攻殻 dialogue, Aria medium shots | rule of thirds, 3-layer depth |
| `establishing-illustration` | Aria establishing pages | 細密背景、weather/light |

### 5. Shot-type 必須要件

Extreme Close Up / Close Up / Medium Shot / Wide Shot / Insert / OTS / POV ごとに、**Naruto/OP/GitS レベル** の composition 要件 (eyes 30% + catchlight + 1 physical signal、3-layer depth、rule of thirds 等) を強制。

### 6. Quality score (MiniMax)

```
Q_p = 0.25·completeness + 0.20·specificity + 0.20·char_distinction
    + 0.15·continuity + 0.10·prop_density + 0.10·visualStyle_clarity

Q_i = 0.25·critic + 0.15·setting + 0.15·char + 0.10·text_clean
    + 0.15·composition + 0.10·expression + 0.10·props_visible

Q_total = 0.5·min(Q_p, Q_i) + 0.3·sqrt(Q_p · Q_i) + 0.2·max(Q_p, Q_i)
```

採用根拠:
- `min` 重みが 50% — 最弱軸が支配的 (両方良くないと高得点取れない)
- 幾何平均 `geo` で中庸を保ち
- `max` 20% で突出した強みを少し評価

threshold:
- Q_total ≥ 0.75 → auto-ship
- 0.55 ≤ Q_total < 0.75 → manual review
- Q_total < 0.55 → auto-regen (max 3 反復)

### 7. インフラ

- **モデル**: `gpt-image-2` 強制 (gpt-image-1 は禁止 throw)
- **画像サイズ**: 1024×1536 portrait (manga panel 比率)
- **quality**: `low` (cost-efficient で十分な品質)
- **vision critic**: `gpt-4o-mini` (response_format json_object)
- **シークレット**: macOS Keychain (`gftd.openai` / `OPENAI_API_KEY`) — 1Password CLI session timeout 回避
- **versioning**: 出力 PNG は `_v{N}.png` (N = 既存 generatedImages.length + 1)
- **history**: episode.jsonld の `gh:generatedImages[]` に append、`gh:currentImageIndex` で最新参照

## 検証結果 (2026-05-11)

- **p1 (8 panel)** rich schema + M2+ref: avg score 8.6/10
- **p2-p10 (64 panel)** rich schema + M2+ref: 64/64 OK, p6 が double-page-spread (with p7) と LLM が Jump 流に判断
- 残課題: 服装 drift (自宅でも学生服)、p7n10 同部屋構図、p6/p7 spread タグ整合

## トレードオフ

- **コスト**: 1 panel あたり ~$0.02-0.04 (gpt-image-2 low + critic) → 216 panel ≈ $4-9
- **時間**: 35-90s/panel → 216 panel ≈ 2-4h
- **キャラ多様性**: focused 1 character まで ref 安定。3+ char ensemble は識別が薄れる傾向
- **見開き**: jsonld には spreadGroup を保存するが、画像生成は単一 panel ずつ (post-typesetting で見開き layout を組む)

## 代替案で却下したもの

- **M1 (layered)**: cutout pipeline が brittle、harmonize で identity を再描画される
- **M3 (3D-proxy)**: 完全 3D 構築は数週間コスト、本作 1 話分には合わない (連載開始時に再評価)
- **OpenRouter Gemini 3 Pro Image**: マルチモーダルだが OpenAI 直接の方が token コスト低・gpt-image-2 安定

## 今後の進化候補

1. **3D-proxy 連載再評価** — 第 2 話以降で character set が固定化したら、Method 3 を再検討 (initial 3D modeling コストを連載で amortize)
2. **動画生成 (Runway/Sora)** — animatic に展開する場合、key frame として M2+ref 画像を使う
3. **panel-level emphasis-aware lighting** — `gh:tone: ominous` panel に automatic dim lighting prompt
4. **multi-character identity locking** — 3+ char ensemble 時に LoRA / per-char masking を導入

## 参考実装

- `scripts/lg-image-gen/README.md` — pipeline 詳細
- `scripts/lg-image-gen/src/graph-m2.ts` — Method 2 graph
- `scripts/lg-image-gen/src/phase3-4-semantic-panels.ts` — Phase 3.4 LLM decompose
- `scripts/lg-image-gen/src/lib/openai.ts` — generate / edit / critique / Q_p / Q_i / combineQ
- `260419-GH-jump.md` — v2 storyboard spec (SSoT)
- `story-outline.jsonld` — v2 script SSoT
