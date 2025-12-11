# BDD E2E テスト

Playwrightを使用したブラウザベースのE2Eテストです。

## 実行方法

```bash
# すべてのE2Eテストを実行
pnpm test:bdd:e2e

# 特定のフィーチャーのみ実行
pnpm test:bdd:e2e tests/bdd/e2e/features/authentication.feature

# ヘッドレスモードで実行
HEADLESS=true pnpm test:bdd:e2e

# Playwrightネイティブテスト実行
pnpm test:e2e
```

## テスト構成

### フィーチャーファイル (`tests/bdd/e2e/features/`)

- `authentication.feature`: 認証フローのテスト
- `project-management-e2e.feature`: プロジェクト管理のE2Eテスト
- `sign-in-flow.feature`: サインインフローの詳細テスト
- `sign-in-visual.feature`: ビジュアル確認テスト（スクリーンショット）

### ステップ定義 (`tests/bdd/e2e/step_definitions/`)

- `browser-steps.ts`: Playwrightを使用したブラウザ操作のステップ定義

## テスト結果

現在のテスト結果:
- **6シナリオ、34ステップ全て成功**
- 実行時間: 約18秒

## スクリーンショット

テスト実行時のスクリーンショットは `tests/bdd/reports/` に保存されます:

- `sign-in-page.png`: サインインページのフルスクリーンショット
- `debug-panel.png`: デバッグパネルのスクリーンショット（該当する場合）

## 設定

### Cucumber設定 (`tests/bdd/e2e/cucumber.config.cjs`)

- TypeScript実行: `tsx/cjs`
- レポート形式: `progress`, `json`, `html`
- タイムアウト: 60秒

### Playwright設定 (`playwright.config.ts`)

- ブラウザ: Chromium
- ベースURL: `http://localhost:5173`
- 自動でdev serverを起動
- スクリーンショット: エラー時のみ
- トレース: リトライ時のみ

## カバレッジレポート

BDD E2Eテストのカバレッジレポートを生成するには:

```bash
pnpm test:bdd:coverage:report
```

このコマンドは、`capabilities.jsonld`に定義されているすべてのcapabilityに対してE2Eテストが存在するかを確認し、カバレッジレポートを生成します。

### カバレッジ目標

- **目標**: 100%のカバレッジ
- **現在のカバレッジ**: 100% ✅

### カバレッジ対象

以下のcapabilityがカバーされています:

1. ✅ **Project Management** - プロジェクト管理 (6 scenarios)
2. ✅ **Storyboard Editing** - ストーリーボード編集 (3 scenarios)
3. ✅ **Scene Management** - シーン管理 (5 scenarios)
4. ✅ **AI Video Generation** - AI動画生成 (3 scenarios)
5. ✅ **Video Composition** - 動画合成 (3 scenarios)
6. ✅ **Timeline Editing** - タイムライン編集 (3 scenarios)
7. ✅ **Video Preview** - ビデオプレビュー (3 scenarios)

**合計**: 14 feature files, 41 scenarios

## 認証テストについて

現在、実際のClerk認証フローのテストは制限されています:
- **未認証状態のテスト**: 正常動作
- **認証済み状態のテスト**: 一時的にコメントアウト（Clerkテストモードまたはモック認証が必要）

将来の改善点:
- Clerkのテストモードを使用した認証済み状態のテスト
- プロジェクト作成フローの完全なE2Eテスト
- 複数の組織間の切り替えテスト

