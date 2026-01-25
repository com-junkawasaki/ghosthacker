# Ghost Hacker Game

2068年Tokyoを舞台とした対話アドベンチャー/因果推論パズルゲーム。

## 概要

プレイヤーは「自分の影であるゴースト」を生成し、その歪んだ因果関係と感情ラベルを観察・修正していく。ゴーストはLLMによって駆動され、嘘・矛盾・断片的記憶を含んだ語りを行う。プレイヤーはパズル操作＆簡単な対話によって、ゴーストの内部スキーマ（認知構造）を書き換え、最終的にゴーストを"成仏"させる。

## 技術スタック

- **Core**: Rust (game-core)
- **Engine**: Bevy (game-bevy)
- **Backend**: Rust async-graphql + Poem (game-graphql)
- **Database**: TerminusDB (RDF/OWL)
- **LLM**: Hume
- **Platforms**: iOS, Android, WASM

## プロジェクト構造

```
game/
├── game-core/          # コアゲームロジック（Rustライブラリ）
├── game-bevy/          # Bevyゲームエンジン層
├── game-graphql/       # ゲーム専用GraphQLサービス
├── game-ios/           # iOSバインディング
├── game-android/       # Androidバインディング
└── game-wasm/          # WASMバインディング
```

## セットアップ

```bash
# 依存関係のインストール
cargo build

# Docker ComposeでTerminusDBとGraphQLサービスを起動
make docker-up

# または個別に起動
cd game-graphql
cargo run

# ゲームの実行（Bevy）
cd game-bevy
cargo run
```

## 環境変数

`.env`ファイルを作成して以下を設定：

```bash
# TerminusDB
TERMINUSDB_URL=http://localhost:6363
TERMINUSDB_USER=admin
TERMINUSDB_SERVER_PASS=root
TERMINUSDB_DB=ghosthacker_game

# Hume LLM (オプション)
HUME_API_KEY=your_api_key_here
```

## ビルド

```bash
# 全クレートをビルド
make build

# GraphQLサービスのDockerビルド
make docker-build

# iOSビルド（Xcode必要）
make ios-build

# Androidビルド（Android NDK必要）
make android-build

# WASMビルド
make wasm-build
```

## テスト

```bash
# 全テストを実行
make test

# または個別に
cargo test --workspace
```

## GraphQL API

### Queries
- `ghost(id: Uuid!)`: ゴーストを取得
- `event_fragments(ghost_id: Uuid!)`: ゴーストに関連するイベント断片を取得
- `session(id: Uuid!)`: セッションを取得
- `player_profile(user_id: Uuid!)`: プレイヤープロフィールを取得

### Mutations
- `create_ghost(input: CreateGhostInput!)`: ゴーストを生成（ランダム初期状態）
- `update_ghost_state(ghost_id: Uuid!, state: GhostStateInput!)`: ゴースト状態を更新
- `create_event_fragment(ghost_id: Uuid!, fragment: EventFragmentInput!)`: イベント断片を生成
- `update_timeline(ghost_id: Uuid!, order: [Uuid!]!)`: 時系列パズルの順序を更新
- `update_causality(ghost_id: Uuid!, links: [CausalLinkInput!]!)`: 因果関係を更新
- `update_emotions(ghost_id: Uuid!, labels: [EmotionLabelInput!]!)`: 感情ラベルを更新
- `complete_session(session_id: Uuid!, reflection: ReflectionInput)`: セッションを完了（リフレクション追加）

### Subscriptions
- `ghost_state_changed(ghost_id: Uuid!)`: ゴースト状態変更をリアルタイム通知
- `new_event_fragment(ghost_id: Uuid!)`: 新規イベント断片をリアルタイム通知

## ゲームフロー

1. **ゴースト生成**: 性格診断・価値観・感情反応スタイルからゴーストを生成（ランダム初期状態）
2. **問題提示**: ゴーストの断片的なモノローグとイベント断片を確認
3. **因果パズル**: 時系列・因果関係・感情ラベルを修正（イベント断片の存在検証付き）
4. **再推論**: 3D因果グラフが再構成され、ゴーストが気づきを語る
5. **リフレクション**: プレイヤーが簡易な問いに回答（Reflectionドキュメントとして保存）

## 実装状況

### 完了した機能
- ✅ ゴースト生成時のランダム初期状態計算
- ✅ イベント断片取得（WOQLクエリ）
- ✅ 因果リンク・感情ラベルの検証ロジック（プレイヤー操作を正しいとみなす）
- ✅ セッションへのリフレクション追加（Reflectionドキュメント作成・リンク）
- ✅ リアルタイムサブスクリプション（tokio::sync::broadcastチャンネル）
- ✅ TerminusDB統合（OWLスキーマ、ドキュメントCRUD）
- ✅ Hume LLM統合（モノローグ生成、イベント断片生成、気づき生成）

## ライセンス

MIT

