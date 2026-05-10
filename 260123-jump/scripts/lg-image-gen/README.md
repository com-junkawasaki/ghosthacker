# lg-image-gen — LangGraph TS panel generation pipeline

Ghost Hacker arc 0-1 の panel 画像を、LangGraph TS で構築した M2+ref パイプラインで生成・採点・反復改善するツール群。

## 概要

manga panel 1 枚を LangGraph state graph として:
1. `plan` — manifest から rich-schema fields を読み込み、character references を解決
2. `generate` — `/v1/images/edits` (gpt-image-2) に reference 画像 + Jump-style prompt を渡して生成
3. `critique` — `/v1/chat/completions` (gpt-4o-mini-vision) で 7 軸採点
4. `refine` (条件付き) — score < threshold なら critique notes を反映して prompt 再構成 → retry (max 3)
5. `persist` — versioned PNG (`_v{N}.png`) + episode.jsonld への panel 履歴 append

## 依存

- Node 22+ / npm (sharp, @langchain/langgraph, @langchain/core)
- `OPENAI_API_KEY` 必須 (Apple Keychain 推奨: `gftd.openai` / `OPENAI_API_KEY`)
- `gpt-image-1` は禁止 (環境変数で `gpt-image-2` 強制チェック)

## ディレクトリ

```
scripts/lg-image-gen/
├── package.json
├── tsconfig.json
├── README.md (このファイル)
└── src/
    ├── lib/
    │   ├── openai.ts          — generate / edit / critique + Q_p / Q_i / combineQ
    │   └── refs.ts            — pickVariant / refPath / characterDescriptor / extractSetting
    ├── graph.ts               — Method 1 (1-stage) — 旧 fallback
    ├── graph-3stage.ts        — Method 1-bis (3-stage bg-composite)
    ├── graph-m1.ts            — Method 1 alt (layered + sharp composite)
    ├── graph-m2.ts            — Method 2 (1枚絵 + agent loop critic)  ★ 本番
    ├── graph-m3.ts            — Method 3 (3D-proxy PEGEL)
    ├── compare.ts             — 3 method 同時比較ランナー
    ├── phase3-4-semantic-panels.ts  — LLM-based semantic panel decomposition (Jump-style + 見開き対応)
    └── run.ts                 — manifest を受け取って panel 単位で graph 実行
```

## クイックスタート

```bash
# Apple Keychain に OpenAI key 保存 (一度だけ)
security add-generic-password -s "gftd.openai" -a "OPENAI_API_KEY" -w "sk-..."

# 単一 panel 生成
export OPENAI_API_KEY=$(security find-generic-password -s "gftd.openai" -a "OPENAI_API_KEY" -w)
cd scripts/lg-image-gen
npx tsx src/run.ts --pipeline m2ref --panel-id panel:p1n8-v3

# page 単位
npx tsx src/run.ts --pipeline m2ref --page 1

# 未生成 panel のみ (resume)
npx tsx src/run.ts --pipeline m2ref --only-pending
```

## オプション

| flag | 用途 |
|---|---|
| `--pipeline 1-stage \| 3-stage \| m2ref` | パイプライン選択 (本番は m2ref) |
| `--panel-id panel:pNnX-v3` | 単一 panel |
| `--page N` | page 単位 |
| `--limit N` | 先頭 N 件のみ |
| `--only-pending` | episode.jsonld で `gh:needsImageGeneration: true` の panel のみ |
| `--delay-ms N` | call 間 sleep (rate-limit 回避、default 1500) |
| `--dry-run` | API を呼ばず prompt 構築だけ確認 |

## panel jsonld schema (Phase 3.4 rich)

