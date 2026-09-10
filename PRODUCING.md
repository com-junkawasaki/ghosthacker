# Producing an episode

`scripts/produce.kotoba` is the command `kotoba-lang/loop-ka-production` invokes for
the `ghosthacker` channel. The split is the loop's, not ours:

| owns | where |
|---|---|
| cadence, admission, verdict, evidence | `loop-ka-production` |
| resident execution (placement, slots, retry) | `kotoba-lang/murakumo` task plane |
| **producing one episode, and reporting what actually ran** | **this repo** |

```bash
nbb --classpath src:../../kotoba-lang/comfyui/src scripts/produce.kotoba arc0-1-origin            # render what is missing
nbb --classpath src:../../kotoba-lang/comfyui/src scripts/produce.kotoba arc0-1-origin --dry-run  # report without rendering
nbb --classpath src:../../kotoba-lang/comfyui/src scripts/produce.kotoba arc0-1-origin --limit 3  # bound a run
nbb --classpath src:../../kotoba-lang/comfyui/src scripts/produce.kotoba arc0-1-origin --force    # redraw already-generated panels
```

Prints one EDN map:

```clojure
{:plan/id "arc0-1-origin" :plan/episode-id "episode:arc0-1-origin"
 :source "260123-jump/resources/episodes/arc0-1-origin/episode.edn"
 :pages 46 :panels 257 :panels-already-generated 255
 :legs {:video [...] :voice [] :bed false :sfx [] :overlays 0}}
```

## The unit is one episode

`production-catalog/*.edn`, one file per episode directory under
`260123-jump/resources/episodes/`. The loop lists that directory, takes the
`.edn` basenames in sorted order as the running order, and passes the next
unconsumed id back as the argument.

| plan id | pages | panels | already generated |
|---|---|---|---|
| `arc0-1-origin` | 46 | 257 | 255 |
| `arc0-2-private-account` | 56 | 273 | 0 |
| `arc0-3-digital-footprint` | 43 | 167 | 0 |
| `260123-cschool-defamation` | 18 | 72 | 0 |
| `260123-cschool-yami-baito` | 18 | 71 | 0 |
| `260125-parent-smartphone-safety` | 32 | 128 | 0 |

Every number is counted by reading the episode, not asserted. Regenerate the
catalog rather than hand-editing it.

`ep1-komawari-redesign` is **not** in the catalog: it has no episode id and zero
panels — it is a layout redesign artifact, not an episode.

## Legs are a report, not an intention

A leg answers the question `evaluate` is actually asking: **does this panel have
a real generated image, or a fallback?**

| panel | leg |
|---|---|
| this run rendered it | `:comfy` |
| it already had an image | `:comfy` — it is not a flat card |
| failed, or never attempted | `:placeholder` |

The middle row is not a claim that this run drew it. `:panels-rendered` /
`:panels-already` / `:panels-failed` / `:panels-skipped` are reported beside the
legs so the breakdown is never inferred from the leg list.

An earlier version derived legs from **whether an env var was set**. That is a
claim about configuration, not about work — it reported served legs for a URL
nothing was listening on.

- **`:video` indexes panels.** The prompt is `:gh/sdxlTags` (joined), falling
  back to `:gh/sdxlPrompt`. `:visual` is the human-facing description and is
  **not** a fallback: substituting it changes what gets drawn.
- **`:voice` is empty.** Dialogue is drawn, not spoken. `loop-ka.evaluate`'s
  `silent-shots` over `[]` is `[]`, so the run is not graded degraded for a leg
  that does not exist. Emitting `:silent` per panel would mark every manga run
  degraded forever for failing to do something it never had to do.
- **`:bed` false, `:sfx` empty** for the same reason, so a run grades `:thin` at
  best with `:no-music-bed` — accurate for a silent format.

## The image backend is ComfyUI, spoken natively

The node-graph builder and client are `comfyui.native` / `comfyui.native-client`
in **kotoba-lang/comfyui** — on the classpath, not copied here. shiropico needs
the same thing, and the same file in two content repos diverges.

This series' craft choices (colour checkpoint, size, sampler) stay here, in
`checkpoint-config`, because they are not the library's to decide.

```
COMFY_URL=http://100.82.98.110:8188   # murakumo fleet head node `gad`, over Tailscale
```

`MURAKUMO_BACKEND_URL` is accepted as a fallback name.

**murakumo.cloud does not serve images.** That Worker proxies
`/api/v1/chat/completions`, `/responses` and `/messages` — text inference only.
The image backend is a ComfyUI on the fleet head node.

This talks ComfyUI's **native** protocol:

```
POST /prompt   {prompt: <node graph>, client_id}  -> {prompt_id}
GET  /history/{prompt_id}                          -> outputs when finished
GET  /view?filename&subfolder&type                 -> the bytes
```

`kotoba-lang/comfyui`'s `comfyui.gateway` speaks the OpenAI-images shape instead
and needs `comfy-openai-bridge` in front of a real ComfyUI. That bridge was
**down** when this was written while ComfyUI itself was **up** — a translating
middle layer that can fail silently is the thing `loop-ka-production` exists to
catch, so this goes native and removes it.

Choices that the episode data does **not** determine live in
`comfy-graph/default-config`, explicitly:

| | value | why |
|---|---|---|
| checkpoint | `Illustrious-XL-v2.0.safetensors` | colour anime SDXL, and one the server reports having |
| size | 832×1216 | manga panels are portrait more often than not |
| steps / cfg | 28 / 5.0 | |
| sampler / scheduler | `euler_ancestral` / `karras` | |

**GHOST HACKER is a colour manga** (owner, 2026-07-31). The colour checkpoint is
the intended choice, not a placeholder waiting on a monochrome/lineart model —
do not "fix" it later by swapping in a greyscale checkpoint or adding
`monochrome` to the negative prompt.

> `:gh/sdxlModel` is `"gpt-4o-mini"` on every panel — the **LLM that wrote the
> prompt**, not an image model. Using it as a checkpoint fails at the server
> with a confusing enum error. A test pins that it is never used as one.

Seeds are derived from the panel, not random, so a re-run of the same panel
reproduces the same image and a retry is distinguishable from a change.

Rendering is **sequential**: the head node runs one ComfyUI on one GPU, so
firing every panel at once would queue them all server-side and lose the ability
to stop early. `--limit N` bounds a run. Panels that already have an image are
skipped unless `--force`.

Rendered PNGs land in `production-out/<plan-id>/` and are **gitignored** — large
binaries stay out of git history, and a run is reproducible from the episode
plus the seed.

## `:gh/pages` is a blob

`episode.edn` is datomize output: a one-entity vector whose `:gh/pages` is a
`pr-str`'d **string**, not a nested value — `schema.edn` explains why (attributes
whose shape varies across files become `:db.type/string` blobs). Reading pages is
two decodes. A reader that treats `:gh/pages` as a collection gets a string's seq
of characters and finds no panels.

> It lives in `scripts/`, not `bin/`, because this repo's `.gitignore` lists
> `bin/` under build artifacts — a file put there is silently not committed.

## Tests

```bash
nbb --classpath src:../../kotoba-lang/comfyui/src:test test/ghosthacker_produce/produce_test.kotoba
```

7 tests / 18 assertions (the graph and seed cases moved to kotoba-lang/comfyui with the code). They pin the blob decode, the empty-pages case, prompt
provenance, that already-generated is not a leg, and that manga has no voice leg.
