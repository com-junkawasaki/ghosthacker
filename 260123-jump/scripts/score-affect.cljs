#!/usr/bin/env nbb
;; 260123-jump/scripts/score-affect.cljs — シナリオ（episode.edn）を EDN のまま
;; OASIS XMILE 1.0 のストック＝フロー模型に落として、感情・情緒・成長を計算する。
;;
;; **これは読者の測定ではない。脚本が意図している感情の形の模型である。**
;; 係数は手で置いたダイヤルであって、観測値ではない（:params/provenance に明記）。
;; 出力を「読者はこう感じる」と読み替えない——読めるのは「この脚本は、こういう形を
;; したものを書こうとしている」だけである。
;;
;; engine: kotoba-lang/org-oasis-open-xmile（ADR-2607072350 で kotoba-lang の
;; system-dynamics 計算の正本）。**自前の積分器を書かない**（CLAUDE.md:
;; 「system dynamics の計算は既存を使う。ゼロから再発明しない」）。
;;
;;   nbb --classpath "<workspace>/orgs/kotoba-lang/org-oasis-open-xmile/src" \
;;     260123-jump/scripts/score-affect.cljs nue monkeys-paw [--write] [--no-hint]
;;
;; 引数: episode の slug を**アーク順に**並べる（複数渡すと 1 本の時間軸に連結される。
;; シショウが Arc 5 に置いたヒントが Arc 17 の失敗で回収される、という設計は
;; 連結しないと見えない）。
;;   --write    各 episode ディレクトリに affect.edn、resources/ に affect-timeline.edn
;;   --no-hint  反実仮想: シショウが居なかったことにして同じ模型を回す（比較用。書かない）
;;
;; 入力の分担（ここが要）:
;;   **手で書く**   各頁の :gh/affect {:pressure :validation :contact :failure :agency}
;;   **計算する**   :exposure（焦点人物のコマ数/総コマ数）:hint（同じ頁に反例が居るか）
;; **計算できるものを注釈で書かせない。**:gh/affect に :exposure / :hint が書かれて
;; いたら exit 2 で拒否する——書けてしまうなら、スコアは書いた人の希望を測る。
;;
;; 終了コード: 0 正常 / 1 入力の欠陥 / 2 答えられなかった（engine 不在・入力不足）

(ns score-affect
  (:require ["fs" :as fs] ["path" :as path]
            [clojure.string :as str] [clojure.edn :as edn]))

(def ^:private episodes-dir "260123-jump/resources/episodes")
(def ^:private counter-example "character:Shisho")
(def ^:private min-steps 6)

(defn- die! [code & msg] (println (str/join " " msg)) (js/process.exit code))

;; --- engine。**無ければ自前の積分器に落ちない。**preflight で場所を教えてから
;; require する（nbb は名前空間が見つからないと catch できずに落ちるので、
;; 助けになる文言は require の *前* に出す必要がある）。
(def ^:private engine-hint "../../kotoba-lang/org-oasis-open-xmile/src")
(when-not (fs/existsSync (path/join engine-hint "xmile" "model.cljc"))
  (println (str "score-affect: 注意 — " engine-hint " に engine が見当たりません。\n"
                "  --classpath に org-oasis-open-xmile/src を渡してください:\n"
                "  nbb --classpath \"<workspace>/orgs/kotoba-lang/org-oasis-open-xmile/src\" \\\n"
                "    260123-jump/scripts/score-affect.cljs nue monkeys-paw\n"
                "  **自前の積分器では代用しません**（ADR-2607072350）。")))
(require '[xmile.model :as xm] '[xmile.execute :as xe])

;; --- 係数。手で置いたダイヤルであって観測値ではない ---
(def params
  {:params/provenance "**hand-set dials, not measured.** 脚本の意図する形を書くための係数で、読者調査でも A/B でもない。値を引用するときは必ずこの行ごと引用する"
   :belief-init 0.6   ; 信念は強いが最大ではない（肯定される余地を残す）
   :belief-up 0.30 :belief-down-fail 0.45 :belief-down-neg 0.20
   :tension-decay 0.35 :tension-relief 0.25
   :wound-in 0.60 :wound-heal 0.30
   ;; **反例（シショウ）以外にも気づきの入口を置く。**ここを Latent だけにすると
   ;; 「唯一の入口を消したらゼロ」という同語反復になり、反実仮想が何も言わなくなる。
   ;; 失敗のときに誰かが隣に居ること（蓮の「その条件、誰が書いた」）は、独立した入口である。
   :learn 0.35
   :trust-in 0.50 :trust-decay 0.05
   :hint-mature 0.06  ; **置いたヒントが熟すのは遅い。**同じ episode 内では回収されない
   :recall 0.80       ; **失敗が起きたときにだけ Ripe → Insight が流れる**
   :insight-use 0.50})

