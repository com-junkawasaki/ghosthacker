# Image Generation Pipeline

Storyboard panel image generation with multiple engines and editing flows.

```
SvelteKit (browser)
   │
   ▼
SvelteKit /api/panels/* routes
   │
   ├─ engine='openai' ──► OpenAI gpt-image-2 (→ gpt-image-1 fallback)
   │
   └─ engine='sdxl'  ──► ComfyUI HTTP (RunPod)
                         │
                         ▼
                    NVIDIA RTX 6000 Ada (48 GB)
                    9 anime SDXL checkpoints
                    + IP-Adapter Plus Face / Plus
                    + ControlNet Scribble SDXL
                    + Lightning 4-step LoRA
                    + (YOLOv8 person/face detector, unused)
```

**Default engine = OpenAI gpt-image** (cloud, manga-style, ~$0.04/image).
**SDXL** (free, faster, scribble + character-ref aware) is opt-in per panel.

## Engines

### OpenAI gpt-image (default)
- Model: `gpt-image-2` requested first, falls back to `gpt-image-1` on `403` (organization not yet verified).
- Single-pass cloud generation — no scribble / IPA / ControlNet, just prompt → image.
- Used for: `Generate Image` button, default `Sketch AI` overlay engine, `Edit Image` modal.
- Strips SDXL-specific scaffolding (`masterpiece, high score, …`, `solo`, Danbooru `1boy/1girl`) before sending.

### SDXL (ComfyUI on RunPod)
- 9 checkpoints installed on the pod (see Checkpoint Catalog below).
- Per-checkpoint optimal config: steps / CFG / sampler / scheduler / Pony score tags / V-prediction handling — see `apps/web/src/lib/server/checkpoint-config.ts`.
- Optional layers: ControlNet Scribble, IP-Adapter Plus Face (character consistency), Lightning LoRA (4-step fast preview), Canny preprocessor, refine pass.

## RunPod setup

| | |
|---|---|
| ComfyUI HTTP API | `https://vyp99t9px7h4dl-8188.proxy.runpod.net` |
| Web terminal | `https://vyp99t9px7h4dl-19123.proxy.runpod.net/<secret>` |
| SSH | `ssh -tt -i ~/.ssh/id_ed25519 vyp99t9px7h4dl-64410aaa@ssh.runpod.io` |
| ComfyUI install | `/workspace/runpod-slim/ComfyUI` |
| Network volume | `comfyui-gftd-6000ada` (250 GB, extended via REST API) |

### Resizing the volume (if you hit `Disk quota exceeded`)
```sh
curl -X PATCH https://rest.runpod.io/v1/networkvolumes/p9riuzhrvf \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"size":250}'
```

### Checkpoint catalog (`models/checkpoints/`)

| File | Family | Steps | CFG | Sampler | Scheduler | Notes |
|---|---|---|---|---|---|---|
| `animagine-xl-4.0.safetensors` | animagine | 28 | 5 | euler_ancestral | karras | Default, latest Animagine |
| `animagine-xl-3.1.safetensors` | animagine | 28 | 5 | euler_ancestral | karras | FP16 (1.7 GB), classic look |
| `aamXL_AnyMix_v10.safetensors` | sdxl | 25 | 6 | dpmpp_2m | karras | Generic anime mix |
| `BAXL_v3.safetensors` | animagine | 28 | 6 | euler_ancestral | karras | Blue Archive flat-cel style |
| `hassakuXL_Illustrious_v34.safetensors` | illustrious | 28 | 5 | euler_ancestral | normal | Illustrious base |
| `manmaruMixNoob.safetensors` | illustrious | 28 | 5 | euler_ancestral | normal | NoobAI/Illustrious mix |
| `eponaMix_v3.safetensors` | pony | 25 | 7 | dpmpp_2m_sde | karras | **Pony**: auto-prepends `score_9, score_8_up, score_7_up, source_anime` to positive |
| `anythingXL.safetensors` | sdxl | 25 | 6 | euler_ancestral | karras | "Anything XL" fork |
| `noobaiXL_Vpred10.safetensors` | illustrious | 28 | 5 | euler_ancestral | normal | **V-prediction**: workflow auto-injects `ModelSamplingDiscrete(v_prediction)` |
| `waiREALCN_v150.safetensors` | sdxl | – | – | – | – | Semi-real (legacy, not used in anime pipeline) |

