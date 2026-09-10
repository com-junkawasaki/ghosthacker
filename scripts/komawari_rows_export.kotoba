;; ADR-2607172250: pure hand-authored :rows -> exported-panel conversion,
;; shared between export-aozora-manga-work.cljs (production, gated to
;; :gh/episodeId episodes only) and verify-rows-format-export.cljs
;; (regression check against episodes/ep1-komawari-redesign, which is not
;; :gh/episodeId-bearing and so never reaches production export).
;;
;; A separate underscore-named file (not export-aozora-manga-work.cljs's own
;; hyphenated name) because nbb's `:require` resolves namespaces to files by
;; the standard Clojure dash->underscore convention -- a hyphenated
;; `.cljs` filename loads fine when nbb runs it directly, but is NOT
;; `:require`-able from another nbb script (confirmed empirically: `nbb
;; entry.cljs` requiring a hyphen-named sibling throws "Could not find
;; namespace", the same require resolving fine once the file is
;; underscore-named). Keeping this shared piece in its own small module
;; sidesteps that pitfall instead of duplicating the logic or renaming the
;; already-documented entrypoint script.

(ns komawari-rows-export
  (:require [kami.mangaka.komawari :as k]))

(def komawari-style :toriyama)

(defn round4 [n] (/ (js/Math.round (* n 10000.0)) 10000.0))

(defn dialogue-line [{:keys [speaker text]}]
  (cond-> {:text (or text "")}
    speaker (assoc :speaker speaker)))

(defn- rows-panel->export
  "A komawari propose-page-layout output panel (:panel/id/:visual/:dialogue
  passed through untouched, plus :panel/rect/:panel/tilt when geometry is
  kept) -> the flat panel shape aozora.appview.manga/panel-entity expects.
  `strip-geom?` drops :rect/:tilt wholesale (the governor-failed fallback --
  visual/dialogue survive, half-broken geometry does not)."
  [p i strip-geom?]
  (cond-> {:id (str (:panel/id p))
           :panelNumber (inc i)
           :visual (:visual p)
           :dialogue (mapv dialogue-line (:dialogue p))}
    (and (not strip-geom?) (:panel/rect p)) (assoc :rect (mapv round4 (:panel/rect p)))
    (and (not strip-geom?) (:panel/tilt p)) (assoc :tilt (round4 (:panel/tilt p)))))

(defn rows-page-panels
  "A page's hand-authored :rows (already in propose-page-layout's native
  input shape: a vector of rows, each a vector of beat maps carrying
  :panel/id/:beat/weight/:visual/:dialogue/:beat/intensity/:beat/vector) ->
  exported panel maps, geometry included only if the resulting layout
  passes the komawari governor (same all-or-nothing fallback the heuristic
  :shot/:gh/pageLayout-derived export path uses)."
  [rows]
  (let [panels (k/propose-page-layout rows {:style komawari-style})
        strip? (not (:ok? (k/validate-layout panels {:style komawari-style})))]
    (vec (map-indexed #(rows-panel->export %2 %1 strip?) panels))))
