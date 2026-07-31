#!/usr/bin/env nbb
;; GHOST HACKER producer — the command `loop-ka-production` invokes for this
;; channel. The loop owns cadence, admission and verdict; this owns producing
;; one episode and reporting honestly what its legs actually did.
;;
;;   nbb --classpath src:../../kotoba-lang/comfyui/src scripts/produce.cljs \
;;       <plan-id> [--dry-run] [--limit N] [--force]
;;
;; Talks ComfyUI's NATIVE protocol (see comfy-client). No OpenAI-images bridge
;; in the middle — that bridge was down while ComfyUI itself was up, which is
;; exactly the silent middle-layer failure this loop exists to catch.
;;
;; Exit 0 produced (whatever the legs say), 1 could not even plan. An
;; unreachable backend is NOT exit 1 — it is a run whose legs are :placeholder,
;; which the loop grades and holds. Crashing would hide the degradation.
(ns produce
  (:require ["fs" :as fs]
            ["path" :as path]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [comfyui.native-client :as comfy]
            [ghosthacker-produce.episode :as episode]
            [ghosthacker-produce.legs :as legs]))

(def ^:private catalog-dir "production-catalog")

(def ^:private checkpoint-config
  "GHOST HACKER is a COLOUR manga (owner, 2026-07-31), so a colour anime SDXL
  checkpoint is the intended choice — not a compromise pending a monochrome or
  lineart model. Do not \"fix\" this later by swapping in a greyscale checkpoint
  or adding `monochrome` to the negative prompt.

  These live here rather than in `comfyui.native/default-config` because they
  are this series' craft decisions; the shared library's defaults are generic.

  Never pass `:gh/sdxlModel` as the checkpoint: it is \"gpt-4o-mini\" on every
  panel — the LLM that WROTE the prompt, not an image model."
  {:checkpoint "Illustrious-XL-v2.0.safetensors"
   :width 832 :height 1216 :steps 28 :cfg 5.0
   :sampler "euler_ancestral" :scheduler "karras"})

(defn- die [msg data]
  (binding [*out* *err*]
    (println (str "produce: " msg))
    (when (seq data) (println (pr-str data))))
  (js/process.exit 1))

(defn- note [& xs]
  (binding [*out* *err*] (println (str "produce: " (str/join " " xs)))))

(defn- read-edn [file]
  (when-not (fs/existsSync file) (die "file not found" {:file file}))
  (try (edn/read-string (fs/readFileSync file "utf8"))
       (catch :default e (die "could not parse EDN" {:file file :error (ex-message e)}))))

(defn- parse-args [argv]
  (loop [[a & more] argv acc {:limit nil}]
    (cond
      (nil? a) acc
      (= a "--limit") (recur (rest more) (assoc acc :limit (js/parseInt (first more))))
      (= a "--dry-run") (recur more (assoc acc :dry-run true))
      (= a "--force") (recur more (assoc acc :force true))
      (str/starts-with? a "--") (recur more acc)
      :else (recur more (assoc acc :plan-id a)))))

(defn- render-sequentially
  "Render `todo` panels one at a time, returning a promise of outcomes keyed by
  panel index.

  Sequential on purpose: the fleet head node runs ONE ComfyUI on one GPU, so
  firing 257 prompts concurrently would queue them all server-side and lose the
  ability to stop early. `--limit` is what bounds a run."
  [base out-dir config indexed]
  (reduce (fn [p [idx panel]]
            (.then p (fn [acc]
                       (-> (comfy/render!
                            {:base base :out-dir out-dir
                             :req {:prompt (or (seq (:gh/sdxlTags panel))
                                               (:gh/sdxlPrompt panel))
                                   :negative (:gh/sdxlNegative panel)
                                   :key (str "ghosthacker/" (or (:id panel) idx))}
                             :config config})
                           (.then (fn [{:keys [ok? file reason]}]
                                    (note (if ok? "rendered" "FAILED") "panel" idx
                                          (if ok? file (str reason)))
                                    (assoc acc idx (if ok?
                                                     {:status :rendered :backend :comfy :file file}
                                                     {:status :failed :reason reason}))))))))
          (js/Promise.resolve {})
          indexed))

(defn -main [& argv]
  (let [{:keys [plan-id dry-run limit force]} (parse-args argv)]
    (when (str/blank? (str plan-id)) (die "usage: produce.cljs <plan-id>" {}))
    (let [plan (read-edn (path/join catalog-dir (str plan-id ".edn")))
          src (:plan/source plan)
          e (episode/entity (read-edn src))
          pgs (episode/pages e)
          pnls (episode/panels pgs)
          out-dir (path/join "production-out" plan-id)]
      (when (and (pos? (or (:plan/panels plan) 0)) (empty? pnls))
        (die "episode yielded zero panels" {:source src :expected (:plan/panels plan)}))
      (doseq [[label expected actual] [["pages" (:plan/pages plan) (count pgs)]
                                       ["panels" (:plan/panels plan) (count pnls)]]]
        (when (and expected (not= expected actual))
          (note "warning —" (str "plan/" label) "says" expected "but the episode has" actual)))
      (let [base (comfy/base-url)
            emit (fn [outcomes]
                   (println (pr-str
                             (merge {:plan/id plan-id
                                     :plan/episode-id (:plan/episode-id plan)
                                     :source src
                                     :pages (count pgs)
                                     :panels (count pnls)
                                     :backend base
                                     :legs (legs/report outcomes)}
                                    (into {} (map (fn [[k v]] [(keyword (str "panels-" (name k))) v]))
                                          (legs/counts outcomes))))))]
        (if (or dry-run (str/blank? (str base)))
          (do (when-not base (note "no COMFY_URL / MURAKUMO_BACKEND_URL — nothing rendered"))
              (emit (legs/dry-outcomes pnls)))
          (-> (comfy/reachable? base)
              (.then
               (fn [up]
                 (if-not up
                   ;; Configured but not answering. The producer must not report a
                   ;; served leg for a URL nothing is listening on.
                   (do (note "backend configured but unreachable:" base)
                       (emit (legs/dry-outcomes pnls)))
                   (let [base-outcomes (legs/dry-outcomes pnls)
                         todo (cond->> (map-indexed vector pnls)
                                (not force) (remove (fn [[_ p]] (episode/already-generated? p)))
                                true (filter (fn [[_ p]] (episode/renderable? p)))
                                limit (take limit))]
                     (note "rendering" (count todo) "of" (count pnls) "panels")
                     (-> (render-sequentially base out-dir checkpoint-config todo)
                         (.then (fn [rendered]
                                  (emit (vec (map-indexed (fn [i o] (get rendered i o))
                                                          base-outcomes))))))))))))))))

(apply -main *command-line-args*)
