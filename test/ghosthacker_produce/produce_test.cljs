;; nbb --classpath src:test test/ghosthacker_produce/produce_test.cljs
;;
;; The cases pin the two things that are easy to get wrong here and that fail
;; silently rather than loudly: `:gh/pages` being a blob string rather than a
;; collection, and manga having no voice leg at all.
(ns ghosthacker-produce.produce-test
  (:require [clojure.test :refer [deftest is testing run-tests]]
            [ghosthacker-produce.episode :as episode]
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

(deftest already-generated-is-prior-state-not-a-leg
  (let [pnls (episode/panels (episode/pages (episode/entity tx)))]
    (is (true? (episode/already-generated? (nth pnls 0))))
    (is (false? (episode/already-generated? (nth pnls 1))))
    (testing "and it does not change the leg the run reports"
      (let [{:keys [video]} (legs/report pnls {:image {:murakumo true}})]
        (is (= :murakumo (nth video 0)) "already having an image is not a leg value")))))

(deftest legs-name-what-ran
  (let [pnls (episode/panels (episode/pages (episode/entity tx)))]
    (testing "no backend -> every panel degraded"
      (is (= [:placeholder :placeholder :placeholder]
             (:video (legs/report pnls {:image {}})))))
    (testing "murakumo -> served, except the panel with no prompt"
      (is (= [:murakumo :murakumo :placeholder]
             (:video (legs/report pnls {:image {:murakumo true}})))))
    (testing "comfy only"
      (is (= [:comfy :comfy :placeholder]
             (:video (legs/report pnls {:image {:comfy true}})))))))

(deftest manga-has-no-voice-leg
  ;; loop-ka.evaluate's silent-shots over [] is [], so an empty voice list is not
  ;; graded degraded. Emitting :silent per panel would mark every manga run
  ;; degraded for failing to do something it never had to do.
  (let [pnls (episode/panels (episode/pages (episode/entity tx)))
        {:keys [voice bed sfx overlays]} (legs/report pnls {:image {:murakumo true}})]
    (is (= [] voice))
    (is (false? bed))
    (is (= [] sfx))
    (is (zero? overlays))))

(defn -main [& _] (run-tests 'ghosthacker-produce.produce-test))
(-main)
