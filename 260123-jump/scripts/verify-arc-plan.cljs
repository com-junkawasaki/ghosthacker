#!/usr/bin/env nbb
;; 260123-jump/scripts/verify-arc-plan.cljs — 書いたエピソードを、計画に対して検査する。
;;
;; **なぜ必要か（2026-08-14）**
;;
;; resources/arc-order.edn には順序と主役と、久我の presence ladder（Arc 4/8/10/11/12 に
;; 姿を出す）が書いてある。**だが誰も守らせていない。**Arc 4 の episode.edn を書く人が
;; ladder を忘れても、何も起きない。計画だけが live に見えて、実体が付いてこない
;; ——CLAUDE.md が名指しする形である。
;;
;; ここで検査するのは 4 つ:
;;   1. arc-order の slug がディレクトリとして実在するか
;;   2. episode / story-outline の :gh/arc・:gh/episodeIndex・:gh/presentationTagline が
;;      arc-order と一致するか
;;
;;      ⚠ **:gh/episodeIndex は repo 内で二つの意味を持っている。**
;;      slug 登録された Arc 1-17 では **アーク番号**だが、Arc 0 の各話
;;      （arc0-1-origin / arc0-2-private-account / 260123-cschool-* 等）では
;;      **アーク内の話番号**である（1, 2, 3…）。これは既存の規約で、直していない。
;;      本検査は slug 登録アークだけを見るので、Arc 0 では発火しない
;;      ——**発火しないことを、ここに書いておく。**
;;   3. :gh/mainCharacter が arc-order の :lead と一致するか
;;   4. **presence ladder**: sighting に挙げたアークの episode.edn に久我が居るか
;;
;; **NOT-YET を pass にしない。**episode.edn がまだ無い sighting は「まだ書かれていない」
;; として**必ず名指しで報告する**。黙って通すと、書き忘れが永久に見えなくなる。
;;
;; 終了コード: 0 違反なし / 1 違反あり / 2 答えられなかった（入力が読めない・少なすぎる）

(ns verify-arc-plan
  (:require ["fs" :as fs] ["path" :as path] [clojure.edn :as edn] [clojure.string :as str]))

(def ^:private order-path "260123-jump/resources/arc-order.edn")
(def ^:private episodes-dir "260123-jump/resources/episodes")
(def ^:private min-episodes 3)

(defn- rd [f]
  (try (edn/read-string (fs/readFileSync f "utf8"))
       (catch :default e {::error (str e)})))

(defn- nested [v] (if (string? v) (edn/read-string v) v))

