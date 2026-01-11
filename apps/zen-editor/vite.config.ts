import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';

// 物理的な依存関係チェックプラグイン
const dependencyGuard = () => ({
  name: 'dependency-guard',
  buildStart() {
    const pbFile = path.resolve('src/lib/gen/editor_pb.ts');
    if (fs.existsSync(pbFile)) {
      const content = fs.readFileSync(pbFile, 'utf-8');
      if (content.includes('codegenv2')) {
        console.log('✅ [Guard] Generated code uses codegenv2 (v2.x style)');
      }
    }
  }
});

export default defineConfig({
  plugins: [dependencyGuard(), sveltekit()],
  cacheDir: 'node_modules/.vite',
  resolve: {
    conditions: ['browser', 'development']
  },
  // Tauri expects a fixed port when developing
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    allowedHosts: true
  },
  optimizeDeps: {
    exclude: ['svelte', '@sveltejs/kit', '@sveltejs/vite-plugin-svelte']
  },
  ssr: {
    noExternal: [
      '@tauri-apps/api', 
      '@tauri-apps/plugin-dialog', 
      '@tauri-apps/plugin-fs', 
      '@tauri-apps/plugin-shell',
      '@bufbuild/protobuf',
      '@connectrpc/connect',
      '@connectrpc/connect-web'
    ]
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.app/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri supports es2021
    target: 'esnext',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MISSING_EXPORT') {
          throw new Error(warning.message);
        }
        warn(warning);
      }
    }
  }
});
