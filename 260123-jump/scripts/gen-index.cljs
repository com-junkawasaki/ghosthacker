#!/usr/bin/env nbb
;; 260123-jump/scripts/gen-index.cljs — resources/_index.edn を .edn ソースから生成する。
;;
;; **なぜ書き直したか（実測 2026-08-13）**
;;
;; 旧 index は apps/server/cmd/indexer/main.go が作っていた。それは今こう壊れている:
;;
;;   1. `filepath.Ext(path) != ".jsonld"` — .jsonld しか歩かない。ソースは全部 .edn に
;;      移行済みなので、走らせると **0 件を歩いて "0 documents indexed" と成功を報告する**。
;;      入力が無いときに pass する検査そのもの（CLAUDE.md「検査を書く前・緑を信じる前の 5 問」）。
;;   2. 出力先は `_index.jsonld` なのに、repo にあるのは `_index.edn`。
;;      出力だけ誰かが変換し、生成器は変換されなかった。
;;   3. その `_index.edn` は **EDN として読めない**。459 キー中 53 個が
;;      `:env/0KVhLEQygO_kN0RTS44sc` のような数字始まりで、不正なキーワードである。
;;      JSON-LD の nanoid を機械変換しただけで、一度も read されていない。
;;   4. 索引が持つ 113 の .jsonld 参照のうち、実在するものは **0 件**。
;;
;; したがって旧索引は「死んでいて、読めなくて、生成器も動かない」。移植ではなく置き換える。
;;
;; **設計判断**
;;
;; - キーは nanoid ではなく **パス由来の決定論的キーワード**（`:character/Ren`）。
;;   再生成しても ID が変わらず、grep でき、必ず正当な EDN になる。
;;   nanoid は JSON-LD の @id のためのものだった。.edn 前提なら要らない。
;; - **evidence floor を持つ。** 歩いたファイルが `--min-files`（既定 100）未満なら
;;   出力せず **exit 2**（0 でも 1 でもない = 「答えられなかった」）で終わる。
;;   旧生成器が 0 件で成功を報告した欠陥を、構造的に再発させないため。
;; - **全ソースを実際に read する。** 読めない .edn があれば報告し、
;;   `--strict` なら失敗する。「読めなかったものを 0 件として数えない」。
;;
;; usage:
;;   nbb scripts/gen-index.cljs                 # 生成して書く
;;   nbb scripts/gen-index.cljs --check         # 生成物が最新か検査（書かない）
;;   nbb scripts/gen-index.cljs --min-files 100 --strict

(ns gen-index
  (:require ["fs" :as fs]
            ["path" :as path]
            [clojure.edn :as edn]
            [cljs.pprint]
            [clojure.string :as str]))

(def ^:private resources-dir "260123-jump/resources")
(def ^:private out-name "_index.edn")

;; ディレクトリ名 → キーの namespace。ここに無いものは skip する（黙って通さない）。
(def ^:private dir->ns
  {"characters"    "character"
   "environments"  "environment"
   "episodes"      "episode"
   "chat_history"  "chat"
   "organizations" "organization"
   "props"         "prop"
   "settings"      "setting"
   "jobs"          "job"})

;; resources 直下に置かれた単体データセット
(def ^:private root-files
  {"incidents.edn"           :dataset/incidents
   "manga_script.edn"        :dataset/manga-script
   "storyboard.edn"          :dataset/storyboard
   "generation_prompts.edn"  :dataset/generation-prompts})