### Other models on pod

```
models/loras/
  sdxl_lightning_4step_lora.safetensors          (4-step Lightning, 376 MB)

models/controlnet/
  controlnet-scribble-sdxl-1.0.safetensors        (xinsir scribble, 2.4 GB)

models/ipadapter/
  ip-adapter-plus-face_sdxl_vit-h.safetensors     (face conditioning, 860 MB)
  ip-adapter-plus_sdxl_vit-h.safetensors          (general/style, 860 MB)

models/clip_vision/
  CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors     (encoder for IP-Adapter, 3.4 GB)

models/ultralytics/
  bbox/face_yolov8m.pt                            (50 MB, currently unused)
  segm/person_yolov8m-seg.pt                      (53 MB, currently unused)

custom_nodes/
  ComfyUI_IPAdapter_plus
  ComfyUI-Impact-Pack
  ComfyUI-Manager
  ComfyUI-RunpodDirect
```

## Environment (`.envrc`)

```sh
# RunPod ComfyUI proxy
export SDXL_POD_URL=https://vyp99t9px7h4dl-8188.proxy.runpod.net
export SDXL_DEFAULT_CHECKPOINT=animagine-xl-4.0.safetensors

# Add-ons (auto-detected, optional)
export SDXL_LIGHTNING_LORA=sdxl_lightning_4step_lora.safetensors
export SDXL_SCRIBBLE_CONTROLNET=controlnet-scribble-sdxl-1.0.safetensors

# OpenAI image generation (default engine)
export OPENAI_API_KEY=...
export OPENAI_IMAGE_MODEL=gpt-image-2     # falls back to gpt-image-1 on 403

# Civitai (for one-shot model downloads)
export CIVITAI_TOKEN=...

# RunPod REST API (volume resize, pod info)
export RUNPOD_API_KEY=rpa_...

# OpenRouter (for SDXL tag generation script)
export OPENROUTER_APIKEY=...      # currently broken — script falls back to OpenAI
```

## API endpoints

### `POST /api/panels/sdxl-sketch` — main sketch / generate
Body:
```ts
{
  episodeId, pageNumber, panelIndex,
  image: string,                    // base64 PNG (data URL or raw)
  scribble?: string,                // separate strokes-only PNG (SDXL only)
  engine?: 'openai' | 'sdxl',       // default 'openai'
  aiStrength?: number,              // 10-95 (SDXL only); maps to denoise + scribble strength
  style?: string,                   // 'Default' | 'Lineart' | 'Watercolor' | ... (SDXL style preset)
  extraPositive?: string,
  checkpoint?: string,              // SDXL only; defaults to env SDXL_DEFAULT_CHECKPOINT
  preprocessScribble?: 'canny'|'lineart'|'scribble'|false,  // default 'canny'
  refine?: boolean,                 // SDXL polish pass (low denoise + 30 steps)
  refineDenoise?: number,           // 0.2-0.6
  refineSteps?: number,
  persist?: boolean,                // false = preview bytes; true = save to JSONLD
  seed?: number
}
```

#### Engine routing
- `engine: 'openai'` → strip SDXL scaffolding → call OpenAI image generation → return PNG.
- `engine: 'sdxl'` → ComfyUI img2img with optional ControlNet (scribble) + IP-Adapter Plus Face (character refs) + Lightning LoRA + per-checkpoint config.

