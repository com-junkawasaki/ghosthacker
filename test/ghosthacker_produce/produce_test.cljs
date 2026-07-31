;; nbb --classpath src:test test/ghosthacker_produce/produce_test.cljs
;;
;; The cases pin the two things that are easy to get wrong here and that fail
;; silently rather than loudly: `:gh/pages` being a blob string rather than a
;; collection, and manga having no voice leg at all.
(ns ghosthacker-produce.produce-test
  (:require [clojure.test :refer [deftest is testing run-tests]]
            [ghosthacker-produce.episode :as episode]
            [ghosthacker-produce.comfy-graph :as graph]
            [ghosthacker-produce.legs :as legs]))

(def ^:private tx
  [{:gh/episodeId "episode:test"
    :gh/episodeIndex 1
    ;; A blob string, exactly as datomize writes it.
    :gh/pages (pr-str [{:gh/pageNumber 0
                        :gh/panels [{:gh/sdxlPrompt "1boy, dark room"
                                     :visual "暗い部屋"
                                     :gh/generatedImageUrl "https://x/1.png"}
                                    {:gh/sdxlPrompt "1girl, classroom"
                                     :visual "教室"}]}
                       {:gh/pageNumber 1
                        :gh/panels [{:gh/sdxlPrompt ""
                                     :visual "prompt がまだ無いコマ"}]}])}])

(deftest pages-is-a-blob-not-a-collection
  (let [e (episode/entity tx)]
    (is (string? (:gh/pages e)) "datomize stores it pr-str'd")
    (is (= 2 (count (episode/pages e))) "and decoding yields pages, not characters")))

(deftest episode-without-pages-is-empty-not-an-error
  ;; ep1-komawari-redesign is exactly this: a layout artifact with no episode id
  ;; and no panels. The reader must not throw; admission is the loop's call.
  (is (= [] (episode/pages {}))))

(deftest panels-flatten-in-order
  (let [pnls (episode/panels (episode/pages (episode/entity tx)))]
    (is (= 3 (count pnls)))
    (is (= ["1boy, dark room" "1girl, classroom" ""] (mapv episode/prompt pnls)))))

(deftest prompt-comes-from-sdxl-not-visual
  ;; :visual is the human-facing description. Substituting it would silently
  ;; change what the model draws.
  (let [p (first (episode/panels (episode/pages (episode/entity tx))))]
    (is (= "1boy, dark room" (episode/prompt p)))
    (is (not= (:visual p) (episode/prompt p)))))

(deftest legs-name-what-a-panel-ended-up-with
  (testing "a leg answers: does this panel have a real image, or a fallback"
    (is (= :comfy (legs/panel-leg {:status :rendered :backend :comfy})))
    (is (= :comfy (legs/panel-leg {:status :already}))
        "an image drawn by an earlier run is still not a flat card")
    (is (= :placeholder (legs/panel-leg {:status :failed})))
    (is (= :placeholder (legs/panel-leg {:status :skipped})))))

(deftest dry-outcomes-respect-prior-state
  (let [pnls (episode/panels (episode/pages (episode/entity tx)))
        out (legs/dry-outcomes pnls)]
    ;; panel 0 already has an image; 1 and 2 do not.
    (is (= [:already :skipped :skipped] (mapv :status out)))
    (is (= {:rendered 0 :already 1 :failed 0 :skipped 2} (legs/counts out)))
    (testing "and a run that drew nothing reports exactly that"
      (is (= [:comfy :placeholder :placeholder] (:video (legs/report out)))))))

(deftest manga-has-no-voice-leg
  ;; loop-ka.evaluate's silent-shots over [] is [], so an empty voice list is not
  ;; graded degraded. Emitting :silent per panel would mark every manga run
  ;; degraded for failing to do something it never had to do.
  (let [pnls (episode/panels (episode/pages (episode/entity tx)))
        {:keys [voice bed sfx overlays]} (legs/report (legs/dry-outcomes pnls))]
    (is (= [] voice))
    (is (false? bed))
    (is (= [] sfx))
    (is (zero? overlays))))

(deftest graph-reads-values-off-the-merged-config
  ;; `(graph panel {})` used to yield :cfg nil — the destructuring default read
  ;; the ARGUMENT rather than the merge — and ComfyUI rejected the prompt. The
  ;; one-arity path hid it, so both are asserted.
  (let [p (first (episode/panels (episode/pages (episode/entity tx))))]
    (doseq [[label g] [["1-arity" (graph/graph p)]
                       ["empty cfg" (graph/graph p {})]
                       ["partial cfg" (graph/graph p {:steps 12})]]]
      (is (number? (get-in g ["5" :inputs :cfg])) (str label ": cfg is a number"))
      (is (number? (get-in g ["5" :inputs :steps])) (str label ": steps is a number"))
      (is (string? (get-in g ["1" :inputs :ckpt_name])) (str label ": checkpoint is named")))
    (is (= 12 (get-in (graph/graph p {:steps 12}) ["5" :inputs :steps])) "overrides win")))

(deftest checkpoint-is-not-taken-from-sdxlModel
  ;; :gh/sdxlModel is "gpt-4o-mini" — the LLM that wrote the prompt, not an
  ;; image model. Using it as a checkpoint fails at the server with a confusing
  ;; enum error.
  (let [p (assoc (first (episode/panels (episode/pages (episode/entity tx))))
                 :gh/sdxlModel "gpt-4o-mini")]
    (is (not= "gpt-4o-mini" (get-in (graph/graph p) ["1" :inputs :ckpt_name])))))

(deftest prompt-prefers-tags-and-never-falls-back-to-visual
  (let [tagged {:gh/sdxlTags ["1boy" "dark room"] :visual "暗い部屋" :gh/sdxlPrompt "joined form"}
        flat {:gh/sdxlPrompt "joined form" :visual "暗い部屋"}]
    (is (= "1boy, dark room" (graph/prompt-text tagged)))
    (is (= "joined form" (graph/prompt-text flat)))
    (is (not= "暗い部屋" (graph/prompt-text flat)) ":visual is not a fallback")))

(deftest seed-is-deterministic
  (let [p (first (episode/panels (episode/pages (episode/entity tx))))]
    (is (= (graph/seed p) (graph/seed p)) "a re-run of the same panel reproduces it")))

(defn -main [& _] (run-tests 'ghosthacker-produce.produce-test))
(-main)
