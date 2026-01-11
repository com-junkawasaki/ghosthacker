import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import * as path from 'node:path';
import * as os from 'node:os';

const testDir = defineBddConfig({
  paths: ['tests/features/*.feature'],
  steps: ['tests/steps/*.ts'],
});

// Tauri 2.x のバイナリパスを特定
const platform = os.platform();
let tauriBinary = '';

if (platform === 'darwin') {
  tauriBinary = path.join(process.cwd(), 'src-tauri/target/debug/zen-editor');
} else if (platform === 'win32') {
  tauriBinary = path.join(process.cwd(), 'src-tauri/target/debug/zen-editor.exe');
} else {
  tauriBinary = path.join(process.cwd(), 'src-tauri/target/debug/zen-editor');
}

export default defineConfig({
  testDir,
  reporter: 'html',
  timeout: 60000, // Tauri ビルドや起動に時間がかかる場合があるため長めに設定
  use: {
    trace: 'on',
    video: 'on',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'tauri',
      use: {
        // Tauri ではブラウザではなく独自の実行ファイルを指定
        // 注意: 直接起動するのではなく、後述の fixtures で制御するのが一般的
      },
    },
  ],
  // デバッグ時は既存のサーバーを利用
  webServer: {
    command: 'deno task dev:vite',
    port: 1420,
    reuseExistingServer: !process.env.CI,
  },
});
