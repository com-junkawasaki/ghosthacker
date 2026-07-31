(ns ghosthacker-produce.legs
  "Pure legs reporting — the shape `loop-ka.evaluate` grades.

  GHOST HACKER is **manga**, so the leg vocabulary applies differently from a
  video channel and that difference is deliberate:

  - `:video` indexes **panels**. A panel is the thing that gets an image, which
    is what a shot is to a video channel.
  - `:voice` is **empty**. There is no narration leg in a manga; dialogue is
    drawn, not spoken. `silent-shots` over `[]` is `[]`, so the run is not
    graded degraded for a leg that does not exist. Emitting `:silent` per panel
    would mark every manga run degraded forever for failing to do something it
    never had to do. `:bed`/`:sfx` are empty for the same reason, so a run
    grades `:thin` at best with `:no-music-bed` — accurate for a silent format.

  ## What a leg means here

  A leg answers the question `evaluate` is actually asking: **does this panel
  have a real generated image, or a fallback?**

  | panel | leg |
  |---|---|
  | this run rendered it | the backend that served it |
  | it already had an image | that backend too — it is not a flat card |
  | failed, or never attempted | `:placeholder` |

  The middle row is the one to be careful about: it is NOT a claim that this run
  drew it. `:panels-rendered` / `:panels-already-generated` / `:panels-failed`
  are reported beside the legs so the breakdown is never inferred from the leg
  list.

  An earlier version derived legs from *whether an env var was set*. That is a
  claim about configuration, not about work, and it reported served legs for a
  URL nothing was listening on."
  (:require [ghosthacker-produce.episode :as episode]))

(defn panel-leg
  "One panel's render outcome -> its leg.

  `outcome` is `{:status :rendered|:already|:failed|:skipped, :backend kw}`."
  [{:keys [status backend]}]
  (case status
    :rendered (or backend :comfy)
    :already  (or backend :comfy)
    :placeholder))

(defn report
  "Per-panel outcomes -> the `:legs` map the loop reads."
  [outcomes]
  {:video (mapv panel-leg outcomes)
   :voice []
   :bed false
   :sfx []
   :overlays 0})

(defn dry-outcomes
  "Panels -> outcomes for a run that renders NOTHING.

  This is what a dry run reports, and also what a node with no reachable
  ComfyUI honestly produces: already-generated panels keep their image,
  everything else is a placeholder because nothing drew it."
  [panels]
  (mapv (fn [p]
          (if (episode/already-generated? p) {:status :already} {:status :skipped}))
        panels))

(defn counts [outcomes]
  {:rendered (count (filter #(= :rendered (:status %)) outcomes))
   :already  (count (filter #(= :already (:status %)) outcomes))
   :failed   (count (filter #(= :failed (:status %)) outcomes))
   :skipped  (count (filter #(= :skipped (:status %)) outcomes))})