(defn -main [& _]
  (when-not (and (fs/existsSync order-path) (fs/existsSync episodes-dir))
    (println "verify-arc-plan: arc-order.edn または episodes/ が見つかりません。"
             "\n  Refusing to report a result — run from the repo root.")
    (js/process.exit 2))

  (let [order-raw (rd order-path)
        _ (when (::error order-raw)
            (println "verify-arc-plan: arc-order.edn が読めません —" (::error order-raw))
            (js/process.exit 2))
        order (first order-raw)
        arcs (nested (:order/arcs order))
        ladder (nested (:order/koga-presence order))
        sightings (:ladder/sightings ladder)
        by-slug (into {} (for [a arcs :when (:slug a)] [(:slug a) a]))

        dirs (->> (fs/readdirSync episodes-dir) (remove #{"_archive"}) sort vec)
        _ (when (< (count dirs) min-episodes)
            (println (str "verify-arc-plan: episodes/ に " (count dirs) " 件しかありません（最低 "
                          min-episodes "）。\n  Refusing to report a pass on a tree this small."))
            (js/process.exit 2))

        read-one (fn [slug f]
                   (let [p (path/join episodes-dir slug f)]
                     (when (fs/existsSync p)
                       (let [d (rd p)]
                         (if (::error d) {:err (::error d) :path p} {:m (first d) :path p})))))
        violations (atom [])
        notyet (atom [])
        checked (atom 0)
        v! (fn [& xs] (swap! violations conj (str/join " " xs)))]

    ;; 1) arc-order の slug が実在するか
    (doseq [[slug a] (sort-by key by-slug)]
      (if-not (fs/existsSync (path/join episodes-dir slug))
        (v! "MISSING-DIR" slug (str "— arc-order の Arc " (:arc a) "『" (:title a) "』が指すディレクトリが無い"))
        ;; 2-3) メタデータの一致
        (doseq [f ["story-outline.edn" "episode.edn"]]
          (when-let [r (read-one slug f)]
            (if (:err r)
              (v! "UNREADABLE" (str slug "/" f) "—" (:err r))
              (let [m (:m r)]
                (swap! checked inc)
                (let [want-arc (str "Part 1 / Arc " (:arc a))]
                  (when-not (= want-arc (:gh/arc m))
                    (v! "ARC-MISMATCH" (str slug "/" f)
                        (str "— arc-order は「" want-arc "」、実体は「" (:gh/arc m) "」"))))
                (when-not (= (:arc a) (:gh/episodeIndex m))
                  (v! "INDEX-MISMATCH" (str slug "/" f)
                      (str "— arc-order は " (:arc a) "、実体は " (:gh/episodeIndex m))))
                ;; **主役はアーク単位と話単位で別物である。**
                ;; arc-order の :lead はアークの主役（story-outline が持つ）。
                ;; 個々の episode.edn は別の主役を持ってよい——それが六人ローテの要点で、
                ;; 実例: Arc 17 のアーク主役は蓮（彼が「止める側だ」と名乗る回）だが、
                ;; 第 1 話『ほうきを折る』の主役は歩である。
                ;; したがって lead の一致を要求するのは story-outline.edn に対してだけ。
                (let [lead (:lead a)]
                  (when (and (= f "story-outline.edn")
                             (string? lead) (str/starts-with? lead "character:")
                             (not= lead (:gh/mainCharacter m)))
                    (v! "ARC-LEAD-MISMATCH" (str slug "/" f)
                        (str "— arc-order のアーク主役は " lead "、story-outline は " (:gh/mainCharacter m)))))
                ;; **tagline の Arc 番号も見る。**2026-08-14 の改番では :gh/arc と
                ;; :gh/episodeIndex を直して **:gh/presentationTagline を直し損ねた**
                ;; ——6 ファイルが古い番号のまま残り、この検査が無かったので誰も気づかなかった。
                ;; 表示に出る番号がずれるのは、内部値がずれるのと同じだけ悪い。
                (when-let [tl (:gh/presentationTagline m)]
                  (when-let [hit (re-find #"Arc (\d+)" tl)]
                    (let [n (js/parseInt (second hit) 10)]
                      (when-not (= n (:arc a))
                        (v! "TAGLINE-MISMATCH" (str slug "/" f)
                            (str "— arc-order は Arc " (:arc a) "、tagline は「" tl "」"))))))
                (when (= f "episode.edn")
                  (println (str "  ep-lead  " slug " → " (:gh/mainCharacter m))))))))))

    ;; 4) presence ladder
    (println "\n-- 久我 presence ladder --")
    (doseq [{:keys [arc title]} sightings]
      (let [a (first (filter #(= arc (:arc %)) arcs))
            slug (:slug a)
            ep (when slug (read-one slug "episode.edn"))]
        (cond
          (nil? slug)
          (do (swap! notyet conj (str "Arc " arc "『" title "』"))
              (println (str "  NOT-YET  Arc " arc " 『" title "』 — arc-order に slug が無い（既存アーク、episode.edn 未作成）")))

          (nil? ep)
          (do (swap! notyet conj (str "Arc " arc "『" title "』(" slug ")"))
              (println (str "  NOT-YET  Arc " arc " 『" title "』 (" slug ") — episode.edn がまだ無い")))

          (:err ep)
          (v! "UNREADABLE" (str slug "/episode.edn") "—" (:err ep))

          :else
          (let [m (:m ep)
                cast- (set (cons (:gh/mainCharacter m) (nested (:gh/supportingCharacters m))))]
            (if (contains? cast- "character:KogaMio")
              (println (str "  OK       Arc " arc " 『" title "』 (" slug ")"))
              (v! "LADDER-MISS" (str slug "/episode.edn")
                  (str "— Arc " arc " は久我の sighting だが、cast に character:KogaMio が居ない")))))))

    ;; 報告
    (println (str "\nverify-arc-plan: CHECKED\t" @checked " ファイル"))
    (println (str "verify-arc-plan: ARCS\t" (count arcs) " （うち slug 付き " (count by-slug) "）"))
    (println (str "verify-arc-plan: SIGHTINGS\t" (count sightings)
                  " （OK " (- (count sightings) (count @notyet)
                              (count (filter #(str/starts-with? % "LADDER-MISS") @violations)))
                  " / NOT-YET " (count @notyet) "）"))

    (when (seq @notyet)
      (println "\n**NOT-YET は pass ではない。**下記は episode.edn が書かれた時点で"
               "\n久我のコマを入れる必要がある——忘れると、この行が消えるだけで誰も気づかない:")
      (doseq [n @notyet] (println "  -" n)))

    (if (seq @violations)
      (do (println (str "\nverify-arc-plan: " (count @violations) " 件の違反"))
          (doseq [x @violations] (println "  " x))
          (js/process.exit 1))
      (println "\nverify-arc-plan: OK — 違反なし"))))

(apply -main *command-line-args*)
