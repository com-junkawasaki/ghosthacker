#!/usr/bin/env nbb
;; GHOST HACKER producer — the command `loop-ka-production` invokes for this
;; channel. The loop owns cadence, admission and verdict; this owns producing
;; one episode and reporting honestly what its legs actually did.
;;
;;   nbb --classpath src bin/produce.cljs <plan-id>
;;
;; Prints one EDN map on stdout. Exit 0 produced (whatever the legs say),
;; 1 could not even plan. A missing image backend is NOT exit 1 — it is a run
;; whose video legs are :placeholder, which the loop grades and holds.
(ns produce
  (:require ["fs" :as fs]
            ["path" :as path]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [ghosthacker-produce.episode :as episode]
            [ghosthacker-produce.legs :as legs]))

(def ^:private catalog-dir "production-catalog")

(defn- die [msg data]
  (binding [*out* *err*]
    (println (str "produce: " msg))
    (when (seq data) (println (pr-str data))))
  (js/process.exit 1))

(defn- read-edn [file]
  (when-not (fs/existsSync file) (die "file not found" {:file file}))
  (try
    (edn/read-string (fs/readFileSync file "utf8"))
    (catch :default e
      (die "could not parse EDN" {:file file :error (ex-message e)}))))

(defn- backends
  "Env -> what we can reach. `(js->clj js/process.env)` yields a Function under
  nbb and every lookup comes back nil, which would report every leg degraded no
  matter how the node is configured. Read the property directly."
  []
  (let [got (fn [k] (not (str/blank? (str (aget js/process.env k)))))]
    {:image {:murakumo (got "MURAKUMO_BACKEND_URL") :comfy (got "COMFY_URL")}}))

(defn -main [& argv]
  ;; Take args from `*command-line-args*` (see the call at the bottom), not from
  ;; process.argv. Dropping a fixed prefix off process.argv leaves nbb's own
  ;; flags in the list — `--classpath src bin/produce.cljs <id>` makes "src" the
  ;; first non-flag token, so the producer looked for production-catalog/src.edn.
  (let [plan-id (first (remove #(str/starts-with? % "--") argv))]
    (when (str/blank? (str plan-id))
      (die "usage: produce.cljs <plan-id>" {}))
    (let [plan (read-edn (path/join catalog-dir (str plan-id ".edn")))
          src (:plan/source plan)
          e (episode/entity (read-edn src))
          pgs (episode/pages e)
          pnls (episode/panels pgs)]
      ;; A plan that counted panels and now finds none means the episode changed
      ;; under it. Say so rather than emitting a clean-looking empty run.
      (when (and (pos? (or (:plan/panels plan) 0)) (empty? pnls))
        (die "episode yielded zero panels" {:source src :expected (:plan/panels plan)}))
      (doseq [[label expected actual]
              [["pages" (:plan/pages plan) (count pgs)]
               ["panels" (:plan/panels plan) (count pnls)]]]
        (when (and expected (not= expected actual))
          (binding [*out* *err*]
            (println (str "produce: warning — plan/" label " says " expected
                          " but the episode has " actual " (" src ")")))))
      (println
       (pr-str {:plan/id plan-id
                :plan/episode-id (:plan/episode-id plan)
                :source src
                :pages (count pgs)
                :panels (count pnls)
                ;; Prior state, not a leg — see episode/already-generated?.
                :panels-already-generated (count (filter episode/already-generated? pnls))
                :legs (legs/report pnls (backends))})))))

(apply -main *command-line-args*)
