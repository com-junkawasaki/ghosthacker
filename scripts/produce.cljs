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
                           ;; **失敗の本文を捨てない。** comfyui.native-client は
                           ;; `{:ok? false :reason :error :error (ex-message e)}` を返す
                           ;; ので、reason だけ印字すると全部が `:error` に潰れる。
                           ;; 実測 2026-08-14: keiei の 38 コマが `FAILED panel N :error`
                           ;; とだけ記録され、原因（一過性のバックエンド断）を突き止めるのに
                           ;; 1 コマ分を手で叩き直す必要があった。原因は応答の中に在った。
                           (.then (fn [{:keys [ok? file reason error]}]
                                    (note (if ok? "rendered" "FAILED") "panel" idx
                                          (if ok? file (str reason
                                                            (when error (str " — " error)))))
                                    (assoc acc idx (if ok?
                                                     {:status :rendered :backend :comfy :file file}
                                                     {:status :failed :reason reason
                                                      :error error}))))))))
          (js/Promise.resolve {})
          indexed))

(defn- on-disk?
  "そのコマの PNG が既に out-dir に在るか。

  **`episode/already-generated?` では再開できない。** あれが見るのは episode.edn の
  `:gh/generatedImageUrl` で、それが書かれるのは取り込みの後なので、レンダ中に
  落ちた run の成果は 1 枚も『済み』にならない。実測 2026-08-14: keiei は
  17 枚描いた時点でバックエンドが一時的に落ち、38 枚が失敗した。再実行すると
  17 枚を描き直すところだった（1 枚 95 秒 = 27 分）。

  ComfyUI の SaveImage は `<key>_00001_.png` と連番を付けるので、名前は
  完全には予測できない。予測できるのは接頭辞だけなので、それで照合する。
  **URL やフィールドではなくバイトを見る**（gen-catalog で同じ誤りを直したのと同じ理由）。"
  [out-dir panel idx]
  (let [pre (str (or (:id panel) idx) "_")]
    (and (fs/existsSync out-dir)
         (boolean (some #(str/starts-with? % pre) (fs/readdirSync out-dir))))))

(defn -main [& argv]
  (let [{:keys [plan-id dry-run force] :as a} (parse-args argv)
        ;; A per-run cap the SCHEDULER can set without editing the channel
        ;; registry. One episode is up to 273 panels and the fleet has one
        ;; shared GPU, so a nightly tick renders a slice rather than the whole
        ;; thing — an episode lands over several nights.
        limit (or (:limit a)
                  (let [v (aget js/process.env "LOOP_KA_PANEL_LIMIT")]
                    (when-not (str/blank? (str v)) (js/parseInt v))))]
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
                   (let [disk? (fn [[i p]] (and (not force) (on-disk? out-dir p i)))
                         ;; ディスクに在るものは `:already` にする。legs の語彙どおり
                         ;; 「この run が描いたのではないが、フラットな代替でもない」。
                         ;; :placeholder のままにすると、実在する絵を持つコマが
                         ;; degraded として採点される。
                         base-outcomes (vec (map-indexed
                                             (fn [i o]
                                               (if (disk? [i (nth pnls i)])
                                                 {:status :already :backend :comfy}
                                                 o))
                                             (legs/dry-outcomes pnls)))
                         todo (cond->> (map-indexed vector pnls)
                                (not force) (remove (fn [[_ p]] (episode/already-generated? p)))
                                ;; 途中で落ちた run の続きから。--force で無視できる。
                                (not force) (remove disk?)
                                true (filter (fn [[_ p]] (episode/renderable? p)))
                                limit (take limit))
                         resumed (count (filter disk? (map-indexed vector pnls)))]
                     ;; 「飛ばした」と「描いた」を出力で区別する。
                     (when (pos? resumed)
                       (note "resuming —" resumed "panel(s) already on disk in" out-dir))
                     (note "rendering" (count todo) "of" (count pnls) "panels")
                     (-> (render-sequentially base out-dir checkpoint-config todo)
                         (.then (fn [rendered]
                                  (emit (vec (map-indexed (fn [i o] (get rendered i o))
                                                          base-outcomes))))))))))))))))

(apply -main *command-line-args*)
