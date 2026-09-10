#!/usr/bin/env nbb
;; 260123-jump/scripts/verify-air.cljs — 空気感（日差し・光源・光質・湿度・粒子・体感温度）が
;; **実際にレンダラまで届いているか**を測る／検査する。
;;
;; **なぜ必要か（実測 2026-08-15）**
;;
;; コマは :gh/shotProperties に :gh/atmosphere を持っているが、新しい話ではそれが
;; **1 話につき 1 文字列で、全コマに同じものが複製されている**（fake-warning 1/47、
;; heiiki 1/48、monkeys-paw 1/49、nue 1/49）。朝の経理部と深夜の自室と午後の下町が
;; 同じ空気で描かれることになる。**古い arc0 系のほうが変えていた**（17/18、15/15）
;; ——つまり新しい、より設計された話のほうが**退行している**。
;;
;; さらに、実際に画像生成へ渡るのは :gh/sdxlPrompt / :gh/imagePrompt / :gh/sdxlTags
;; であって :gh/atmosphere ではない。**atmosphere をいくら書いてもレンダラは読まない。**
;; 実測: 全 1,359 コマのうち**光質 8 / 湿度 1 / 粒子 1**、空気感の語を 1 つも含まない
;; コマが **86%**。
;;
;; したがってこの script が見るのは「:gh/air が書いてあるか」ではなく
;; **「:gh/air の語が prompt に出現しているか」**である——届いていない注釈は無い注釈と同じ。
;;
;;   nbb 260123-jump/scripts/verify-air.cljs            # 検査（宣言済みの話だけ厳密に）
;;   nbb 260123-jump/scripts/verify-air.cljs --audit    # 全話の実測表
;;
;; **宣言していない話は fail させない**（恒久的に赤い gate を landing させない）。
;; 代わりに未達として**必ず名指しで報告**する——NOT-YET は pass ではない。
;; 話の側が :gh/airComplete true を宣言したら、その話は厳密検査の対象になる。
;;
;; 終了コード: 0 違反なし / 1 違反あり / 2 答えられなかった（入力が読めない・少なすぎる）

(ns verify-air
  (:require ["fs" :as fs] ["path" :as path]
            [clojure.edn :as edn] [clojure.string :as str]))

(def ^:private episodes-dir "260123-jump/resources/episodes")
(def ^:private min-episodes 3)

;; 空気感の 6 面。**この 6 つが「空気感」の定義であって、増やすなら理由を書く**
(def ^:private facets [:air/time :air/sun :air/source :air/quality
                       :air/humidity :air/particles :air/temp])

