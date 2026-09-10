(ns ghosthacker.image-gen.generator
  "Style presets, aspect ratios, and the panel render — ported from
  apps/image-gen/{config,generator}.py's plain-txt2img path only (see
  ADR-2607131400). The actual fleet dispatch delegates to kotoba-lang/
  murakumo (murakumo.infer.gateway/media/fleet/schedule) rather than
  talking to cloud-murakumo directly — that library already has real
  crash-recovery (murakumo.infer.media's consecutive-miss detection,
  /queue cross-check) that an earlier draft of this file duplicated ad
  hoc. Model defaults to animagine-xl-4.0, matching the Python service's
  config.MODEL_ID and confirmed resident on the fleet's `gad` node.

  Host-injected filesystem: the produced PNG bytes are read back through
  kotoba-lang/fs's host-injected `IFilesystem` protocol rather than
  touching `clojure.java.io` directly — the kotoba lib stays pure, and
  this consumer (the JVM app) supplies the real-file host (`host-fs`,
  defined below) that adapts `fs/read-bytes` to `java.io`'s
  `.readAllBytes` (masked to unsigned [0..255]). The `update-on-start`
  base64 side (server.clj) uses kotoba.bytes."
  (:require [kotoba.lang.fs :as fs]
            [murakumo.fleet :as fleet]
            [murakumo.infer.media :as media]
            [murakumo.infer.schedule :as sched]
            [clojure.java.io :as io]))

(def default-checkpoint "animagine-xl-4.0.safetensors")

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

(defn- murakumo-root
  "Absolute path to the kotoba-lang/murakumo checkout (holds fleet.edn/
  infer.edn, read relative-to-cwd by murakumo.fleet/load-fleet — this repo
  doesn't run FROM that directory, so the path is resolved explicitly
  rather than assumed). Override with MURAKUMO_ROOT; defaults to the west
  layout's sibling path (orgs/kotoba-lang/murakumo, 4 levels up from this
  file's own repo root — see deps.edn's :local/root for the same path).
  Resolved with kotoba-lang/fs path ops (lexical — no java.io)."
  []
  (or (System/getenv "MURAKUMO_ROOT")
      (fs/normalize
       (fs/join (System/getProperty "user.dir")
                "../../../../kotoba-lang/murakumo"))))

;; Real-file host adapter for kotoba.lang.fs/IFilesystem. This is the ONE
;; place this consumer is allowed to touch java.io — the host lives in the
;; JVM app, and the kotoba-lang/fs lib itself stays pure. read-bytes masks
;; java's signed bytes to unsigned [0..255] to match the protocol contract.
(def host-fs
  (reify fs/IFilesystem
    (read       [_ path] (slurp path))
    (read-bytes [_ path]
      (with-open [s (io/input-stream path)]
        (mapv #(bit-and % 0xFF) (map byte (seq (.readAllBytes s))))))
    (write      [_ path content] nil)
    (list       [_ path] [])
    (exists?   [_ path] false)
    (delete     [_ path] (io/delete-file path true) nil)))

(defn- fleet-edn-path [] (str (murakumo-root) "/fleet.edn"))

(defn generate-panel
  "txt2img panel render via kotoba-lang/murakumo's fleet-dispatch client.
  `style` and `aspect-ratio` match the Python service's /generate-panel
  preset names. `seed` nil → murakumo.infer.media/txt2img-workflow's own
  default seed (deterministic, not random — matches that library's
  reproducibility contract, unlike the Python service's random-per-call
  default).
  IP-Adapter reference images (`reference-image-paths`) are NOT applied —
  known gap, see README; the panel still renders, just without character-
  reference conditioning."
  [{:keys [prompt style aspect-ratio seed]}]
  (let [[w h] (dims aspect-ratio)
        f (fleet/enrich (fleet/load-fleet (fleet-edn-path)))
        live (media/live-fleet f)
        wanted {:model/engine :comfyui :model/checkpoint default-checkpoint}
        node-info (or (sched/pick live wanted)
                      (throw (ex-info "no eligible murakumo fleet node for animagine-xl-4.0" {:live-count (count live)})))
        node (or (first (filter #(= (:name node-info) (:name %)) (:nodes f)))
                 (throw (ex-info "picked node not found in fleet.edn" {:node (:name node-info)})))
        hist (media/run-job! node :image (cond-> {:prompt (full-prompt style prompt)
                                                   :negative default-negative-prompt
                                                   :ckpt default-checkpoint
                                                   :width w :height h}
                                            seed (assoc :seed seed)))
        filename (get-in hist [:outputs :7 :images 0 :filename])]
    (when-not filename
      (throw (ex-info "murakumo render produced no output file" {:history hist :node (:name node-info)})))
    (let [local (str "murakumo-" filename)
          bytes (fs/read-bytes host-fs local)]
      (fs/delete host-fs local)
      {:image-bytes bytes :seed (or seed 0) :node (:name node-info)})))
