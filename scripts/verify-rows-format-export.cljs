;; ADR-2607172250: regression check for the hand-authored :rows export path
;; (komawari-rows-export.cljs's rows-page-panels, also used by
;; export-aozora-manga-work.cljs). Runs the real path against episodes/
;; ep1-komawari-redesign/episode.edn -- the only :rows-format fixture in
;; this repo -- WITHOUT writing it into resources/aozora-manga-work.edn
;; (that file stays scoped to :gh/episodeId-bearing episodes only; ep1 is a
;; standalone Ren/Nei demo, not part of the arc0-* Yuto continuity, so it
;; does not ship in the real export -- see export-aozora-manga-work.cljs's
;; ns comment).
;;
;; Run: npx nbb --classpath "scripts:../../kotoba-lang/kami-mangaka-page/src" \
;;        scripts/verify-rows-format-export.cljs
;; Exits non-zero (throws) on any assertion failure.

(ns verify-rows-format-export
  (:require ["fs" :as fs]
            ["path" :as path]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [komawari-rows-export :as kre]))

(def ep1-file
  (path/join (path/dirname *file*) ".." "260123-jump" "resources" "episodes"
             "ep1-komawari-redesign" "episode.edn"))

(defn- ->page [episode-title gpage global-page-no]
  {:pageNumber global-page-no
   :title (str episode-title " — " (:page/title gpage))
   :panels (kre/rows-page-panels (:rows gpage))})

(defn- assert! [ok? msg]
  (when-not ok? (throw (ex-info (str "FAIL: " msg) {})))
  (println "ok -" msg))

(defn -main []
  (let [ep (first (edn/read-string (fs/readFileSync ep1-file "utf8")))
        pages (edn/read-string (:gh/pages ep))]
    (assert! (seq pages) "ep1 has pages")
    (assert! (every? :rows pages) "every ep1 page is :rows-format")
    (let [exported (mapv (fn [gp i] (->page (:gh/title ep) gp i)) pages (range (count pages)))
          all-panels (mapcat :panels exported)]
      (assert! (= (count pages) (count exported)) "one exported page per source page")
      (assert! (= (reduce + (map (fn [p] (reduce + (map count (:rows p)))) pages))
                  (count all-panels))
                "panel count matches the sum of authored beats across all rows (nothing dropped)")
      (assert! (every? #(seq (:visual %)) all-panels) "every panel kept its :visual text")
      (assert! (every? #(seq (:dialogue %)) (filter #(seq (:dialogue %)) all-panels))
                "dialogue lines that exist parsed non-empty")
      (let [with-geom (filter :rect all-panels)]
        (assert! (pos? (count with-geom)) "at least one page's hand-authored rows passed the governor and kept :rect")
        (assert! (every? #(= 4 (count (:rect %))) with-geom) "every :rect is [x y w h]")
        (assert! (every? #(not-any? js/isNaN (:rect %)) with-geom) "no NaN in any :rect"))
      (let [tilted (filter :tilt all-panels)]
        (assert! (pos? (count tilted)) "at least one panel used the page's :beat/intensity/:beat/vector to tilt (page:2's tension beats)"))
      (println "verify-rows-format-export: " (count exported) "pages /" (count all-panels)
               "panels /" (count (filter :rect all-panels)) "with :rect /"
               (count (filter :tilt all-panels)) "with :tilt — all checks passed"))))

(when (some #(str/ends-with? *file* %) (array-seq js/process.argv))
  (-main))
