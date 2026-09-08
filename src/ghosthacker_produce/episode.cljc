(ns ghosthacker-produce.episode
  "Pure episode reading. No filesystem, no env, so panel derivation is testable
  without an image backend.

  An episode.edn is datomize output: a one-entity vector whose `:gh/pages` is a
  **blob string** (`pr-str`'d), not a nested value. `schema.edn` says why —
  attributes whose data shape varies across files are stored as
  `:db.type/string` blobs. So reading pages is two decodes, and a reader that
  treats `:gh/pages` as a collection gets a string's seq of characters."
  (:require [clojure.edn :as edn]
            [kotoba.lang.text :as str]))

(defn entity
  "episode.edn tx-data -> the single episode entity."
  [tx-data]
  (first tx-data))

(defn pages
  "Episode entity -> its pages, decoding the blob.

  An episode with no `:gh/pages` yields [] rather than throwing: that is a real
  state in this repo (`ep1-komawari-redesign` is a layout artifact with no
  episode id and no panels), and the caller decides whether it is admissible."
  [e]
  (let [blob (:gh/pages e)]
    (if (str/blank? (str blob)) [] (edn/read-string blob))))

(defn panels
  "Pages -> the flat ordered panel list. A page's panels are the unit that gets
  an image, so this is the list the video legs index."
  [pages]
  (vec (mapcat :gh/panels pages)))

(defn prompt
  "The image prompt for a panel. `:gh/sdxlPrompt` is the generation prompt the
  repo actually carries; `:visual` is the human-facing description and is NOT a
  substitute — feeding it to a model would silently change what gets drawn."
  [panel]
  (:gh/sdxlPrompt panel))

(defn renderable?
  [panel]
  (not (str/blank? (str (prompt panel)))))

(defn already-generated?
  "Whether this panel already carries an image from a previous run.

  Both spellings appear in the data (`:gh/generatedImageUrl` namespaced by the
  datomize pass, `:generatedImageUrl` bare), so both are checked. This is prior
  state, not a leg: it says nothing about what THIS run did, which is why it is
  reported as a count beside the legs rather than as a leg value."
  [panel]
  (boolean (some #(seq (str %))
                 [(:gh/generatedImageUrl panel) (:generatedImageUrl panel)])))