(def ^:private lexicon
  {:air/time      #"\b(morning|noon|midday|afternoon|evening|dusk|night|dawn|twilight|sunset|sunrise|late night)\b"
   :air/sun       #"\b(sun|sunlight|sunbeam|raking light|low sun|backlit|sunless|no direct sun|shaft of light)\b"
   :air/source    #"\b(fluorescent|monitor glow|monitor light|desk lamp|lamp ?light|streetlight|neon|window light|daylight|screen ?light)\b"
   :air/quality   #"\b(flat|diffused|soft light|harsh|hard light|overcast|dappled|golden|rim light|shadowless|even light|pooled light)\b"
   :air/humidity  #"\b(humid|damp|muggy|dry|air-conditioned|stale|still air|steam|misty|clammy)\b"
   :air/particles #"\b(dust|dusty|floating dust|smoke|haze|rain|pollen|airborne|no particles)\b"
   :air/temp      #"\b(cool|cold|chilly|warm|hot|stuffy|sweltering|neutral temperature|breeze)\b"})

(defn- rd [f] (try (edn/read-string (fs/readFileSync f "utf8"))
                   (catch :default e {::error (str e)})))
(defn- nested [v] (if (string? v) (edn/read-string v) v))
(defn- die! [code & msg] (println (str/join " " msg)) (js/process.exit code))

(defn- panel-text
  "**レンダラが実際に読む文字列だけ**を連結する。:gh/atmosphere は入れない
   ——入れると『書いたのに届いていない』が緑になる。"
  [p]
  (str/lower-case
   (str/join " " [(:gh/sdxlPrompt p) (:gh/imagePrompt p)
                  (str/join " " (:gh/sdxlTags p))])))

(defn- load-ep [slug]
  (let [f (path/join episodes-dir slug "episode.edn")]
    (when (fs/existsSync f)
      (let [d (rd f)]
        (if (::error d)
          {:slug slug :err (::error d)}
          (let [m (first d)
                pages (nested (:gh/pages m))
                ;; **:gh/panels が正**（repo 15 話中 14 話）。かつて nue だけ :panels を
                ;; 使っており、それを読んでいたこの検査は「コマ 0 枚」を静かに数えていた。
                panels (mapcat #(or (:gh/panels %) (:panels %)) pages)]
            {:slug slug :m m :pages pages :panels (vec panels)
             :declared? (true? (:gh/airComplete m))}))))))

(defn- measure [ep]
  (let [panels (:panels ep)
        ;; **:gh/air を持たない頁のコマは :bare から除く**——事案調書のような資料頁に
        ;; 日差しは無い。除かないと、正しく空気を持たない頁が永久に赤くなる。
        air-panels (vec (mapcat #(when (:gh/air %) (or (:gh/panels %) (:panels %))) (:pages ep)))
        texts (mapv panel-text panels)
        air-texts (mapv panel-text air-panels)
        atms (mapv #(get-in % [:gh/shotProperties :gh/atmosphere]) panels)
        hit (fn [f] (count (filter #(re-find (lexicon f) %) texts)))]
    {:panels (count panels)
     :atm-distinct (count (set (remove nil? atms)))
     :atm-total (count (remove nil? atms))
     :pages-with-air (count (filter :gh/air (:pages ep)))
     :pages (count (:pages ep))
     :facets (into {} (for [f facets] [f (hit f)]))
     :bare (count (remove (fn [t] (some #(re-find (lexicon %) t) facets)) air-texts))
     ;; **未宣言の話は air 頁がゼロなので :bare もゼロになる**——それを「空気ゼロ 0 枚」
     ;; と印字すると、債務が達成に見える。未宣言側の報告には全コマで数えた値を使う。
     :bare-all (count (remove (fn [t] (some #(re-find (lexicon %) t) facets)) texts))
     :missing (into {} (for [f facets]
                         [f (vec (keep (fn [pg]
                                         (when (and (:gh/air pg)
                                                    (not-any? #(re-find (lexicon f) (panel-text %))
                                                              (or (:gh/panels pg) (:panels pg))))
                                           (:gh/pageNumber pg)))
                                       (:pages ep)))]))}))

(defn- pad [s w] (let [s (str s)
                       wide (count (filter #(> (.charCodeAt % 0) 0x2000) s))]
                   (str s (apply str (repeat (max 0 (- w (+ (count s) wide))) " ")))))
(defn- padl [s w] (let [s (str s)] (str (apply str (repeat (max 0 (- w (count s))) " ")) s)))

(defn -main [& args]
  (when-not (fs/existsSync episodes-dir)
    (die! 2 "verify-air:" episodes-dir "が無い。repo root から実行する。"))
  (let [audit? (some #{"--audit"} args)
        slugs (->> (fs/readdirSync episodes-dir) (remove #{"_archive"}) sort vec)
        eps (->> slugs (map load-ep) (remove nil?) vec)
        readable (remove :err eps)
        with-panels (filter #(pos? (count (:panels %))) readable)]
    (when (< (count with-panels) min-episodes)
      (die! 2 (str "verify-air: episode.edn を持つ話が " (count with-panels)
                   " しかない（最低 " min-episodes "）。")
            "\n  Refusing to report a result on a tree this small."))
    (doseq [e eps :when (:err e)]
      (println "  UNREADABLE" (:slug e) "—" (:err e)))

    (println (str (pad "episode" 32) (padl "コマ" 5) (padl "atm異" 7) (padl "air頁" 7)
                  (str/join "" (map #(padl (name %) 11) facets)) (padl "空気ゼロ" 10)))
    (let [violations (atom []) notyet (atom [])]
      (doseq [e (sort-by :slug with-panels)]
        (let [r (measure e)
              mark (cond (:declared? e) "*" :else " ")]
          (println (str mark (pad (:slug e) 31) (padl (:panels r) 5)
                        (padl (str (:atm-distinct r) "/" (:atm-total r)) 7)
                        (padl (str (:pages-with-air r) "/" (:pages r)) 7)
                        (str/join "" (map #(padl (get-in r [:facets %]) 11) facets))
                        (padl (:bare r) 10)))
          (if (:declared? e)
            ;; --- 宣言済み: 厳密に検査する ---
            (let [need (dec (:pages r))]      ; 資料頁（事案調書）を 1 頁だけ免除
              (when (< (:pages-with-air r) need)
                (swap! violations conj
                       (str "AIR-MISSING " (:slug e) " — :gh/airComplete を宣言しているのに "
                            ":gh/air のある頁が " (:pages-with-air r) "/" need)))
              (when (< (:atm-distinct r) 3)
                (swap! violations conj
                       (str "AIR-CONSTANT " (:slug e) " — :gh/atmosphere の異なり "
                            (:atm-distinct r) " 種。**1 話 1 文字列を全コマに複製している**"
                            "（朝の office と深夜の自室が同じ空気になる）")))
              (doseq [f facets]
                (when (zero? (get-in r [:facets f]))
                  (swap! violations conj
                         (str "AIR-UNRENDERED " (:slug e) " " (name f)
                              " — 6 面のうちこの面が prompt に一度も出ていない。"
                              "**:gh/air に書いてもレンダラは :gh/atmosphere を読まない**")))
                (when-let [ps (seq (get-in r [:missing f]))]
                  (swap! violations conj
                         (str "AIR-FACET-GAP " (:slug e) " " (name f)
                              " — 語彙に載らない書き方をしている頁: p"
                              (str/join " p" ps)
                              "（lexicon の統制語を使う）"))))
              (when (pos? (:bare r))
                (swap! violations conj
                       (str "AIR-BARE " (:slug e) " — 空気感の語をひとつも含まないコマが "
                            (:bare r) " 枚"))))
            (swap! notyet conj (str (:slug e) "（" (:panels r) " コマ / 空気ゼロ " (:bare-all r) " 枚）")))))

      (println (str "\n* = :gh/airComplete true を宣言している話（厳密検査の対象）"))
      (when (seq @notyet)
        (println (str "\n**NOT-YET は pass ではない。**下記は :gh/air 未導入で、"
                      "\n描くときに空気感が決まっていない——忘れると、この行が消えるだけで誰も気づかない:"))
        (doseq [n @notyet] (println "  -" n)))

      (when (and (not audit?) (zero? (count (filter :declared? with-panels))))
        (die! 2 "\nverify-air: :gh/airComplete を宣言した話が 1 つも無い。"
              "\n  Refusing to report a pass — 検査対象がゼロで緑を出さない。"))

      (if (seq @violations)
        (do (println (str "\nverify-air: " (count @violations) " 件の違反"))
            (doseq [v @violations] (println "  " v))
            (js/process.exit 1))
        (println "\nverify-air: OK — 宣言済みの話に違反なし")))))

(apply -main *command-line-args*)
