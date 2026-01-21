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
  // Browser settings
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
      '@bufbuild/protobuf',
      '@connectrpc/connect',
      '@connectrpc/connect-web'
    ]
  },
  envPrefix: ['VITE_'],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
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
