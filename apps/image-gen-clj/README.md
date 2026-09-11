# image-gen-clj

Clojure replacement for `apps/image-gen`'s plain txt2img path, per
[ADR-2607131400](../../../../../90-docs/adr/2607131400-ghosthacker-cljc-migration-svelte-go-prune-scoping.md).
Dispatches to `kotoba-lang/murakumo`'s own hardened fleet render client
(`murakumo.infer.gateway`/`.media`/`.fleet`/`.schedule` — SSH-dispatched
against the same GPU fleet used by `gftdcojp/ai-gftd-mangaka`, ~20s/image
on `gad`) rather than talking to the fleet's ComfyUI protocol directly —
that library already has real crash-recovery (consecutive-miss detection,
`/queue` cross-check for a ComfyUI process that crashed and lost its
in-memory queue/history) that an earlier draft of this repo's `image-gen-
clj` duplicated ad hoc, less robustly.

Drop-in on the same port/contract `apps/server`'s Go client already expects
(`IMAGE_GEN_URL`, default `http://localhost:8100`):

```bash
kbb -M:run          # listens on :8100 (or $PORT)
```

Requires `kotoba-lang/murakumo` checked out as a sibling (west layout:
`orgs/kotoba-lang/murakumo`) or `MURAKUMO_ROOT` pointing at it — that repo's
`fleet.edn`/`infer.edn` (SSoT for which nodes exist and which models they
serve) are read from there, not duplicated here.

## Implemented

- `GET /health`
- `POST /generate-panel` — txt2img, style preset (`cinematic_sketch` /
  `mono_manga` / `character_avatar`) + aspect ratio, matching
  `apps/image-gen/config.py`'s presets and `image_generation.go`'s request/
  response JSON shape exactly.

## Known gaps — apps/image-gen (Python) is still needed for these

Verified against the fleet before deciding scope (not guessed):

- **`/generate-cinematic` and `/generate-cinematic-fast`** (2-stage
  photorealistic→anime, and Lightning-fast mode) need
  `SG161222/RealVisXL_V4.0` and `SG161222/RealVisXL_V4.0_Lightning`.
  Confirmed **not present** on the fleet node (`gad` only has
  `animagine-xl-4.0.safetensors`, `waiREALCN_v150.safetensors`,
  `waiREALMIX_v11.safetensors`) — using a different checkpoint would
  silently change output, so this isn't faked here. `apps/server`'s
  `Model == "cinematic"/"cinematic-fast"` path still needs the Python
  service running.
- **IP-Adapter reference-image conditioning** (`reference_image_paths` /
  `ip_adapter_scale`, used for character-consistency). The fleet's ComfyUI
  *does* have an `IPAdapter` node type and a `LoraLoader` node type
  registered, so this is plausibly portable — but wiring the actual graph
  and confirming the `h94/IP-Adapter` weight file is present on the fleet
  wasn't done in this pass. `generate-panel-handler` here logs a warning
  and generates without conditioning if `reference_image_paths` is passed,
  rather than failing outright.
- **`/style-transfer`** (standalone img2img) — not called anywhere in
  `apps/server`'s Go code, so not migrated (dead from the product's POV).
- **`/progress` / `/cancel` / `/lcm`** — these expose in-process Diffusers
  pipeline state (step callback, local model residency) that doesn't map
  onto per-request stateless cloud-murakumo calls. Not implemented; nothing
  in `apps/server` calls them either.

**Do not delete `apps/image-gen/` (Python) until cinematic mode has a real
replacement** — deleting it now would break `Model == "cinematic"` /
`"cinematic-fast"` requests with nothing to fall back to.
