# Zen Editor 開発・運用規則 (Tauri 2.x + Svelte 5 + Deno)

## 1. 依存関係の整合性 (Core Dependencies)
- **@bufbuild/protobuf**: 必ず `^1.10.0` を維持すること。
  - `v2.x` への更新は生成コード (`proto3`) との互換性を破壊するため厳禁。
- **ConnectRPC**: 
  - フロントエンド: `@connectrpc/connect` v2.x (`createClient`) を使用。
  - バックエンド: `connectrpc.com/connect` v1.17+ を使用。
- **Svelte**: 5.x 構文 (`$state`, `$derived`, `$props`) を標準とする。

## 2. アーキテクチャ設計 (Sidecar & API)
- **Go Sidecar**:
  - 呼び出しは Tauri 2.x 標準の `ShellExt::sidecar("backend-server")` API を使用する。
  - バイナリ名は `src-tauri/binaries/backend-server-[target-triple]` の形式を遵守。
  - 権限は `capabilities/default.json` の `shell:allow-execute` で管理。
- **Frontend API**:
  - `src/lib/api.ts` の `getClient()` パターンによる遅延初期化を使用し、モジュールロード時のクラッシュを防止する。

## 3. ビルドパイプライン & 検証
- **ビルド順序**: `deno task build` は以下のステップをアトミックに実行する。
  1. `build:sidecar`: Go バックエンドのコンパイル。
  2. `check`: `svelte-check` による型検証（エラー時は即停止）。
  3. `vite build`: フロントエンドのバンドル。
- **エラー検知**:
  - `vite.config.ts` の `dependency-guard` プラグインにより、ビルド開始時に物理的なファイル整合性をチェックする。
  - `onwarn` 設定により、`MISSING_EXPORT` を Error に昇格させて停止させる。

## 4. 開発ワークフロー
環境不整合や 500 エラーが発生した場合は、個別の修正を試みる前に以下の「全同期」を実行して環境を浄化すること。
```bash
deno task sync:force
```
このタスクは、ロックファイルの再生成、キャッシュのリロード、`.svelte-kit` の同期を保証する。
