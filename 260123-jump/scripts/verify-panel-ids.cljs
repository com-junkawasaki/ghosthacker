#!/usr/bin/env nbb
;; 260123-jump/scripts/verify-panel-ids.cljs — コマの :id が在り、エピソード内で一意か。
;;
;; **なぜ要るか（実測 2026-08-14）。** produce.cljs はレンダ結果のファイル名を
;;
;;     :key (str "ghosthacker/" (or (:id panel) idx))
;;
;; で決める。したがって :id が衝突すると、**2 枚目が 1 枚目を上書きする**。
;; そのとき produce.cljs は "rendered panel N" と報告し、legs は :comfy になり、
;; 終了コードは 0 になる —— つまり**成功と区別が付かない**。
;;
;; 実際に起きたこと: keiei を 55 コマ描かせたら、5 コマ描いた時点で出力は
;; `panel:keiei-ep5-1_00003_.png`（コマ 4 の絵が、コマ 1 の名前で）になっていた。
;; エピソード側の :id が**頁ごとに 1 から振り直されていた**ためで、55 コマに
;; 対して distinct な id は 4 つしか無かった。私が書いた 7 エピソード全部が
;; そうなっていた。
;;
;; :id が nil のときの `idx` fallback も同じ性質の穴で、**頁やコマを 1 つ挿入
;; すると以降の全ファイル名がずれる**。だから nil も違反として扱う。
;;
;; 慣習は `panel:[<prefix>-]p<pageNumber>n<panel>[-<slug>]`（既存エピソードの形）。
;; 形は強制しない —— 強制するのは「在ること」と「一意であること」だけ。
;;
;; usage:
;;   nbb 260123-jump/scripts/verify-panel-ids.cljs
;;
;; 終了コード: 0 適合 / 1 違反 / 2 答えられなかった（読めない・少なすぎる）

(ns verify-panel-ids
  (:require ["fs" :as fs]
            ["path" :as path]
            [clojure.edn :as edn]
            [clojure.string :as str]))

(def ^:private episodes-dir "260123-jump/resources/episodes")

;; 走査本数の床。0 件を「違反なし」として緑にしないためのもので、
;; 「読めなかった」と「読んで問題が無かった」を同じ値にしない。
(def ^:private min-episodes 3)

(defn- panels-of [ep]
  ;; :gh/pages は pr-str された string blob（90-docs の EDN 規約と同型）。
  ;; 既に構造として入っている場合もあるので両方受ける。
  (let [pages (let [p (:gh/pages ep)]
                (if (string? p) (edn/read-string p) p))]
    (mapcat :gh/panels pages)))

(defn -main [& _]
  (when-not (fs/existsSync episodes-dir)
    (println "verify-panel-ids: episodes dir not found. Run from the repo root.")
    (println "  Refusing to report a result.")
    (js/process.exit 2))
  (let [slugs (->> (fs/readdirSync episodes-dir)
                   (remove #{"_archive"})
                   (filter #(fs/existsSync (path/join episodes-dir % "episode.edn")))
                   sort vec)]
    (when (< (count slugs) min-episodes)
      (println (str "verify-panel-ids: found only " (count slugs) " episode.edn (min "
                    min-episodes ").\n  Refusing to report a pass."))
      (js/process.exit 2))
    (let [rows (for [s slugs]
                 (let [f (path/join episodes-dir s "episode.edn")]
                   (try
                     (let [ps   (panels-of (first (edn/read-string (fs/readFileSync f "utf8"))))
                           ids  (mapv :id ps)
                           blank (count (filter #(str/blank? (str %)) ids))
                           named (remove #(str/blank? (str %)) ids)
                           dups (->> named frequencies (filter #(> (val %) 1)) (sort-by key))]
                       {:slug s :panels (count ids) :blank blank :dups dups})
                     (catch :default e
                       {:slug s :error (ex-message e)}))))
          rows (vec rows)
          unreadable (filter :error rows)]
      (doseq [{:keys [slug error]} unreadable]
        (println "  UNREADABLE" slug "—" error))
      (when (seq unreadable)
        (println "verify-panel-ids:" (count unreadable)
                 "episode(s) could not be read. Refusing to report a pass.")
        (js/process.exit 2))

      (let [bad (remove #(and (zero? (:blank %)) (empty? (:dups %))) rows)]
        (doseq [{:keys [slug panels blank dups]} rows]
          (println (str (if (or (pos? blank) (seq dups)) "  VIOLATION" "  ok       ")
                        "\t" slug "\t" panels "コマ"
                        (when (pos? blank) (str "\t:id 無し " blank))
                        (when (seq dups)
                          (str "\t重複 " (count dups) " 種 / 述べ "
                               (reduce + (map val dups)) " コマ"
                               "\t例 " (pr-str (take 3 (map key dups))))))))
        ;; 走査した本数とコマ数を必ず出す。「飛ばした」と「合格した」を
        ;; 出力で区別できるようにするための evidence floor。
        (println (str "verify-panel-ids: EPISODES\t" (count rows)
                      "\tPANELS\t" (reduce + (map :panels rows))
                      "\tVIOLATIONS\t" (count bad)))
        (if (seq bad)
          (do (println "verify-panel-ids: コマ id が一意でない。"
                       "produce.cljs はこれを上書きとして静かに処理する。")
              (js/process.exit 1))
          (println "verify-panel-ids: OK"))))))

(apply -main *command-line-args*)
