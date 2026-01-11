import { test as base, createBdd } from 'playwright-bdd';
import { spawn, ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import * as os from 'node:os';

// Tauri アプリケーションを起動するためのカスタムテスト
export const test = base.extend<{ tauriApp: ChildProcess }>({
  page: async ({ page }, use) => {
    // コンソールログの転送設定
    page.on('console', msg => console.log(`[Tauri Console] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Tauri Error] ${err.message}`));
    
    // Tauri アプリケーションの起動待ち
    // 通常、Tauri は 1420 ポートで Vite を待ち受けているため
    // ページが準備できるまで待機
    await page.goto('http://localhost:1420');
    
    await use(page);
  },

  tauriApp: async ({}, use) => {
    const platform = os.platform();
    let tauriBinary = '';

    if (platform === 'darwin') {
      tauriBinary = path.join(process.cwd(), 'src-tauri/target/debug/zen-editor');
    } else if (platform === 'win32') {
      tauriBinary = path.join(process.cwd(), 'src-tauri/target/debug/zen-editor.exe');
    } else {
      tauriBinary = path.join(process.cwd(), 'src-tauri/target/debug/zen-editor');
    }

    console.log(`[WebDriver] Launching Tauri binary: ${tauriBinary}`);

    // WebDriver モードでアプリを起動
    const child = spawn(tauriBinary, [], {
      env: {
        ...process.env,
        // Tauri 固有の環境変数があればここに追加
        TAURI_DEBUG: 'true'
      },
      stdio: 'inherit'
    });

    await use(child);

    // テスト終了時にアプリをクリーンアップ
    child.kill();
  }
});

export const { Given, When, Then } = createBdd(test);