(def ^:private skip-dirs #{"_vectors" "images" "logo" "_archive"})

(defn- walk
  "dir 以下の .edn を再帰的に集める（resources からの相対パスで返す）。"
  [root rel]
  (let [full (path/join root rel)]
    (if (.isDirectory (fs/statSync full))
      (if (contains? skip-dirs (path/basename full))
        []
        (mapcat #(walk root (if (= rel "") % (str rel "/" %)))
                (fs/readdirSync full)))
      (if (str/ends-with? full ".edn") [rel] []))))

(defn- kw-name
  "パス断片 → EDN キーワード名。正当にできなければ nil。

  **数字始まりは `_` を付けて逃がす。** シンボルは数字で始められないので
  `:episode/260123-cschool-defamation` は不正な EDN であり、read できない。
  旧索引はこれを 53 箇所やって**ファイル全体が読めなくなっていた**。
  ここで弾いて直すか nil にするかの二択にし、黙って壊れた索引を書かない。"
  [s]
  (let [s (if (re-find #"^[0-9]" s) (str "_" s) s)]
    (when (and (seq s) (re-matches #"[A-Za-z0-9_.*+!?<>=-]+" s)) s)))

(defn- rel->key
  "resources 相対パス → 決定論的キーワード。対象外なら nil。

  規則は 2 つだけ:
    <dir>/<slug>/profile.edn      → :ns/slug          （character・environment・organization）
    <dir>/<slug>/<rest...>.edn    → :ns/slug.rest     （episode は 1 slug に複数ファイルを持つ）

  nanoid は使わない。パスから決まるので再生成しても ID が動かず、
  必ず正当な EDN キーワードになる（旧索引は 459 中 53 個が数字始まりで読めなかった）。"
  [rel]
  (let [segs (str/split rel #"/")]
    (cond
      (= 1 (count segs))
      (get root-files (first segs))

      ;; <dir>/<file>.edn — chat_history/session_*.edn, environments/*.edn, props/furniture.edn 等
      (and (= 2 (count segs)) (dir->ns (first segs)))
      (let [name- (str/replace (second segs) #"\\.edn$" "")]
        (when-let [n (kw-name name-)] (keyword (dir->ns (first segs)) n)))

      (and (>= (count segs) 3) (dir->ns (first segs)))
      (let [ns-  (dir->ns (first segs))
            slug (second segs)
            rest- (drop 2 segs)
            name- (if (and (= 1 (count rest-)) (= "profile.edn" (first rest-)))
                    slug
                    (str slug "." (str/replace (str/join "." rest-) #"\\.edn$" "")))]
        (when-let [n (kw-name name-)] (keyword ns- n)))

      :else nil)))

(defn -main [& args]
  (let [args (vec args)
        check? (some #{"--check"} args)
        strict? (some #{"--strict"} args)
        min-files (if-let [i (first (keep-indexed #(when (= "--min-files" %2) %1) args))]
                    (js/parseInt (get args (inc i)) 10)
                    100)
        root (path/resolve resources-dir)
        _ (when-not (fs/existsSync root)
            (println "gen-index: resources not found:" root
                     "\n  Refusing to report a result — run from the repo root.")
            (js/process.exit 2))
        rels (->> (walk root "") (remove #{out-name}) sort vec)
        _ (when (< (count rels) min-files)
            (println (str "gen-index: walked only " (count rels) " .edn file(s), below --min-files "
                          min-files ".\n  Refusing to write an index from a tree this small — "
                          "this is the exact failure the Go indexer had (it walked 0 and reported success)."))
            (js/process.exit 2))
        ;; 全ソースを実際に read する。読めなかったものを 0 件として数えない。
        reads (for [r rels]
                (let [f (path/join root r)]
                  (try {:rel r :ok true :n (count (edn/read-string (fs/readFileSync f "utf8")))}
                       (catch :default e {:rel r :ok false :err (str e)}))))
        unreadable (remove :ok reads)
        keyed (keep (fn [r] (when-let [k (rel->key r)] [k r])) rels)
        unindexed (remove #(rel->key %) rels)
        dupes (->> keyed (map first) frequencies (filter #(> (val %) 1)) (map key) sort)
        entries (into (sorted-map) keyed)
        index {:index/source-dir resources-dir
               :index/scanned (count rels)
               :index/indexed (count entries)
               :index/unreadable (count unreadable)
               :index/unindexed (count unindexed)
               :index/generator "scripts/gen-index.cljs"
               :index/note "Generated. Do not hand-edit. Keys are path-derived and stable across regeneration."
               :index/entries entries}
        text (str (with-out-str (cljs.pprint/pprint index)))
        out-path (path/join root out-name)]

    (doseq [{:keys [rel err]} unreadable]
      (println "  UNREADABLE" rel "—" err))
    (when (and strict? (seq unreadable))
      (println "gen-index: --strict and" (count unreadable) "unreadable source(s). Refusing to report a pass.")
      (js/process.exit 2))
    (when (seq dupes)
      (println "gen-index: duplicate keys:" (pr-str dupes))
      (js/process.exit 1))

    (println (str "gen-index: SCANNED\t" (count rels)))
    (println (str "gen-index: INDEXED\t" (count entries)))
    (println (str "gen-index: UNREADABLE\t" (count unreadable)))
    (println (str "gen-index: UNINDEXED\t" (count unindexed)))
    ;; 落ちたものは必ず名指しする。「絞り込んだ」と「全部入った」を出力で区別できるようにする。
    (doseq [r unindexed] (println "  UNINDEXED" r))

    (if check?
      (let [current (when (fs/existsSync out-path) (fs/readFileSync out-path "utf8"))]
        (if (= current text)
          (println "gen-index: FRESH")
          (do (println "gen-index: STALE — regenerate with `nbb scripts/gen-index.cljs`")
              (js/process.exit 1))))
      (do (fs/writeFileSync out-path text)
          (println "gen-index: wrote" (str resources-dir "/" out-name)
                   (str "(" (count text) " chars)"))))))

(apply -main *command-line-args*)
