(ns ghosthacker.image-gen.generator
  "Style presets, aspect ratios, and the murakumo-backed panel render — ported
  from apps/image-gen/{config,generator}.py's plain-txt2img path only (see
  ADR-2607131400). Model is fixed to animagine-xl-4.0, the one checkpoint
  confirmed present on the fleet (gad) that also matches the Python
  service's config.MODEL_ID."
  (:require [cloud-murakumo.engine :as murakumo]
            [cloud-murakumo.executor :as murakumo-exec]
            [clojure.java.io :as io]))

(def model "animagine-xl-4.0")

(def default-negative-prompt
  (str "lowres, bad anatomy, bad hands, text, error, missing finger, "
       "extra digits, fewer digits, cropped, worst quality, low quality, "
       "low score, bad score, average score, signature, watermark, username, blurry, "
       "comic strip, manga page, multiple panels, split screen, collage, contact sheet, grid layout, "
       "speech bubble, dialogue balloon, japanese text, kana, kanji, "
       "abstract, metallic, chrome, reflective surface, distorted, melting, "
       "surreal, cubism, geometric shapes, 3d render, CGI, plastic, "
       "chibi, super deformed, exaggerated proportions, overly cute, "
       "dark, horror, gore, grotesque, ugly face, deformed face"))

;; Amano Kozue / Tamura Yumi inspired quiet-body-language house style
;; (Spirit in Physics visual world), matching config.py's CORE_VISUAL_STYLE.
(def core-visual-style
  "manga illustration, anime style, natural eyes, quiet gaze, subtle facial expression, soft luminous lighting, cinematic composition, ")

(def style-presets
  {"cinematic_sketch"
   {:prefix core-visual-style
    :suffix ", masterpiece, best quality, very aesthetic, absurdres, detailed face, soft shading, film grain"}
   "mono_manga"
   {:prefix (str "monochrome manga, black and white, ink drawing, "
                 "screentone shading, detailed pen linework, "
                 "professional Japanese manga art, high contrast, ")
    :suffix ", masterpiece, best quality, absurdres, clean lines, sharp ink strokes, no color, greyscale"}
   "character_avatar"
   {:prefix (str "manga illustration, anime style, character portrait, "
                 "natural face, quiet gaze, "
                 "Amano Kozue soft atmosphere, clean background, "
                 "upper body, looking at viewer, ")
    :suffix ", masterpiece, best quality, very aesthetic, absurdres, sharp focus, soft lighting"}})

(def default-style "cinematic_sketch")

;; width x height, multiples of 8, 768px base — matches config.ASPECT_RATIOS.
(def aspect-ratios
  {"16:9" [1216 688]
   "9:16" [688 1216]
   "1:1"  [1024 1024]
   "4:3"  [1152 864]
   "3:4"  [864 1152]
   "3:2"  [1152 768]
   "2:3"  [768 1152]})

(def default-aspect-ratio "16:9")

(defn full-prompt [style prompt]
  (let [{:keys [prefix suffix]} (get style-presets style (get style-presets default-style))]
    (str prefix prompt suffix)))

(defn dims [aspect-ratio]
  (get aspect-ratios aspect-ratio (get aspect-ratios default-aspect-ratio)))

(defn- murakumo-attempt [backend-url {:keys [prompt negative width height seed]}]
  (let [job {:gen.job/engine :comfy
             :gen.job/model model
             :gen.job/input {:prompt prompt :refs []
                             :params (cond-> {:width width :height height}
                                       (seq negative) (assoc :negative negative)
                                       seed (assoc :seed seed))}}
        inv (-> (murakumo/invocation job) (assoc-in [:backend :url] backend-url))
        {:keys [outputs]} (murakumo-exec/execute inv)
        bytes (.readAllBytes (io/input-stream (io/file (first outputs))))]
    {:image-bytes bytes :seed (or seed 0)}))

(defn backend-url []
  (or (System/getenv "MURAKUMO_COMFY_URL") (System/getenv "COMFY_URL") "http://100.82.98.110:8188"))

(defn generate-panel
  "txt2img panel render via cloud-murakumo. `style` and `aspect-ratio` match
  the Python service's /generate-panel preset names. `seed` nil → let the
  fleet pick one (recorded as 0, same as mangaka.comfy's convention — the
  fleet node doesn't currently echo back a server-chosen seed).
  IP-Adapter reference images (`reference-image-paths`) are NOT applied —
  known gap, see README; the panel still renders, just without character-
  reference conditioning. Retries once on the fleet's known transient
  'completed with empty output' glitch before giving up."
  [{:keys [prompt style aspect-ratio seed]}]
  (let [[w h] (dims aspect-ratio)
        spec {:prompt (full-prompt style prompt) :negative default-negative-prompt
              :width w :height h :seed seed}
        url (backend-url)]
    (try
      (murakumo-attempt url spec)
      (catch Exception _e1
        (murakumo-attempt url spec)))))
