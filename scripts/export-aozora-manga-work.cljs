;; ADR-2607141700 phase 3: translate this repo's own storyboard EDN
;; (260123-jump/resources/episodes/*/episode.edn, the live source of truth)
;; into the flat `work` EDN shape aozora.appview.manga/work->tx expects
;; (gftdcojp/app-aozora's aozora.appview.manga-export/-main), so
;; aozora.app/studio's /kotoba/ghosthacker-manga-tx.edn can be regenerated
;; from this repo instead of the orphaned app-aozora-svelte export it was
;; originally produced from (that repo no longer exists in this workspace).
;;
;; Run: npx nbb scripts/export-aozora-manga-work.cljs
;; Writes: resources/aozora-manga-work.edn (feed this into app-aozora's
;;   `clojure -M -e "(require '[aozora.appview.manga-export :as e]) (e/work-file->tx-file! \"<this file>\" tx-out)"`
;;   or `-main` with this file as the first arg, to produce the tx.edn.)
;;
;; Scope (ADR-2607141700 open questions, resolved pragmatically for this
;; first pass rather than left blocking): only :visual/:dialogue/:imageUrl
;; carry forward per panel (matches work->tx's panel-entity exactly -- no
;; slot exists yet for character-bible data, sdxl generation metadata, or
;; komawari panel geometry, so none of that is dropped from THIS repo, it's
;; simply not part of the aozora projection until those schemas grow a slot
;; for it). Episodes are ordered by :gh/episodeId string sort (deterministic
;; but not hand-curated narrative order) and pages are renumbered globally
;; 0-based across the whole work, since aozora's tx model has one flat page
;; list per work with no episode-grouping concept. Episode files with no
;; :gh/episodeId (e.g. episodes/ep1-komawari-redesign, a komawari-beat-format
;; design demo, not real page/panel content) and anything under
;; episodes/_archive are skipped.

(ns export-aozora-manga-work
  (:require ["fs" :as fs]
            ["path" :as path]
            [clojure.string :as str]
            [clojure.edn :as edn]))

(def resources-dir (path/join (path/dirname *file*) ".." "260123-jump" "resources"))
(def episodes-dir (path/join resources-dir "episodes"))
(def out-file (path/join (path/dirname *file*) ".." "resources" "aozora-manga-work.edn"))

(defn read-edn [p] (edn/read-string (fs/readFileSync p "utf8")))

(defn episode-dirs []
  (->> (fs/readdirSync episodes-dir)
       (remove #(str/starts-with? % "_"))
       (filter #(fs/existsSync (path/join episodes-dir % "episode.edn")))
       sort))

(defn load-episode [dir]
  (let [ep (first (read-edn (path/join episodes-dir dir "episode.edn")))]
    (when (:gh/episodeId ep)
      (assoc ep :gh/pages* (edn/read-string (:gh/pages ep))))))

(defn dialogue-line [{:keys [speaker text]}]
  (cond-> {:text (or text "")}
    speaker (assoc :speaker speaker)))

(defn ->panel [panel fallback-n]
  {:id (:id panel)
   :panelNumber (or (:panel panel) fallback-n)
   :visual (:visual panel)
   :imageUrl (:generatedImageUrl panel)
   :dialogue (mapv dialogue-line (:dialogue panel))})

(defn ->pages [episode-title gpage global-page-no]
  {:pageNumber global-page-no
   :title (str episode-title " — " (:gh/pageTitle gpage))
   :panels (vec (map-indexed (fn [i p] (->panel p (inc i))) (:gh/panels gpage)))})

(defn build-work []
  (let [episodes (keep load-episode (episode-dirs))
        _ (println "episodes:" (mapv :gh/episodeId episodes))
        all-pages
        (loop [eps episodes n 0 acc []]
          (if (empty? eps)
            acc
            (let [ep (first eps)
                  title (or (:dct/title ep) (:gh/episodeId ep))
                  pages (mapv (fn [gp i] (->pages title gp (+ n i)))
                              (:gh/pages* ep) (range (count (:gh/pages* ep))))]
              (recur (rest eps) (+ n (count (:gh/pages* ep))) (into acc pages)))))]
    {:id "ghosthacker"
     :title "Ghost Hacker"
     :subtitle "サイバー安全マンガ"
     :sourcePath "com-junkawasaki/ghosthacker/260123-jump/resources/episodes"
     :pages all-pages}))

(defn -main []
  (let [work (build-work)]
    (fs/mkdirSync (path/dirname out-file) #js {:recursive true})
    (fs/writeFileSync out-file (str (pr-str work) "\n"))
    (println "wrote" out-file
             "-" (count (:pages work)) "pages,"
             (reduce + (map #(count (:panels %)) (:pages work))) "panels")))

(-main)
