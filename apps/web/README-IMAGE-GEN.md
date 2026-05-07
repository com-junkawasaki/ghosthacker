# SDXL Image Generation Pipeline

SvelteKit → ComfyUI (RunPod) で動く storyboard panel image-gen 機構。
AnimagineXL 4.0 + ControlNet Scribble + IP-Adapter Face で
Anifusion ライクな realtime sketch + AI illustration を実現する。

## アーキテクチャ

```
Svelte UI (SketchCanvas)
   │  ペン線 + 設定
   ▼
SvelteKit /api/panels/sdxl-sketch
   │  panel JSONLD から tags / 文脈読み込み
   │  キャラリファレンスを ipa-face 用に crop / 添付
   ▼
ComfyUI HTTP API (RunPod proxy)
   │  workflow JSON (img2img + ControlNet + IPAdapter stack)
   ▼
NVIDIA RTX 6000 Ada Generation (48 GB VRAM)
   │  AnimagineXL 4.0 SDXL inference
   ▼
PNG returned → SvelteKit保存 → /api/images/* で配信 → Canvas overlay
```

## RunPod セットアップ

### 接続情報

| 用途 | 値 |
|---|---|
| ComfyUI HTTP API | `https://vyp99t9px7h4dl-8188.proxy.runpod.net` |
| Web terminal | `https://vyp99t9px7h4dl-19123.proxy.runpod.net/<secret>` |
| SSH (operator only) | `ssh -tt -i ~/.ssh/id_ed25519 vyp99t9px7h4dl-64410aaa@ssh.runpod.io` |
| ComfyUI 設置場所 | `/workspace/runpod-slim/ComfyUI` |

### モデル / LoRA / ControlNet (pod 上)

```
models/checkpoints/
  animagine-xl-4.0.safetensors         (6.5 GB, default)
  animagine-xl-3.1.safetensors         (1.7 GB FP16, classic anime)
  waiREALCN_v150.safetensors           (semi-real)

models/loras/
  sdxl_lightning_4step_lora.safetensors  (Lightning 4-step, 376 MB)

models/controlnet/
  controlnet-scribble-sdxl-1.0.safetensors  (scribble→composition, 2.4 GB)

models/ipadapter/
  ip-adapter-plus-face_sdxl_vit-h.safetensors  (face conditioning, 860 MB)
  ip-adapter-plus_sdxl_vit-h.safetensors       (general/style, 860 MB)

models/clip_vision/
  CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors  (image encoder, 3.4 GB)

models/ultralytics/bbox/face_yolov8m.pt        (50 MB, 未使用)
models/ultralytics/segm/person_yolov8m-seg.pt  (53 MB, 未使用)

custom_nodes/
  ComfyUI_IPAdapter_plus       (IP-Adapter ノード一式)
  ComfyUI-Impact-Pack          (YOLO detection 等、未使用)
  ComfyUI-Manager
  ComfyUI-RunpodDirect
```

### env vars (`.envrc`)

```sh
export SDXL_POD_URL=https://vyp99t9px7h4dl-8188.proxy.runpod.net
export SDXL_DEFAULT_CHECKPOINT=animagine-xl-4.0.safetensors
export SDXL_LIGHTNING_LORA=sdxl_lightning_4step_lora.safetensors
export SDXL_SCRIBBLE_CONTROLNET=controlnet-scribble-sdxl-1.0.safetensors

# OpenAI (SDXL タグ自動生成用、 Anthropic でなく OpenAI gpt-4o-mini を使用)
export OPENAI_API_KEY=...
```

## API エンドポイント

### `POST /api/panels/sdxl-sketch` — リアルタイムスケッチ + AI

**リクエスト**:
```json
{
  "episodeId": "episode:arc0-1-origin",
  "pageNumber": 0,
  "panelIndex": 1,
  "image": "data:image/png;base64,...",        // 統合キャンバス (bg + 線)
  "scribble": "data:image/png;base64,...",     // 線のみ (任意; ControlNet 入力)
  "aiStrength": 70,                              // 10-95、denoise / scribble strength の元
  "style": "Default" | "Lineart" | "Watercolor" | "Anime" | ...,
  "extraPositive": "additional tags",            // 任意
  "checkpoint": "animagine-xl-4.0.safetensors",  // 任意
  "preprocessScribble": "canny" | "lineart" | "scribble" | false, // default canny
  "persist": false,                              // false=preview bytes / true=save to JSONLD
  "seed": 12345                                  // 任意
}
```

**レスポンス** (`persist=false`): 生 PNG バイト
**レスポンス** (`persist=true`): `{ success, imageUrl, seed, durationMs, index }`

