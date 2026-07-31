(ns ghosthacker-produce.comfy-graph
  "Pure ComfyUI node-graph construction. No HTTP, no env — a panel and a config
  in, a graph out, so the graph can be asserted in a test without a GPU.

  This talks ComfyUI's **native** protocol (a node graph POSTed to /prompt),
  not the OpenAI-images shape. `comfyui.gateway` in kotoba-lang/comfyui speaks
  the latter and needs `comfy-openai-bridge` in front of a real ComfyUI; that
  bridge was down when this was written while ComfyUI itself was up, which is
  the failure mode a translating middle layer adds. Going native removes it.

  Node input names and defaults below were read from the live server's
  /object_info (KSampler, EmptyLatentImage, SaveImage), not guessed."
  (:require [clojure.string :as str]))

(def default-config
  "Choices that are NOT derivable from the episode data and therefore have to be
  made here, explicitly.

  `:checkpoint` in particular: panels carry `:gh/sdxlModel \"gpt-4o-mini\"`, which
  is the LLM that WROTE the prompt, not an image model. Using it as a checkpoint
  name would fail at the server with a confusing enum error. The value here is
  one the server actually reports having."
  {:checkpoint "Illustrious-XL-v2.0.safetensors"
   :width 832
   :height 1216           ; manga panels are portrait more often than not
   :steps 28
   :cfg 5.0
   :sampler "euler_ancestral"
   :scheduler "karras"
   :denoise 1.0})

(defn prompt-text
  "Panel -> the positive prompt string.

  `:gh/sdxlTags` is the tag list the episode carries and is preferred; the flat
  `:gh/sdxlPrompt` is the same content already joined. Falling back rather than
  requiring both keeps panels written either way renderable. `:visual` is NOT a
  fallback — it is the human-facing description, and substituting it changes
  what gets drawn."
  [panel]
  (let [tags (:gh/sdxlTags panel)]
    (if (seq tags)
      (str/join ", " tags)
      (str (:gh/sdxlPrompt panel)))))

(defn negative-text
  [panel]
  (str/join ", " (or (seq (:gh/sdxlNegative panel))
                     ["low quality" "worst quality" "blurry"])))

(defn seed
  "A deterministic seed per panel so a re-run of the same panel reproduces the
  same image. Derived from the panel id / prompt rather than random, because
  `Math/random` would make every retry a different picture and make it
  impossible to tell a retry from a change."
  [panel]
  (let [s (str (or (:id panel) (:panel panel) (prompt-text panel)))]
    (Math/abs (reduce (fn [h c] (bit-or 0 (+ (* 31 h) (int c)))) 7 s))))

(defn graph
  "Panel + config -> the ComfyUI node graph, keyed by node id as ComfyUI expects.

  Node ids are strings because ComfyUI's /prompt takes an object keyed by id;
  a vector [id slot] is how one node references another's output."
  ([panel] (graph panel nil))
  ([panel cfg]
   ;; Read every value off the MERGED map. An earlier version destructured
   ;; `cfg-scale` with `:or {cfg-scale (:cfg cfg)}` — which reads the *argument*,
   ;; not the merge — so `(graph panel {})` produced `:cfg nil` and ComfyUI
   ;; rejected the prompt, while `(graph panel default-config)` worked. The
   ;; one-arity path hid it.
   (let [{:keys [checkpoint width height steps cfg sampler scheduler denoise]}
         (merge default-config cfg)]
     {"1" {:class_type "CheckpointLoaderSimple"
           :inputs {:ckpt_name checkpoint}}
      "2" {:class_type "CLIPTextEncode"
           :inputs {:clip ["1" 1] :text (prompt-text panel)}}
      "3" {:class_type "CLIPTextEncode"
           :inputs {:clip ["1" 1] :text (negative-text panel)}}
      "4" {:class_type "EmptyLatentImage"
           :inputs {:width width :height height :batch_size 1}}
      "5" {:class_type "KSampler"
           :inputs {:model ["1" 0]
                    :positive ["2" 0]
                    :negative ["3" 0]
                    :latent_image ["4" 0]
                    :seed (seed panel)
                    :steps steps
                    :cfg cfg
                    :sampler_name sampler
                    :scheduler scheduler
                    :denoise denoise}}
      "6" {:class_type "VAEDecode"
           :inputs {:samples ["5" 0] :vae ["1" 2]}}
      "7" {:class_type "SaveImage"
           :inputs {:images ["6" 0]
                    :filename_prefix (str "ghosthacker/" (or (:id panel) "panel"))}}})))