;; --- 入力 ---
(defn- rd [f]
  (try (edn/read-string (fs/readFileSync f "utf8"))
       (catch :default e {::error (str e)})))

(defn- nested [v] (if (string? v) (edn/read-string v) v))

(defn- step-sum
  "piecewise-constant な系列を XMILE の式にする。sec 3.5.4 の STEP の差分和。
   gf（図形関数）は org-oasis-open-xmile では round-trip はするが**評価されない**
   （実測 2026-08-15）ので、系列の注入にはこちらを使う。"
  [vals]
  (->> (map-indexed (fn [i v]
                      (let [prev (if (zero? i) 0.0 (nth vals (dec i)))]
                        (str "(" (- v prev) ")*STEP(1," (inc i) ")")))
                    vals)
       (str/join " + ")))

(defn- load-episode [slug]
  (let [p (path/join episodes-dir slug "episode.edn")
        _ (when-not (fs/existsSync p) (die! 2 "score-affect:" p "が無い。"))
        d (rd p)
        _ (when (::error d) (die! 2 "score-affect:" p "が読めない —" (::error d)))
        m (first d)
        pages (nested (:gh/pages m))
        focal (:gh/mainCharacter m)]
    {:slug slug :focal focal :title (:dct/title m)
     :steps (vec (for [pg pages :when (:gh/affect pg)]
                   (let [a (:gh/affect pg)
                         ;; **:gh/panels が正**（repo 15 話中 14 話）。かつて nue だけ
                         ;; :panels を使っており、この script はそちらを読んでいたため
                         ;; monkeys-paw 側の :exposure / :hint が**全頁 0 として静かに
                         ;; 計算されていた**（実測 2026-08-15）。両方受けるが、空なら拒否する。
                         panels (or (:gh/panels pg) (:panels pg))
                         n (count panels)]
                     (when (zero? n)
                       (die! 2 "score-affect:" slug "p" (:gh/pageNumber pg)
                             "は :gh/affect を持つのにコマが 0 枚。"
                             "\n  Refusing to compute — コマが読めないと :exposure も :hint も"
                             "\n  0 になり、『反例が居なかった』と区別がつかない。"))
                     (when (or (contains? a :exposure) (contains? a :hint))
                       (die! 2 "score-affect:" slug "p" (:gh/pageNumber pg)
                             "の :gh/affect に :exposure / :hint が書かれている。"
                             "\n  Refusing to compute — これはコマと cast から計算する値で、"
                             "\n  手で書けると、スコアは書いた人の希望を測る。"))
                     {:slug slug :page (:gh/pageNumber pg) :title (:gh/pageTitle pg)
                      :pressure (:pressure a 0.0) :validation (:validation a 0.0)
                      :contact (:contact a 0.0) :failure (:failure a 0.0)
                      :agency (:agency a 0.0)
                      ;; --- 計算する側 ---
                      :exposure (if (zero? n) 0.0
                                    (/ (count (filter #(some #{focal} (:characters %)) panels)) n))
                      :hint (if (some (fn [p] (some #{counter-example} (:characters p))) panels)
                              1.0 0.0)})))}))

;; --- 模型 ---
(defn build-model [steps {:keys [no-hint?]}]
  (let [ser (fn [k] (step-sum (mapv #(double (get % k)) steps)))
        pos (fn [k] (step-sum (mapv #(max 0.0 (double (get % k))) steps)))
        neg (fn [k] (step-sum (mapv #(max 0.0 (- (double (get % k)))) steps)))
        n (count steps)
        {:keys [belief-init belief-up belief-down-fail belief-down-neg
                tension-decay tension-relief wound-in wound-heal
                trust-in trust-decay hint-mature recall insight-use learn]} params
        S (fn [nm eqn ins outs]
            (xm/stock nm eqn {:xmile/inflows (set ins) :xmile/outflows (set outs)
                             :xmile/non-negative? true}))]
    (-> (xm/model "affect")
        ;; 入力（頁ごとの系列）
        (xm/add-variable (xm/aux "press"  (ser :pressure)))
        (xm/add-variable (xm/aux "valpos" (pos :validation)))
        (xm/add-variable (xm/aux "valneg" (neg :validation)))
        (xm/add-variable (xm/aux "cont"   (ser :contact)))
        (xm/add-variable (xm/aux "fail"   (ser :failure)))
        (xm/add-variable (xm/aux "agen"   (ser :agency)))
        (xm/add-variable (xm/aux "expo"   (ser :exposure)))
        (xm/add-variable (xm/aux "hint"   (if no-hint?
                                 (step-sum (vec (repeat n 0.0)))
                                 (ser :hint))))
        ;; 緊張（情緒の起伏の担い手）
        (xm/add-variable (S "Tension" "0" ["t_in"] ["t_out"]))
        (xm/add-variable (xm/flow "t_in"  "press*(1-Tension)"))
        (xm/add-variable (xm/flow "t_out" (str tension-decay "*Tension*(1-press) + " tension-relief "*cont*Tension")))
        ;; 信念（その人が信じている一つの命題の強度）
        (xm/add-variable (S "Belief" (str belief-init) ["b_up"] ["b_dn"]))
        (xm/add-variable (xm/flow "b_up" (str belief-up "*valpos*expo*(1-Belief)")))
        (xm/add-variable (xm/flow "b_dn" (str belief-down-fail "*fail*Belief + " belief-down-neg "*valneg*expo*Belief")))
        ;; 傷と信頼
        (xm/add-variable (S "Wound" "0" ["w_in"] ["w_out"]))
        (xm/add-variable (xm/flow "w_in"  (str wound-in "*fail*(0.4+Tension)*(1-Wound)")))
        (xm/add-variable (xm/flow "w_out" (str wound-heal "*cont*Wound")))
        (xm/add-variable (S "Trust" "0" ["tr_in"] ["tr_out"]))
        (xm/add-variable (xm/flow "tr_in"  (str trust-in "*cont*(1-Trust)")))
        (xm/add-variable (xm/flow "tr_out" (str trust-decay "*Trust")))
        ;; **誤読 → 失敗 → 想起。**設計の主張を、そのまま連結で書く
        (xm/add-variable (S "Latent" "0" ["l_in"] ["mature"]))          ; 置かれたが、まだ誤読されている
        (xm/add-variable (xm/flow "l_in" "hint*expo"))
        (xm/add-variable (xm/flow "mature" (str hint-mature "*Latent"))) ; 熟すのは遅い＝同じ回では効かない
        (xm/add-variable (S "Ripe" "0" ["mature"] ["recall"]))
        (xm/add-variable (xm/flow "recall" (str recall "*fail*Ripe")))   ; **失敗のときにだけ流れる**
        (xm/add-variable (S "Insight" "0" ["recall" "learn"] ["use"]))
        (xm/add-variable (xm/flow "learn" (str learn "*cont*fail*(1-Insight)")))
        (xm/add-variable (xm/flow "use" (str insight-use "*agen*Insight")))
        (xm/add-variable (S "Growth" "0" ["use"] []))                   ; 気づきを自分の選択にしたぶんだけ
        (xm/set-sim-specs (xm/sim-specs 1 n {:xmile/dt 1.0 :xmile/method :euler
                             :xmile/time-units "page"})))))

(defn- r3 [x] (/ (js/Math.round (* 1000 (double x))) 1000))

(defn- padl [s w] (let [s (str s)] (str (apply str (repeat (max 0 (- w (count s))) " ")) s)))
(defn- padr [s w]
  ;; 日本語は半角 2 つ分の幅で数える（端末で列が崩れないため）
  (let [s (str s)
        wide (count (filter #(> (.charCodeAt % 0) 0x2000) s))
        vis (+ (count s) wide)]
    (str s (apply str (repeat (max 0 (- w vis)) " ")))))

(defn- format-row [i r]
  (str (padl i 3) "  " (padr (str "p" (:page r) " " (:title r)) 26)
       (padl (:affect/arousal r) 6) (padl (:affect/valence r) 6)
       (padl (:affect/belief r) 6) (padl (:affect/latent r) 8)
       (padl (:affect/insight r) 8) (padl (:affect/growth r) 7)))

(defn simulate [steps opts]
  (let [res (xe/run (build-model steps opts))
        s (:xmile/series res)
        at (fn [nm i] (double (nth (get s nm) i)))
        rows (vec (for [i (range (count steps))]
                    (let [st (nth steps i)]
                      (merge (select-keys st [:slug :page :title])
                             {:affect/arousal (r3 (at "Tension" i))
                              :affect/valence (r3 (- (at "Trust" i) (at "Wound" i)))
                              :affect/belief  (r3 (at "Belief" i))
                              :affect/wound   (r3 (at "Wound" i))
                              :affect/trust   (r3 (at "Trust" i))
                              :affect/latent  (r3 (+ (at "Latent" i) (at "Ripe" i)))
                              :affect/insight (r3 (at "Insight" i))
                              :affect/growth  (r3 (at "Growth" i))}))))
        aro (mapv :affect/arousal rows)
        deltas (mapv #(js/Math.abs (- %2 %1)) aro (rest aro))
        flat (reduce (fn [[best cur] d] (if (< d 0.02) [(max best (inc cur)) (inc cur)] [best 0]))
                     [0 0] deltas)]
    {:rows rows
     :summary {:affect/steps (count rows)
               :affect/swing (r3 (if (seq deltas) (/ (reduce + deltas) (count deltas)) 0))
               :affect/flat-run (first flat)
               :affect/peak-arousal (r3 (apply max aro))
               :affect/final-belief (:affect/belief (last rows))
               :affect/final-growth (:affect/growth (last rows))
               :affect/latent-unrecovered (:affect/latent (last rows))}}))

;; --- 実行 ---
(let [argv (vec *command-line-args*)
      flags (set (filter #(str/starts-with? % "--") argv))
      slugs (vec (remove #(str/starts-with? % "--") argv))]
  (when (empty? slugs)
    (die! 2 "usage: score-affect.cljs <slug> [<slug> ...] [--write] [--no-hint]"))
  (when-not (fs/existsSync episodes-dir)
    (die! 2 "score-affect:" episodes-dir "が無い。repo root から実行する。"))

  (let [eps (mapv load-episode slugs)
        ;; **焦点人物ごとに別の時間軸にする。**成長は人ごとに積む値で、
        ;; 複数人を 1 本に連結すると『誰の成長でもない合成』になる（旧版は警告して
        ;; そのまま連結していた——警告は、間違った数字を出すことの言い訳にならない）。
        groups (->> eps
                    (group-by :focal)
                    (sort-by (fn [[f _]] (.indexOf (mapv :focal eps) f)))
                    (mapv (fn [[f es]] {:focal f :eps (vec es)
                                        :steps (vec (mapcat :steps es))})))
        results
        (vec (for [{:keys [focal eps steps] :as g} groups]
               (do
                 (when (< (count steps) min-steps)
                   (die! 2 (str "score-affect: " focal " の :gh/affect のある頁が "
                                (count steps) " しかない（最低 " min-steps "）。")
                         "\n  Refusing to report a score on a timeline this short."))
                 (assoc g :base (simulate steps {}) :cf (simulate steps {:no-hint? true})))))]

    (doseq [{:keys [focal eps steps base cf]} results]
      (println (str "\n=== " (str/join " → " (map :title eps)) " ==="))
      (println (str "焦点人物: " focal " / " (count steps) " 頁 / 反例の出現 "
                    (count (filter #(pos? (:hint %)) steps)) " 頁"))
      (println "\n  #  頁                       緊張  情緒  信念  未回収  気づき  成長")
      (doseq [[i r] (map-indexed vector (:rows base))]
        (println (format-row (inc i) r)))
      ;; **反例 → 失敗の順序と距離。**Latent はゆっくり熟すので、反例が失敗より
      ;; *後* に置かれた回は、その回では一度も回収されない。模型が出した数字の
      ;; 理由がここにあるので、数字と一緒に必ず印字する。
      (let [hs (keep-indexed (fn [i x] (when (pos? (:hint x)) i)) steps)
            fs (keep-indexed (fn [i x] (when (>= (:failure x) 0.5) i)) steps)
            ripe-gap 6]
        (println (str "-- 反例と失敗の順序 --"))
        (println (str "  反例: " (if (seq hs) (str/join "," (map #(str "#" (inc %)) hs)) "なし")
                      " / 失敗(>=0.5): " (if (seq fs) (str/join "," (map #(str "#" (inc %)) fs)) "なし")))
        (doseq [h hs]
          (let [after (filter #(> % h) fs)]
            (if (empty? after)
              (println (str "  #" (inc h) " の反例 → **この後に失敗が来ない。**"
                            "この時間軸では一度も回収されない——回収は後のアークに委ねられている"))
              (println (str "  #" (inc h) " の反例 → "
                            (str/join "、"
                              (for [f after :let [d (- f h)]]
                                (str "#" (inc f) " まで " d " 頁"
                                     (if (< d ripe-gap) "（未熟）" "（**熟している**）"))))))))))
      (println "-- 総括 --")
      (doseq [[k v] (sort (:summary base))] (println (str "  " k "\t" v)))
      (println (str "  反実仮想（シショウ不在）: 成長 " (:affect/final-growth (:summary base))
                    " → " (:affect/final-growth (:summary cf))
                    " （差 " (r3 (- (:affect/final-growth (:summary base))
                                   (:affect/final-growth (:summary cf)))) "）")))

    ;; --- 人物どうしの比較 ---
    (when (> (count results) 1)
      (println "\n=== 焦点人物ごとの比較 ===")
      (println (str (padr "焦点人物" 26) (padl "頁" 4) (padl "反例" 5) (padl "起伏" 7)
                    (padl "最長平坦" 9) (padl "信念" 7) (padl "成長" 7)
                    (padl "未回収" 8) (padl "反例の寄与" 11)))
      (doseq [{:keys [focal steps base cf]} (sort-by #(- (:affect/final-growth (:summary (:base %)))) results)]
        (let [s (:summary base)]
          (println (str (padr (str/replace focal "character:" "") 26)
                        (padl (count steps) 4)
                        (padl (count (filter #(pos? (:hint %)) steps)) 5)
                        (padl (:affect/swing s) 7)
                        (padl (:affect/flat-run s) 9)
                        (padl (:affect/final-belief s) 7)
                        (padl (:affect/final-growth s) 7)
                        (padl (:affect/latent-unrecovered s) 8)
                        (padl (r3 (- (:affect/final-growth s)
                                     (:affect/final-growth (:summary cf)))) 11))))))

    (println (str "\n  ⚠ 反実仮想が測っているのは**大きさと時期**であって、主張の真偽ではない。"
                  "\n    『反例を置くと成長する』は模型の中に書き込まれている——検証していない。"
                  "\n    比較が意味を持つのは、気づきの入口が Latent 以外にもあるからで"
                  "\n    （:learn＝失敗のときに誰かが隣に居ること）、そこを消せばこの差も消える。"))
    (println (str "\n  " (:params/provenance params)))

    (when (contains? flags "--write")
      (doseq [{:keys [eps base cf]} results]
        (doseq [e eps]
          (let [rows (filterv #(= (:slug e) (:slug %)) (:rows base))
                out (path/join episodes-dir (:slug e) "affect.edn")]
            (fs/writeFileSync
             out (str (pr-str [{:db/id -1
                                :affect/episode (:slug e)
                                :affect/focal (:focal e)
                                :affect/generator "260123-jump/scripts/score-affect.cljs"
                                :affect/engine "kotoba-lang/org-oasis-open-xmile (OASIS XMILE 1.0)"
                                :affect/note "**生成物。手で編集しない。**読者の測定ではなく、脚本が意図している感情の形の模型"
                                :affect/params (pr-str params)
                                :affect/rows (pr-str rows)}]) "\n"))
            (println "  wrote" out))))
      (let [out "260123-jump/resources/affect-timeline.edn"]
        (fs/writeFileSync
         out (str (pr-str [{:db/id -1
                            :affect/timeline (vec slugs)
                            :affect/generator "260123-jump/scripts/score-affect.cljs"
                            :affect/engine "kotoba-lang/org-oasis-open-xmile (OASIS XMILE 1.0)"
                            :affect/note "**焦点人物ごとに別の時間軸で回している。**成長は人ごとに積む値で、複数人を 1 本に連結すると誰の成長でもない合成になる"
                            :affect/params (pr-str params)
                            :affect/per-focal
                            (pr-str (vec (for [{:keys [focal eps base cf]} results]
                                           {:focal focal
                                            :episodes (mapv :slug eps)
                                            :summary (:summary base)
                                            :counterfactual-no-hint (:summary cf)
                                            :rows (:rows base)})))}]) "\n"))
        (println "  wrote" out)))
    (println)))