#### キャラ自動拡張
パネルの `gh:characters` を読み、`260123-jump/resources/characters/<Name>/reference.png` を IP-Adapter に注入:

| 人数 | 動作 |
|---|---|
| 0 | プロンプトのみ |
| 1 | `IPAdapterAdvanced(face)` 1段、weight 0.7 |
| 2-5 | `IPAdapterAdvanced(face)` を chain で stack、weight `0.55/√N` |

各リファレンスは初回ロード時に `cropFaceRegion(ratio=0.42)` で頭/肩部分のみに crop され、`reference_face.png` としてキャッシュされる。

### `POST /api/panels/sdxl-generate` — 純 text2img (sketch なし)

パネルのタグから直接 1024x1024 を生成。AnimagineXL 4.0 native quality tag (`masterpiece, high score, great score, absurdres`) を末尾に付加し、anti-collage negatives を強制。

### `POST /api/characters/generate-reference` — キャラクター参照画像生成

```json
{ "character": "Yuto", "force": false, "seed": 12345 }
```

`260123-jump/resources/characters/<Name>/profile.jsonld` から AnimagineXL 用プロンプトを構築 → 768x1024 anime ポートレート生成 → `reference.png` 保存。

### `GET /api/characters/generate-reference` — キャラ一覧 + 状態

各キャラの `hasProfile` / `hasAvatar` / `hasReference` を返す。

### `GET /api/panels/move`, `GET /api/panels/update` 等

storyboard data の CRUD (既存)。

## ワークフロー詳細

### img2img + ControlNet + IPA stack (sketch endpoint)

```
CheckpointLoaderSimple
    ├─ MODEL ──→ [LoraLoader (Lightning, optional)] ──→
    │             ├─ MODEL ──→ IPAdapterUnifiedLoader (PLUS FACE)
    │             │                 ├─ MODEL ──→ IPAdapterAdvanced (ref1)
    │             │                 │              └─ ... chain N times
    │             │                 │              ──→ MODEL → KSampler
    │             │                 └─ IPADAPTER ──┘
    │             └─ CLIP ──→ CLIPTextEncode (positive/negative)
    │                                  └─ CONDITIONING → ControlNetApplyAdvanced
    ├─ VAE   ──→ VAEEncode (init image)
    │             └─ LATENT ──→ KSampler (img2img path)
    │             OR
    │             EmptyLatentImage ──→ KSampler (T2I + CN path)
    └─ ──→ ControlNetLoader (scribble) → ControlNetApplyAdvanced
              └─ image: Canny preprocessor (デフォルト)
                            ↑ LoadImage(scribble PNG)

KSampler ──→ VAEDecode ──→ SaveImage
```

### Sampler / Steps 設定

| モード | sampler | scheduler | steps | cfg | denoise |
|---|---|---|---|---|---|
| Lightning + ControlNet | euler | sgm_uniform | 10 | 4 | 1.0 |
| Lightning + img2img | euler | sgm_uniform | 6 | 1.5 | aiStrength/100 |
| Standard + ControlNet | euler_ancestral | karras | 26 | 6 | 1.0 |
| Standard + img2img | euler_ancestral | karras | 25 | 7 | aiStrength/100 |

Sketch endpoint は default で `disableLightning: true` (Standard モード) — Anifusion 同等の品質を優先。

### Quality / Negative プロンプト整形

- `manga panel` / `manga page` → `solo` (Danbooru) に rewrite (page-collage 防止)
- ControlNet active 時は composition tag (`wide shot`, `high angle`, `24mm lens`, `dim streetlight`, `oppressive mood` 等) を strip
- AnimagineXL 4.0 native quality suffix: `masterpiece, high score, great score, absurdres` を末尾に追加
- Default negative (anti-collage 含む):
  ```
  lowres, worst quality, low quality, normal quality, bad anatomy, bad hands,
  4koma, comic, greyscale, monochrome, watermark, signature, jpeg artifacts, logo,
  multiple panels, comic page layout, tiled grid, collage, montage,
  multiple frames, split screen, photograph, photorealistic, 3d render, wings, nsfw
  ```

### Scribble strength

ユーザーの線が結果に literal に出ないよう調整:
```
baseScribbleStrength = 0.45
scribbleStrength     = baseScribbleStrength × 0.6 if IPA active else 0.45
```

## 一括生成スクリプト

### SDXL タグ自動生成
```sh
node apps/web/scripts/generate-sdxl-tags.mjs [--force] [--limit N] [--episode <id>]
```
全パネルから `gh:sdxlTags`, `gh:sdxlNegative`, `gh:sdxlPrompt` を生成し JSONLD に保存。
初回実行 (260123-jump): 18 episodes × 平均 87 panels = 1560 panels, OpenAI gpt-4o-mini で約 5 分、$0.40 程度。

