# Producing an episode

`scripts/produce.cljs` is the command `kotoba-lang/loop-ka-production` invokes for
the `ghosthacker` channel. The split is the loop's, not ours:

| owns | where |
|---|---|
| cadence, admission, verdict, evidence | `loop-ka-production` |
| resident execution (placement, slots, retry) | `kotoba-lang/murakumo` task plane |
| **producing one episode, and reporting what actually ran** | **this repo** |

```bash
nbb --classpath src scripts/produce.cljs arc0-1-origin
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

`:legs` names **what actually served each leg**, which is the one thing the loop
cannot find out for itself.

- **`:video` indexes panels.** A panel is what gets an image, which is what a
  shot is to a video channel. The prompt is `:gh/sdxlPrompt` — `:visual` is the
  human-facing description and is not a substitute, since feeding it to a model
  would silently change what gets drawn.
- **`:voice` is empty.** There is no narration leg in a manga; dialogue is drawn,
  not spoken. `loop-ka.evaluate`'s `silent-shots` over `[]` is `[]`, so the run
  is not graded degraded for a leg that does not exist. Emitting `:silent` per
  panel would permanently mark every manga run degraded for failing to do
  something it never had to do.
- **`:bed` false, `:sfx` empty** for the same reason. A run therefore grades
  `:thin` at best, with `:no-music-bed` as the reason — accurate for a silent
  format. The channel can pass `:require-bed? false` if that becomes noise.

With no image backend configured every panel is `:placeholder`, the loop grades
`:degraded`, and it holds instead of publishing.

`:panels-already-generated` is **prior state, not a leg**. A panel that already
carries an image from an earlier run says nothing about what this run did, so it
is reported as a count beside the legs rather than as a leg value.

## Backends

| var | serves |
|---|---|
| `MURAKUMO_BACKEND_URL` | panel images |
| `COMFY_URL` | panel images |

Presence of a URL is taken as reachability. That is an assumption and the weakest
link here: an unreachable URL is reported as a served leg. On the murakumo task
plane the node's own `:requires` gate is what establishes the capability.

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
nbb --classpath src:test test/ghosthacker_produce/produce_test.cljs
```

7 tests / 17 assertions. They pin the blob decode, the empty-pages case, prompt
provenance, that already-generated is not a leg, and that manga has no voice leg.
