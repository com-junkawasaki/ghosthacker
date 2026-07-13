(ns ghosthacker.image-gen.server
  "Drop-in HTTP replacement for apps/image-gen (Python/FastAPI) on the same
  port/contract apps/server's Go client already calls (IMAGE_GEN_URL,
  default :8100) — see ADR-2607131400. Only /health and /generate-panel are
  implemented; /generate-cinematic(-fast) still needs the Python service
  (missing RealVisXL_V4.0[-Lightning] checkpoints on the fleet — see README)."
  (:require [reitit.ring :as ring]
            [org.httpkit.server :as hk]
            [jsonista.core :as j]
            [ghosthacker.image-gen.generator :as gen])
  (:gen-class))

(defonce ^:private server (atom nil))

(defn- json-response [status body]
  {:status status
   :headers {"content-type" "application/json"}
   :body (j/write-value-as-string body)})

(defn- read-json [{:keys [body]}]
  (when body (j/read-value (slurp body))))

(defn- health-handler [_]
  (json-response 200 {"status" "ok" "model" gen/model "device" "murakumo-fleet" "model_loaded" true}))

(defn- generate-panel-handler [req]
  (let [{:strs [prompt style aspect_ratio seed reference_image_paths]} (read-json req)]
    (when (seq reference_image_paths)
      (println "[image-gen-clj] warn: reference_image_paths given but IP-Adapter conditioning is not implemented (ADR-2607131400) — generating without it:" reference_image_paths))
    (try
      (let [t0 (System/currentTimeMillis)
            {:keys [image-bytes seed]} (gen/generate-panel
                                         {:prompt prompt
                                          :style (or style gen/default-style)
                                          :aspect-ratio (or aspect_ratio gen/default-aspect-ratio)
                                          :seed seed})
            b64 (.encodeToString (java.util.Base64/getEncoder) image-bytes)]
        (json-response 200 {"image_base64" (str "data:image/png;base64," b64)
                             "seed" seed
                             "generation_time_ms" (int (- (System/currentTimeMillis) t0))
                             "output_path" nil}))
      (catch Exception e
        (json-response 502 {"error" (str "image generation failed: " (.getMessage e))})))))

(def app
  (ring/ring-handler
   (ring/router
    [["/health" {:get health-handler}]
     ["/generate-panel" {:post generate-panel-handler}]])
   (ring/create-default-handler
    {:not-found (constantly (json-response 404 {"error" "not found"}))})))

(defn start!
  ([] (start! (Integer/parseInt (or (System/getenv "PORT") "8100"))))
  ([port]
   (reset! server (hk/run-server app {:port port :legacy-return-value? false}))
   (println (str "ghosthacker image-gen (clj, via cloud-murakumo) listening on :" port))
   @server))

(defn stop! []
  (when-let [s @server] (hk/server-stop! s) (reset! server nil)))

(defn -main [& _] (start!) @(promise))