#### Auto character handling (SDXL only)
Reads `gh:characters` on the panel, loads `260123-jump/resources/characters/<Name>/reference.png` (auto-cropped to face square via `mask.ts:cropFaceRegion`, cached as `reference_face.png`):
- 1 character → `IPAdapterAdvanced(face)` weight 0.7
- 2-5 characters → chained `IPAdapterAdvanced` per ref, weight `0.55/√N`

### `POST /api/panels/sdxl-generate` — pure SDXL text2img
Plain `tags → 1024 image` via AnimagineXL native sampler (no scribble / no IPA). Used by the `AnimagineXL 4.0 (Local SDXL)` option in the panel dropdown.

### `POST /api/panels/sdxl-compare` — checkpoint comparison
Body: `{ episodeId, pageNumber, panelIndex, image, scribble?, aiStrength, checkpoints: string[] }`
Sequentially generates the same panel through every checkpoint with each one's optimal config (per `checkpoint-config.ts`). External engines (`openai/gpt-image-1`) supported via the `/` prefix. Returns `{ results: [{ checkpoint, imageBase64, durationMs, error? }] }`.

### `POST /api/panels/edit-image` — OpenAI image-edit
Body: `{ episodeId, pageNumber, panelIndex, prompt, sourceImage?, sourceVersionIndex?, persist }`
Loads the panel's current image (or `sourceVersionIndex` from `gh:generatedImages`, or inline `sourceImage` base64), sends to `https://api.openai.com/v1/images/edits` with the natural-language `prompt`, returns edited PNG. Same gpt-image-2 → gpt-image-1 fallback.

### `POST /api/characters/generate-reference` — character portrait
Generates `reference.png` for a character from `profile.jsonld` using AnimagineXL.

### `GET /api/images/[...path]` — image serving
Serves files under `<project>/resources/images/`.

## UI

### Panel actions (`StoryboardPanel.svelte`)
- **Generate Image** — uses the dropdown's selected engine (default: OpenAI gpt-image)
- **Sketch AI** — opens the SketchCanvas overlay
- **Edit Image** — text-prompt edit modal (left = source, right = preview, OpenAI)
- **Dialogue AI / Quick Dialogue / Edit Panel** — existing flows

Engine dropdown options:
- `OpenAI gpt-image (cloud, default)` — default
- `AnimagineXL 4.0 (Local SDXL)`
- `SeedReam 4.5 (API)` — stub

### SketchCanvas (`SketchCanvas.svelte`)
- Engine selector at top — `OpenAI` or `SDXL`
- AI Strength slider (SDXL only) + Overlay opacity
- Brush / eraser / undo / clear / color picker / size
- Style chips (SDXL): Default / None / Lineart / Watercolor / Oil painting / Anime / 3D render / Photoreal / Pencil sketch
- Tag chips with × delete
- Floating buttons on canvas:
  - **Refine** — polish pass (30 steps, low denoise, ~30 s)
  - **Compare** — runs all 9 SDXL checkpoints + OpenAI in a 3-column grid
  - **Bake** — flatten preview into base, clear strokes
- Auto-regenerate after each stroke (debounced 400 ms)
- Save as new version → automatic refine pass before persisting

### Compare modal
3-column grid, each tile shows:
- Image (click → set as new preview)
- Top overlay: short label (`Animagine XL`, `Hassaku XL`, etc.)
- Bottom overlay: full filename + duration

External engines (`openai/gpt-image-1`) included as additional tiles.

## Per-checkpoint configuration

`apps/web/src/lib/server/checkpoint-config.ts` table:

```ts
{
  steps, cfg, sampler, scheduler,
  positivePrefix?,    // Pony score tags etc.
  negativeAppend?,
  isVpred?,           // adds ModelSamplingDiscrete(v_prediction)
  family: 'animagine' | 'illustrious' | 'pony' | 'sdxl'
}
```

Each generation pulls these defaults unless the request overrides. Compare runs use them automatically per tile.

