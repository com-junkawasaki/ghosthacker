(ns ghosthacker-produce.legs
  "Pure legs reporting — the shape `loop-ka.evaluate` grades.

  GHOST HACKER is **manga**, so the leg vocabulary applies differently from a
  video channel and that difference is deliberate rather than incidental:

  - `:video` indexes **panels**. A panel is the thing that gets an image, which
    is what a shot is to a video channel.
  - `:voice` is **empty**. There is no narration leg in a manga; dialogue is
    drawn, not spoken. An empty vector is the honest report — `silent-shots`
    over `[]` is `[]`, so the run is not graded degraded for a leg that does not
    exist. Emitting `:silent` per panel instead would permanently mark every
    manga run degraded for failing to do something it never had to do.
  - `:bed` is false and `:sfx` empty for the same reason. The run therefore
    grades `:thin` at best, with `:no-music-bed` as the reason — accurate for a
    silent format, and the channel can pass `:require-bed? false` if that ever
    becomes noise."
  (:require [ghosthacker-produce.episode :as episode]))

(defn image-leg
  "Which image backend actually served this panel.

  `backends` is what the caller could reach, already resolved — this fn does no
  probing, so the caller owns that claim."
  [{:keys [murakumo comfy]} panel]
  (cond
    (not (episode/renderable? panel)) :placeholder
    murakumo :murakumo
    comfy    :comfy
    :else    :placeholder))

(defn report
  "Panels + reachable backends -> the `:legs` map the loop reads."
  [panels {:keys [image]}]
  {:video (mapv #(image-leg image %) panels)
   :voice []
   :bed false
   :sfx []
   :overlays 0})
