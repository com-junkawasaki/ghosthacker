// vite.config.ts
import { sveltekit } from "file:///Volumes/251214/jun784/ghosthacker/apps/zen-editor/node_modules/.deno/@sveltejs+kit@2.49.4_1/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///Volumes/251214/jun784/ghosthacker/apps/zen-editor/node_modules/.deno/vite@6.4.1_1/node_modules/vite/dist/node/index.js";
import * as fs from "node:fs";
import * as path from "node:path";
var dependencyGuard = () => ({
  name: "dependency-guard",
  buildStart() {
    const pbFile = path.resolve("src/lib/gen/editor_pb.ts");
    if (fs.existsSync(pbFile)) {
      const content = fs.readFileSync(pbFile, "utf-8");
      if (content.includes("codegenv2")) {
        console.log("\u2705 [Guard] Generated code uses codegenv2 (v2.x style)");
      }
    }
  }
});
var vite_config_default = defineConfig({
  plugins: [dependencyGuard(), sveltekit()],
  cacheDir: "node_modules/.vite",
  resolve: {
    conditions: ["browser", "development"]
  },
  // Tauri expects a fixed port when developing
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    allowedHosts: true
  },
  optimizeDeps: {
    exclude: ["svelte", "@sveltejs/kit", "@sveltejs/vite-plugin-svelte"]
  },
  ssr: {
    noExternal: [
      "@tauri-apps/api",
      "@tauri-apps/plugin-dialog",
      "@tauri-apps/plugin-fs",
      "@tauri-apps/plugin-shell",
      "@bufbuild/protobuf",
      "@connectrpc/connect",
      "@connectrpc/connect-web"
    ]
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.app/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri supports es2021
    target: "esnext",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MISSING_EXPORT") {
          throw new Error(warning.message);
        }
        warn(warning);
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlUm9vdCI6ICIvVm9sdW1lcy8yNTEyMTQvanVuNzg0L2dob3N0aGFja2VyL2FwcHMvemVuLWVkaXRvci8iLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Wb2x1bWVzLzI1MTIxNC9qdW43ODQvZ2hvc3RoYWNrZXIvYXBwcy96ZW4tZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVm9sdW1lcy8yNTEyMTQvanVuNzg0L2dob3N0aGFja2VyL2FwcHMvemVuLWVkaXRvci92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVm9sdW1lcy8yNTEyMTQvanVuNzg0L2dob3N0aGFja2VyL2FwcHMvemVuLWVkaXRvci92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IHN2ZWx0ZWtpdCB9IGZyb20gJ0BzdmVsdGVqcy9raXQvdml0ZSc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuXG4vLyBcdTcyNjlcdTc0MDZcdTc2ODRcdTMwNkFcdTRGOURcdTVCNThcdTk1QTJcdTRGQzJcdTMwQzFcdTMwQTdcdTMwQzNcdTMwQUZcdTMwRDdcdTMwRTlcdTMwQjBcdTMwQTRcdTMwRjNcbmNvbnN0IGRlcGVuZGVuY3lHdWFyZCA9ICgpID0+ICh7XG4gIG5hbWU6ICdkZXBlbmRlbmN5LWd1YXJkJyxcbiAgYnVpbGRTdGFydCgpIHtcbiAgICBjb25zdCBwYkZpbGUgPSBwYXRoLnJlc29sdmUoJ3NyYy9saWIvZ2VuL2VkaXRvcl9wYi50cycpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBiRmlsZSkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGJGaWxlLCAndXRmLTgnKTtcbiAgICAgIGlmIChjb250ZW50LmluY2x1ZGVzKCdjb2RlZ2VudjInKSkge1xuICAgICAgICBjb25zb2xlLmxvZygnXHUyNzA1IFtHdWFyZF0gR2VuZXJhdGVkIGNvZGUgdXNlcyBjb2RlZ2VudjIgKHYyLnggc3R5bGUpJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW2RlcGVuZGVuY3lHdWFyZCgpLCBzdmVsdGVraXQoKV0sXG4gIGNhY2hlRGlyOiAnbm9kZV9tb2R1bGVzLy52aXRlJyxcbiAgcmVzb2x2ZToge1xuICAgIGNvbmRpdGlvbnM6IFsnYnJvd3NlcicsICdkZXZlbG9wbWVudCddXG4gIH0sXG4gIC8vIFRhdXJpIGV4cGVjdHMgYSBmaXhlZCBwb3J0IHdoZW4gZGV2ZWxvcGluZ1xuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAxNDIwLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBhbGxvd2VkSG9zdHM6IHRydWVcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydzdmVsdGUnLCAnQHN2ZWx0ZWpzL2tpdCcsICdAc3ZlbHRlanMvdml0ZS1wbHVnaW4tc3ZlbHRlJ11cbiAgfSxcbiAgc3NyOiB7XG4gICAgbm9FeHRlcm5hbDogW1xuICAgICAgJ0B0YXVyaS1hcHBzL2FwaScsIFxuICAgICAgJ0B0YXVyaS1hcHBzL3BsdWdpbi1kaWFsb2cnLCBcbiAgICAgICdAdGF1cmktYXBwcy9wbHVnaW4tZnMnLCBcbiAgICAgICdAdGF1cmktYXBwcy9wbHVnaW4tc2hlbGwnLFxuICAgICAgJ0BidWZidWlsZC9wcm90b2J1ZicsXG4gICAgICAnQGNvbm5lY3RycGMvY29ubmVjdCcsXG4gICAgICAnQGNvbm5lY3RycGMvY29ubmVjdC13ZWInXG4gICAgXVxuICB9LFxuICAvLyB0byBtYWtlIHVzZSBvZiBgVEFVUklfREVCVUdgIGFuZCBvdGhlciBlbnYgdmFyaWFibGVzXG4gIC8vIGh0dHBzOi8vdGF1cmkuYXBwL3YxL2FwaS9jb25maWcjYnVpbGRjb25maWcuYmVmb3JlZGV2Y29tbWFuZFxuICBlbnZQcmVmaXg6IFsnVklURV8nLCAnVEFVUklfJ10sXG4gIGJ1aWxkOiB7XG4gICAgLy8gVGF1cmkgc3VwcG9ydHMgZXMyMDIxXG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICAvLyBkb24ndCBtaW5pZnkgZm9yIGRlYnVnIGJ1aWxkc1xuICAgIG1pbmlmeTogIXByb2Nlc3MuZW52LlRBVVJJX0RFQlVHID8gJ2VzYnVpbGQnIDogZmFsc2UsXG4gICAgLy8gcHJvZHVjZSBzb3VyY2VtYXBzIGZvciBkZWJ1ZyBidWlsZHNcbiAgICBzb3VyY2VtYXA6ICEhcHJvY2Vzcy5lbnYuVEFVUklfREVCVUcsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb253YXJuKHdhcm5pbmcsIHdhcm4pIHtcbiAgICAgICAgaWYgKHdhcm5pbmcuY29kZSA9PT0gJ01JU1NJTkdfRVhQT1JUJykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcih3YXJuaW5nLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHdhcm4od2FybmluZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1UsU0FBUyxpQkFBaUI7QUFDbFcsU0FBUyxvQkFBb0I7QUFDN0IsWUFBWSxRQUFRO0FBQ3BCLFlBQVksVUFBVTtBQUd0QixJQUFNLGtCQUFrQixPQUFPO0FBQUEsRUFDN0IsTUFBTTtBQUFBLEVBQ04sYUFBYTtBQUNYLFVBQU0sU0FBYyxhQUFRLDBCQUEwQjtBQUN0RCxRQUFPLGNBQVcsTUFBTSxHQUFHO0FBQ3pCLFlBQU0sVUFBYSxnQkFBYSxRQUFRLE9BQU87QUFDL0MsVUFBSSxRQUFRLFNBQVMsV0FBVyxHQUFHO0FBQ2pDLGdCQUFRLElBQUksMkRBQXNEO0FBQUEsTUFDcEU7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztBQUFBLEVBQ3hDLFVBQVU7QUFBQSxFQUNWLFNBQVM7QUFBQSxJQUNQLFlBQVksQ0FBQyxXQUFXLGFBQWE7QUFBQSxFQUN2QztBQUFBO0FBQUEsRUFFQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNO0FBQUEsSUFDTixjQUFjO0FBQUEsRUFDaEI7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxVQUFVLGlCQUFpQiw4QkFBOEI7QUFBQSxFQUNyRTtBQUFBLEVBQ0EsS0FBSztBQUFBLElBQ0gsWUFBWTtBQUFBLE1BQ1Y7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUE7QUFBQSxFQUdBLFdBQVcsQ0FBQyxTQUFTLFFBQVE7QUFBQSxFQUM3QixPQUFPO0FBQUE7QUFBQSxJQUVMLFFBQVE7QUFBQTtBQUFBLElBRVIsUUFBUSxDQUFDLFFBQVEsSUFBSSxjQUFjLFlBQVk7QUFBQTtBQUFBLElBRS9DLFdBQVcsQ0FBQyxDQUFDLFFBQVEsSUFBSTtBQUFBLElBQ3pCLGVBQWU7QUFBQSxNQUNiLE9BQU8sU0FBUyxNQUFNO0FBQ3BCLFlBQUksUUFBUSxTQUFTLGtCQUFrQjtBQUNyQyxnQkFBTSxJQUFJLE1BQU0sUUFBUSxPQUFPO0FBQUEsUUFDakM7QUFDQSxhQUFLLE9BQU87QUFBQSxNQUNkO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