## Bulk scripts

```sh
# Generate SDXL tags for every panel in 260123-jump (idempotent, ~5 min, ~$0.40 via gpt-4o-mini)
node apps/web/scripts/generate-sdxl-tags.mjs [--force] [--limit N] [--episode <id>]

# Generate AnimagineXL anime portraits for top-N characters (auto cache as reference.png)
node apps/web/scripts/generate-character-references.mjs [--force] [--top N] [--only Yuto,Nei]
```

## Troubleshooting

### `Disk quota exceeded` on the pod
- Symptom: ComfyUI `/upload/image` returns 500, `OSError: [Errno 122]`.
- Fix: extend the network volume via the REST API (see top), then verify with a `dd` write test from SSH.

### ComfyUI hung / proxy timing out
- Symptom: `localhost:8188/system_stats` from inside pod returns 200 but the proxy URL times out, or both hang.
- Fix:
  ```sh
  pkill -9 -f "python.*main.py"
  sleep 5
  cd /workspace/runpod-slim/ComfyUI
  nohup /usr/bin/python3 main.py --listen 0.0.0.0 --port 8188 --enable-cors-header > /tmp/comfy.log 2>&1 &
  ```
  Wait 60-90 s for ComfyUI Manager registry sync, then poll `system_stats` until 200.

### `gpt-image-2` returns 403
- Cause: organization not yet verified at OpenAI.
- Fix: visit https://platform.openai.com/settings/organization/general → Verify Organization. Wait 15-60 min.
- Until verified, all OpenAI generations fall back to `gpt-image-1` (logs `[openai] gpt-image-2 unavailable (403). Falling back to gpt-image-1.`).

### Civitai partial downloads
- Civitai sometimes truncates large checkpoint downloads at 1-3 GB.
- Use `curl -L -f -C - --connect-timeout 30 --max-time 1800` and **download serially** (parallel downloads saturate the pod's bandwidth).
- Wrap in a retry loop checking final size > 6000 MB.

### Multi-character "chimera" output
- IP-Adapter `combined embeds` blends features. `Yuto + Akira` may produce a hybrid face.
- Mitigation paths (not yet implemented): YOLOv8 face detection (`face_yolov8m.pt` is on the pod) → per-bbox inpaint with each character ref. Or train per-character LoRAs.

## File structure

```
apps/web/
├── src/
│   ├── lib/server/
│   │   ├── comfyui.ts                  # ComfyUI HTTP client + workflow builders
│   │   ├── checkpoint-config.ts        # per-model defaults (steps, sampler, Pony tags, Vpred)
│   │   ├── external-image-gen.ts       # OpenAI gpt-image generate + edit adapters
│   │   ├── jsonld.ts                   # storyboard JSONLD I/O + extract
│   │   ├── state.ts                    # active project / paths
│   │   └── mask.ts                     # region masks + face crop (pngjs)
│   ├── lib/client/storyboard-client.ts
│   ├── routes/api/
│   │   ├── panels/
│   │   │   ├── sdxl-sketch/+server.ts        # main sketch + AI (engine routing)
│   │   │   ├── sdxl-generate/+server.ts      # pure SDXL text2img
│   │   │   ├── sdxl-compare/+server.ts       # multi-checkpoint comparison
│   │   │   ├── edit-image/+server.ts         # OpenAI image-edit
│   │   │   ├── update/+server.ts
│   │   │   └── move/+server.ts
│   │   ├── characters/generate-reference/+server.ts
│   │   ├── images/[...path]/+server.ts
│   │   ├── projects/, episodes/, arcs/, storyboard/
│   └── components/Storyboard/
│       ├── SketchCanvas.svelte         # canvas + AI overlay + Compare grid
│       └── StoryboardPanel.svelte      # panel UI + Edit Image modal
└── scripts/
    ├── generate-sdxl-tags.mjs
    └── generate-character-references.mjs
```
