;; validate-storyboard — EDN-spec replacement for internal/schema/storyboard.cue.go
;; + internal/service/storyboard.go's CUE-based validateAndLoad. Ported field-
;; for-field from the CUE schema (see git history of storyboard.cue.go for the
;; original) onto kotoba-lang/spec (EDN data + pure functions, no clojure.spec/
;; malli dep — the same contract kotoba-WASM cells use).
;;
;; Usage: nbb -cp <kotoba-lang/spec src> validate_storyboard.cljs <path-to-json>
;; Exit 0 + "OK" on stdout when valid. Exit 1 + a JSON array of problem maps on
;; stdout when invalid (storyboard.go parses this to build its error message).
;;
;; Known simplifications vs the original CUE schema (documented, not silent):
;; - #Context's field VALUES were pinned CUE string literals (e.g.
;;   `character?: "gh:character/"`) — exact-literal-value constants documenting
;;   JSON-LD namespace URIs, not data integrity checks. Validated here as plain
;;   :string (structural), not pinned to the exact literal — see context-spec.
;; - CUE 2-tuples like `[int, int]` (:gh:pageRange, :gh:pages ranges) validate
;;   each element's TYPE (:int) via :vector/:of, but not the fixed arity of 2 —
;;   kotoba-lang/spec's :vector has no fixed-length primitive. A real arity
;;   violation would still be a schema-shape bug worth catching in review, just
;;   not by this validator.
(require '["fs" :as fs])
(require '[kotoba.lang.spec :as spec])

(defn- k [type] {:type type})
(defn- opt [s] (assoc s :optional? true))
(defn- vec-of [item-spec] {:type :vector :of item-spec})
(defn- any-of [& specs] {:type :fn :pred (fn [x] (boolean (some #(spec/valid? % x) specs)))})

(def any-spec (k :any))
(def string-spec (k :string))
(def int-spec (k :int))
(def double-spec (k :double))

;; #Context — JSON-LD namespace prefix map. Open (CUE `...`); required gh/
;; schema/dct/prov, everything else optional strings (see file header re the
;; literal-value simplification). "marginalia?: string" also lives here per
;; the original schema (an odd but faithfully-ported placement).
(def context-spec
  {:type :map
   :keys {"gh" string-spec
          "schema" string-spec
          "dct" string-spec
          "prov" string-spec
          "character" (opt string-spec)
          "arc" (opt string-spec)
          "panel" (opt string-spec)
          "purpose" (opt string-spec)
          "shot" (opt string-spec)
          "prompt" (opt string-spec)
          "properties" (opt string-spec)
          "episodeId" (opt string-spec)
          "episodeIndex" (opt string-spec)
          "characters" (opt string-spec)
          "dialogue" (opt string-spec)
          "speaker" (opt string-spec)
          "text" (opt string-spec)
          "visual" (opt string-spec)
          "env" (opt string-spec)
          "environment" (opt string-spec)
          "environments" (opt string-spec)
          "marginalia" (opt string-spec)}})

;; #BilingualText: string | {en, ja?} | {en?, ja}
(def bilingual-text-spec
  (any-of string-spec
          {:type :map :keys {"en" string-spec "ja" (opt string-spec)}}
          {:type :map :keys {"en" (opt string-spec) "ja" string-spec}}))

;; #Dialogue — old-format dialogue entry, open map, everything optional
;; (CUE has no required keys here).
(def dialogue-spec
  {:type :map
   :keys {"speaker" (opt string-spec)
          "gh:speaker" (opt string-spec)
          "text" (opt string-spec)
          "en" (opt string-spec)
          "ja" (opt string-spec)
          "gh:delivery" (opt string-spec)
          "gh:subtext" (opt string-spec)
          "gh:emotion" (opt string-spec)
          "gh:pauseBeforeMs" (opt int-spec)
          "gh:pauseAfterMs" (opt int-spec)}})

;; #Caption — graphic-novel-format caption, open map, everything optional.
(def caption-spec
  {:type :map
   :keys {"gh:type" (opt string-spec)
          "en" (opt string-spec)
          "ja" (opt string-spec)}})

(def shot-properties-spec
  {:type :map
   :keys {"gh:atmosphere" string-spec
          "gh:composition" string-spec
          "gh:lighting" string-spec
          "gh:distance" string-spec
          "gh:lens" string-spec
          "gh:aperture" string-spec
          "gh:focus" string-spec
          "gh:angle" string-spec
          "gh:eyeDetail" (opt string-spec)}})

(def generated-image-spec
  {:type :map
   :keys {"gh:imageUrl" string-spec
          "gh:imagePrompt" string-spec
          "gh:generatedAt" double-spec
          "gh:model" string-spec}})

;; #StoryboardPanel — old format, flat string fields + @context aliases.
(def storyboard-panel-spec
  {:type :map
   :keys {"panel" int-spec
          "shot" string-spec
          "gh:shotProperties" shot-properties-spec
          "gh:runwayPrompt" string-spec
          "visual" string-spec
          "environment" string-spec
          "characters" (vec-of string-spec)
          "dialogue" (vec-of dialogue-spec)
          "gh:durationSeconds" (opt double-spec)
          "gh:cutNumber" (opt string-spec)
          "gh:cameraDirection" (opt string-spec)
          "generatedImageUrl" (opt string-spec)
          "gh:generatedImageUrl" (opt string-spec)
          "gh:imagePrompt" (opt string-spec)
          "gh:generatedImages" (opt (vec-of generated-image-spec))
          "gh:currentImageIndex" (opt int-spec)}})

;; #GraphicNovelPanel — new format, gh:-prefixed keys + bilingual text.
(def graphic-novel-panel-spec
  {:type :map
   :keys {"gh:panelIndex" (opt int-spec)
          "gh:shot" (opt string-spec)
          "gh:visual" (opt bilingual-text-spec)
          "gh:dialogue" (opt (vec-of dialogue-spec))
          "gh:caption" (opt (vec-of caption-spec))
          "gh:neiCaption" (opt (vec-of caption-spec))
          "gh:systemCaption" (opt (vec-of caption-spec))
          "gh:characters" (opt (vec-of string-spec))
          "gh:imagePrompt" (opt string-spec)
          "gh:generatedImageUrl" (opt string-spec)
          "gh:generatedImages" (opt (vec-of generated-image-spec))
          "gh:currentImageIndex" (opt int-spec)}})

;; #Panel: #StoryboardPanel | #GraphicNovelPanel
(def panel-spec (any-of storyboard-panel-spec graphic-novel-panel-spec))

(def page-beat-spec
  {:type :map
   :keys {"gh:emotionalShift" (opt string-spec)
          "gh:hook" (opt string-spec)
          "gh:tempo" (opt string-spec)
          "gh:turn" (opt string-spec)}})

(def page-spec
  {:type :map
   :keys {"gh:pageNumber" int-spec
          "gh:label" (opt string-spec)
          "gh:layout" (opt string-spec)
          "gh:continues" (opt int-spec)
          "gh:act" (opt string-spec)
          "gh:pageBeat" (opt page-beat-spec)
          "gh:panels" (vec-of panel-spec)
          "marginalia" (opt (vec-of any-spec))}})

(def countermeasure-spec
  {:type :map
   :keys {"gh:step" int-spec
          "gh:title" string-spec
          "gh:titleEn" (opt string-spec)
          ;; CUE [int, int] — element type validated, fixed arity of 2 not
          ;; enforced (see file header).
          "gh:pages" (vec-of int-spec)}})

(def act-structure-spec
  {:type :map
   :keys {"@id" string-spec
          "gh:actNumber" int-spec
          "gh:actTitle" string-spec
          "gh:actTitleEn" (opt string-spec)
          "gh:pageRange" (vec-of int-spec)
          "gh:emotionalArc" (opt string-spec)
          "gh:narrativePurpose" (opt string-spec)
          "gh:keyBeat" (opt string-spec)
          "gh:sourceFile" (opt string-spec)
          "gh:countermeasures" (opt (vec-of countermeasure-spec))}})

(def act-spec
  {:type :map
   :keys {"@context" (opt any-spec)
          "@id" string-spec
          "@type" (opt (vec-of string-spec))
          "gh:actNumber" int-spec
          "gh:actTitle" string-spec
          "gh:actTitleEn" (opt string-spec)
          "gh:pageRange" (vec-of int-spec)
          "gh:emotionalArc" (opt string-spec)
          "gh:narrativePurpose" (opt string-spec)
          "gh:keyBeat" (opt string-spec)
          "gh:countermeasures" (opt (vec-of countermeasure-spec))
          "gh:pages" (vec-of page-spec)}})

(def episode-spec
  {:type :map
   :keys {"gh:episode" (opt int-spec)
          "gh:episodeIndex" (opt int-spec)
          "gh:episodeId" string-spec
          "dct:title" bilingual-text-spec
          "dct:title_en" (opt string-spec)
          "dct:title_ja" (opt string-spec)
          "gh:presentationTagline" (opt string-spec)
          "gh:arc" string-spec
          "gh:format" (opt string-spec)
          "gh:sourceFile" (opt string-spec)
          "gh:industry" (opt string-spec)
          "gh:mainCharacter" (opt string-spec)
          "gh:supportingCharacters" (opt (vec-of string-spec))
          "gh:realCase" (opt string-spec)
          "gh:sinContrast" (opt string-spec)
          "gh:nistFocus" (opt (vec-of string-spec))
          "gh:incidentDescription" (opt string-spec)
          "gh:actStructure" (opt (vec-of act-structure-spec))
          "gh:pages" (opt (vec-of page-spec))
          "gh:marginalia" (opt (vec-of any-spec))
          "gh:artDirection" (opt any-spec)
          "gh:bookDesign" (opt any-spec)
          "gh:series" (opt any-spec)}})

(def storyboard-meta-spec
  {:type :map
   :keys {"gh:oneLiner" string-spec
          "gh:hook" string-spec
          "gh:audience" string-spec
          "gh:tags" (vec-of string-spec)}})

(def environment-ref-spec
  {:type :map
   :keys {"@id" string-spec "dct:title" string-spec "dct:description" string-spec}})

(def character-ref-spec
  {:type :map
   :keys {"@id" string-spec
          "schema:name" string-spec
          "dct:description" string-spec
          "gh:voice" (opt any-spec)}})

(def storyboard-spec
  {:type :map
   :keys {"@context" context-spec
          "@id" string-spec
          "@type" (vec-of string-spec)
          "dct:title" string-spec
          "dct:description" string-spec
          "gh:globalStyle" string-spec
          "gh:runwayConstraints" string-spec
          "prov:wasDerivedFrom" (vec-of {:type :map :keys {"@id" string-spec}})
          "gh:directingGuide" (opt any-spec)
          "gh:meta" storyboard-meta-spec
          "gh:environments" (vec-of environment-ref-spec)
          "gh:characters" (vec-of character-ref-spec)
          "gh:episodes" (vec-of episode-spec)}})

(defn- read-json [path]
  (js->clj (js/JSON.parse (fs/readFileSync path "utf8"))))

(defn -main [& [path]]
  (when-not path
    (js/console.error "usage: nbb validate_storyboard.cljs <path-to-json>")
    (js/process.exit 2))
  (let [data (try (read-json path)
                  (catch :default e
                    (js/console.error (str "invalid JSON: " (.-message e)))
                    (js/process.exit 1)))
        problems (spec/explain storyboard-spec data)]
    (if (empty? problems)
      (do (println "OK") (js/process.exit 0))
      (do (println (js/JSON.stringify (clj->js problems)))
          (js/process.exit 1)))))

(apply -main *command-line-args*)