### キャラリファレンス生成
```sh
node apps/web/scripts/generate-character-references.mjs [--force] [--top N] [--only Yuto,Nei]
```
出現頻度上位 N キャラの reference.png を生成。Top 15 で約 2 分。

## ファイル構成

```
apps/web/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── comfyui.ts          # ComfyUI HTTP client + workflow builders
│   │   │   ├── jsonld.ts           # storyboard JSONLD load/save + extract
│   │   │   ├── state.ts            # active project / paths
│   │   │   └── mask.ts             # 領域マスク + face crop (pngjs)
│   │   ├── client/
│   │   │   └── storyboard-client.ts  # browser → /api/* 呼出
│   │   └── types/storyboard.ts
│   ├── routes/
│   │   ├── api/
│   │   │   ├── panels/
│   │   │   │   ├── sdxl-sketch/+server.ts    # メイン sketch + AI
│   │   │   │   ├── sdxl-generate/+server.ts  # text2img
│   │   │   │   ├── update/+server.ts
│   │   │   │   └── move/+server.ts
│   │   │   ├── characters/generate-reference/+server.ts
│   │   │   ├── images/[...path]/+server.ts   # 画像配信
│   │   │   ├── projects/                     # プロジェクト切替
│   │   │   ├── episodes/                     # episode list, panels
│   │   │   ├── arcs/
│   │   │   └── storyboard/+server.ts         # 集約 JSONLD
│   │   └── [...path]/+page.svelte
│   └── components/Storyboard/
│       ├── SketchCanvas.svelte     # ペンキャンバス + AI overlay UI
│       ├── StoryboardPanel.svelte  # パネル表示 + Actions menu
│       └── StoryboardEditor.svelte
└── scripts/
    ├── generate-sdxl-tags.mjs
    └── generate-character-references.mjs
```

## トラブルシューティング

### ComfyUI が立ち上がらない / 応答しない
- 症状: HTTP 502 / タイムアウト
- 原因 1: 起動中。 ComfyUI Manager の registry sync 完了まで 60-90 秒かかる
- 原因 2: 重い custom node (例: `comfyui_controlnet_aux` の mediapipe import) が起動を block
- 対策:
  ```sh
  # SSH login 後
  pkill -9 -f "python.*main.py"
  sleep 5
  cd /workspace/runpod-slim/ComfyUI
  nohup /usr/bin/python3 main.py --listen 0.0.0.0 --port 8188 --enable-cors-header > /tmp/comfy.log 2>&1 &
  disown
  tail -f /tmp/comfy.log
  ```

### RunPod proxy がタイムアウト (内部は OK)
- 症状: pod 内 `localhost:8188` は HTTP 200 だが proxy URL が 000/502
- 原因: ComfyUI 再起動で RunPod proxy のコネクションが切れた
- 対策: 数回 `curl https://...proxy.runpod.net/system_stats` を叩いて wake-up。1-2 分で復活する事が多い

### Lightning LoRA の効果が見えない
- env `SDXL_LIGHTNING_LORA` 設定済か確認
- pod 上で `models/loras/sdxl_lightning_4step_lora.safetensors` 存在を確認
- sketch endpoint は `disableLightning: true` を default で送るため、品質優先で Lightning は使われない仕様

### IP-Adapter で character がキメラ化する (multi-char)
- 既知制約: combined embeds は features を blend する → ハイブリッドキャラが出る
- 対策候補:
  - YOLO bbox 検出 → 領域別に inpaint (Impact-Pack + face_yolov8m が pod 上に揃っている)
  - regional prompting (ConditioningSetArea) で文字通り左右に分割
  - キャラ毎に LoRA を訓練し、prompt で `<lora:yuto:1>` 指定

### 生成画像が manga page collage になる
- 既に default で `manga panel` → `solo` に rewrite しているはず
- それでも出る場合: negative に `multiple panels, tiled grid, collage` 等を強化

## 既知の限界 / TODO

- multi-character の正確な空間配置 (現在は features blend)
- ControlNet Aux preprocessors (HED scribble / lineart) は ComfyUI 起動を hang させたため未導入
- realtime (~1.5 s/regen) は Lightning ON 時のみ可能 — 品質と引き換え
- 自動トレーニング pipeline (キャラ LoRA, project style LoRA) は未実装
- 画像生成中は SketchCanvas が "generating" バッジ以外 UI 全体は使える状態だが、複数 panel 同時生成は GPU で直列化される