```json
{
  "@id": "panel:p1n8-v3",
  "shot": "Wide Shot",
  "visual": "Akira proudly displays a pair of bright limited edition sneakers...",
  "characters": ["character:Akira", "character:Mei", "character:Saki"],
  "dialogue": [{"speaker": "Akira", "text": "見てくれ。ついに、限定モデル"}, ...],
  "gh:sceneSubject": "Akira reveals limited-edition sneakers",
  "gh:focusCharacter": "Akira",
  "gh:allCharacters": ["Akira", "Mei", "Saki"],
  "gh:focusedCharacters": ["Akira"],
  "gh:props": ["limited-edition sneakers", "shoe box"],
  "gh:visualDescription": "Akira holds the open shoe box, lifting one sneaker...",
  "gh:precedingBeat": "Yuto observes Ren and Nei's exchange across the room",
  "gh:followingBeat": "Mei and Saki react with surprise to the reveal",
  "gh:scriptEntryIndices": [16, 17, 18, 19, 20, 21],
  "gh:visualStyle": "anime-action",
  "gh:tone": "triumph",
  "gh:emotionPhysicalSignals": [
    {"character": "Akira", "signals": ["wide grin", "raised arm", "sparkle effect"]},
    {"character": "Mei", "signals": ["dilated pupils", "hands clasped"]}
  ],
  "gh:panelLayout": {
    "gh:row": 4, "gh:colSpan": 3, "gh:rowSpan": 1,
    "gh:size": "large", "gh:emphasis": "punchline", "gh:readingOrder": 8
  }
}
```

## page jsonld schema (Phase 3.4 rich)

```json
{
  "gh:pageNumber": 6,
  "gh:pageTitle": "Renの部屋、事件の全体（捜査壁）",
  "gh:pageLayoutV3": {
    "gh:templateName": "Jump 6-panel build-and-release",
    "gh:totalRows": 3,
    "gh:gridDescription": "Build small panels then release with a spread...",
    "gh:pageType": "double-page-spread",
    "gh:spreadWith": 7,
    "gh:emotionalPeak": "Ren stands before the 7-year investigation wall",
    "gh:notes": "Spread emphasizes the physical scale of Ren's pursuit"
  }
}
```

## Quality scoring (Q_p / Q_i / Q_total)

```
Q_p = 0.25·completeness + 0.20·specificity + 0.20·char_distinction
    + 0.15·continuity + 0.10·prop_density + 0.10·visualStyle_clarity

Q_i = 0.25·critic + 0.15·setting + 0.15·char + 0.10·text_clean
    + 0.15·composition + 0.10·expression + 0.10·props_visible

Q_total = 0.5·min(Q_p, Q_i) + 0.3·sqrt(Q_p · Q_i) + 0.2·max(Q_p, Q_i)

Threshold:
  Q_total >= 0.75 → auto-ship
  0.55 <= Q_total < 0.75 → manual review
  Q_total < 0.55 → auto-regen (max 3 iter)
```

詳細は ADR-2026-05-11-langgraph-image-pipeline 参照。

## Phase 3.x 履歴

- **Phase 2** — episode.jsonld 構造を v2 outline (260419-GH-jump.md) に整合
- **Phase 3.1** — image-gen-manifest.json 生成、初期 32 placeholder
- **Phase 3.2** — granularity merge (1 entry/panel → 5/panel 平均)
- **Phase 3.3** — same-page rescue (v1 ≈ v2 タイトルで rescue)
- **Phase 3.3b** — cross-page rescue (v1 番号ずれ救出)
- **Phase 3.4** — semantic panel decomposition via LLM (Jump-style layout + 見開き)

## 参考実装の判断

3 method 比較 (詳細: ADR):
- ✗ M1 (layered) — sharp composite が brittle、char regen が drift
- ✓ M2+ref (agent loop) — 平均 score 7.5+、35-50s/panel
- △ M3 (PEGEL/3D-proxy) — 設定安定だが harmonize が identity 破壊

採用: **M2+ref + Phase 3.4 rich-schema + Q-score gate**

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `OPENAI_API_KEY not set` | 環境変数未 export | `export OPENAI_API_KEY=$(security find-generic-password -s "gftd.openai" -a "OPENAI_API_KEY" -w)` |
| `gpt-image-1 is forbidden` | 旧モデル参照 | `LG_IMAGE_MODEL=gpt-image-2` |
| `billing_hard_limit_reached` | OpenAI org の hard limit | Platform Settings → Billing → Limits を引き上げ |
| `image is overwritten` (履歴消失) | 旧 run.ts (versioning なし) | 最新版は `_v{N}.png` で auto-versioning |
| 1Password CLI `authorization timeout` | session 切れ | Apple Keychain 経由に切替 (推奨) |
